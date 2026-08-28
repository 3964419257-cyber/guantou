<template>
  <PageShell
    title="找回密码"
    :back-fallback="backFallback"
  >
    <view
      v-if="step === 0"
      class="forget-form"
    >
      <view class="hint">
        验证码会发到该账号已绑定的邮箱。没有邮箱时，需要先绑定。
      </view>
      <BaseForm
        ref="lookupForm"
        :data="lookupData"
        :rules="lookupRules"
      >
        <BaseField
          v-model="username"
          name="username"
          label="用户名"
          required
          placeholder="请输入乡声号"
          :error="usernameError"
          :disabled="looking"
        />
        <BaseButton
          block
          :disabled="looking"
          :loading="looking"
          @click="lookupAccount"
        >
          下一步
        </BaseButton>
      </BaseForm>
      <BaseButton
        v-if="needsEmailBind"
        class="bind-email"
        block
        variant="ghost"
        @click="goBindEmail"
      >
        去绑定邮箱
      </BaseButton>
    </view>

    <view
      v-else
      class="forget-form"
    >
      <view class="hint">
        验证码会发到 {{ emailMasked }}。
      </view>
      <BaseForm
        ref="resetForm"
        :data="resetData"
        :rules="resetRules"
      >
        <view class="password-row">
          <view class="password-field">
            <BaseField
              v-model="password"
              name="password"
              label="新密码"
              :type="passwordVisible ? 'text' : 'password'"
              required
              placeholder="请输入新密码"
              :maxlength="32"
              :error="passwordError"
              :disabled="saving"
            />
          </view>
          <BaseButton
            class="password-toggle"
            size="small"
            variant="ghost"
            :disabled="saving"
            @click="toggleVisible('password')"
          >
            {{ passwordVisible ? '隐藏' : '显示' }}
          </BaseButton>
        </view>
        <view class="password-row">
          <view class="password-field">
            <BaseField
              v-model="confirmPassword"
              name="confirm"
              label="确认密码"
              :type="confirmVisible ? 'text' : 'password'"
              required
              placeholder="请再次输入新密码"
              :maxlength="32"
              :error="confirmError"
              :disabled="saving"
            />
          </view>
          <BaseButton
            class="password-toggle"
            size="small"
            variant="ghost"
            :disabled="saving"
            @click="toggleVisible('confirm')"
          >
            {{ confirmVisible ? '隐藏' : '显示' }}
          </BaseButton>
        </view>
        <view class="code-row">
          <view class="code-field">
            <BaseField
              v-model="code"
              name="code"
              label="验证码"
              required
              placeholder="请输入验证码"
              :maxlength="6"
              :error="codeError"
              :disabled="saving"
            />
          </view>
          <BaseButton
            class="code-button"
            size="small"
            variant="ghost"
            :disabled="sending || saving || countdown > 0"
            :loading="sending"
            @click="sendCode"
          >
            {{ sendCodeLabel }}
          </BaseButton>
        </view>
        <view
          v-if="demoCode"
          class="demo-code"
        >
          Demo 验证码：<text>{{ demoCode }}</text>
        </view>
        <BaseButton
          block
          :disabled="saving || sending"
          :loading="saving"
          @click="submitReset"
        >
          重置密码
        </BaseButton>
      </BaseForm>
    </view>
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import BaseForm from '@/components/BaseForm.vue';
import PageShell from '@/components/PageShell.vue';
import { notify, notifySuccess } from '@/services/feedback';
import {
  goLogin,
  goUserEmail,
  ROUTES,
} from '@/services/navigation';
import { resolveSessionUserId } from '@/services/session';
import {
  clearUserInfo,
  getEmailByUsername,
  requestPasswordResetCode,
  resetPassword,
} from '@/services/user';

const CODE_THROTTLE_SECONDS = 60;

function fieldErrorMessage(error, field) {
  const item = error?.data?.[field];
  if (typeof item === 'string') return item;
  if (item?.message) return item.message;
  return '';
}

function isPasswordLengthValid(value) {
  const text = String(value || '').trim();
  return text.length >= 6 && text.length <= 32;
}

export default {
  name: 'ForgetPassword',
  components: {
    BaseButton, BaseField, BaseForm, PageShell,
  },
  data() {
    return {
      step: 0,
      username: '',
      emailMasked: '',
      password: '',
      confirmPassword: '',
      code: '',
      usernameError: '',
      passwordError: '',
      confirmError: '',
      codeError: '',
      looking: false,
      sending: false,
      saving: false,
      needsEmailBind: false,
      passwordVisible: false,
      confirmVisible: false,
      countdown: 0,
      countdownTimer: null,
      demoCode: '',
      lookupRules: {
        username: [{ required: true, message: '请输入用户名' }],
      },
      resetRules: {
        password: [
          { required: true, message: '请输入新密码' },
          {
            validator: isPasswordLengthValid,
            message: '新密码长度为 6 到 32 个字符',
          },
        ],
        confirm: [{ required: true, message: '请确认新密码' }],
        code: [{ required: true, message: '请输入验证码' }],
      },
    };
  },
  computed: {
    backFallback() {
      return resolveSessionUserId() ? ROUTES.userPassword : ROUTES.login;
    },
    lookupData() {
      return { username: this.username };
    },
    resetData() {
      return {
        password: this.password,
        confirm: this.confirmPassword,
        code: this.code,
      };
    },
    sendCodeLabel() {
      if (this.countdown > 0) return `${this.countdown}s 后重发`;
      return '获取验证码';
    },
  },
  onLoad(query) {
    this.username = String(query?.username || '').trim();
    if (this.username) this.lookupAccount();
  },
  onUnload() {
    this.clearCountdown();
  },
  methods: {
    toggleVisible(field) {
      if (this.saving) return;
      const key = `${field}Visible`;
      this[key] = !this[key];
    },
    clearCountdown() {
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      this.countdownTimer = null;
      this.countdown = 0;
    },
    startCountdown(seconds) {
      this.clearCountdown();
      this.countdown = Number(seconds) || CODE_THROTTLE_SECONDS;
      this.countdownTimer = setInterval(() => {
        this.countdown -= 1;
        if (this.countdown <= 0) this.clearCountdown();
      }, 1000);
    },
    async lookupAccount() {
      if (this.looking) return;
      const username = String(this.username || '').trim();
      this.usernameError = username ? '' : '请输入用户名';
      if (!username) return;
      const valid = await this.$refs.lookupForm?.validate();
      if (valid !== true && valid !== undefined) return;
      this.looking = true;
      this.needsEmailBind = false;
      try {
        const response = await getEmailByUsername(username);
        this.emailMasked = response?.email_masked || '';
        this.username = username;
        this.step = 1;
      } catch (error) {
        this.usernameError = fieldErrorMessage(error, 'username')
          || error?.message
          || '找不到这个用户名';
        this.needsEmailBind = /邮箱/.test(this.usernameError);
        notify({ title: this.usernameError });
      } finally {
        this.looking = false;
      }
    },
    goBindEmail() {
      if (resolveSessionUserId()) {
        goUserEmail();
        return;
      }
      notify({ title: '请先登录后再绑定邮箱' });
      goLogin();
    },
    async sendCode() {
      if (this.sending || this.saving || this.countdown > 0) return;
      this.sending = true;
      this.codeError = '';
      try {
        const response = await requestPasswordResetCode(this.username);
        this.emailMasked = response?.email_masked || this.emailMasked;
        this.demoCode = response?.demo_code || '';
        notify({ title: this.demoCode ? '验证码已生成' : '验证码已发送' });
        this.startCountdown(response?.retry_after);
      } catch (error) {
        this.codeError = fieldErrorMessage(error, 'code')
          || error?.message
          || '验证码发送失败';
        notify({ title: this.codeError });
        if (error?.statusCode === 429) {
          this.startCountdown(error?.data?.retry_after || CODE_THROTTLE_SECONDS);
        }
      } finally {
        this.sending = false;
      }
    },
    async submitReset() {
      if (this.saving || this.sending) return;
      const password = String(this.password || '').trim();
      const confirmPassword = String(this.confirmPassword || '').trim();
      const code = String(this.code || '').trim();
      this.passwordError = password ? '' : '请输入新密码';
      this.confirmError = confirmPassword ? '' : '请确认新密码';
      this.codeError = code ? '' : '请输入验证码';
      if (!password || !confirmPassword || !code) return;
      if (password !== confirmPassword) {
        this.confirmError = '两次密码不一样';
        return;
      }
      if (!isPasswordLengthValid(password)) {
        this.passwordError = '新密码长度为 6 到 32 个字符';
        return;
      }
      const valid = await this.$refs.resetForm?.validate();
      if (valid !== true && valid !== undefined) return;
      this.saving = true;
      try {
        await resetPassword(this.username, password, code);
        clearUserInfo();
        notifySuccess('重置成功，请用新密码登录');
        goLogin({}, { reset: true });
      } catch (error) {
        const passwordError = fieldErrorMessage(error, 'password');
        const codeError = fieldErrorMessage(error, 'code');
        this.passwordError = passwordError;
        this.codeError = codeError || (!passwordError ? (error?.message || '重置失败，请检查网络后重试') : '');
        notify({
          title: this.passwordError || this.codeError || '重置失败，请检查网络后重试',
        });
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.forget-form {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.hint {
  margin-bottom: var(--space-3);
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.bind-email {
  margin-top: var(--space-3);
}

.password-row,
.code-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.password-field,
.code-field {
  min-width: 0;
  flex: 1;
}

.password-toggle,
.code-button {
  margin-bottom: var(--space-3);
  flex-shrink: 0;
}

.demo-code {
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  background: var(--surface-subtle-color);
  color: var(--warning-color);
  font-size: var(--font-size-sm);
}

.demo-code text {
  font-weight: 700;
  letter-spacing: 0.2em;
}

:deep(.base-field-control),
:deep(.uni-input-wrapper),
:deep(.uni-input-input) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
</style>
