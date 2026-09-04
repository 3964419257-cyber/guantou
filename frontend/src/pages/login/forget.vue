<template>
  <PageShell
    title="忘记密码"
    :show-back="true"
  >
    <view class="auth-card">
      <view class="auth-card__title">
        找回密码
      </view>
      <view class="auth-card__lead">
        通过账号绑定的邮箱验证身份后，即可设置新密码。
      </view>

      <view
        v-if="steps === 0"
        class="auth-form"
      >
        <BaseField
          v-model="username"
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          required
          :error="errors.username"
          @input="clearFieldError('username')"
        />
        <BaseButton
          block
          :loading="checking"
          @click="next"
        >
          下一步
        </BaseButton>
      </view>

      <view
        v-else
        class="auth-form"
      >
        <BaseField
          v-model="password"
          name="password"
          label="新密码"
          type="password"
          placeholder="请输入新密码"
          required
          :error="errors.password"
          @input="clearFieldError('password')"
        />
        <BaseField
          v-model="repeatedPassword"
          name="repeatedPassword"
          label="重复密码"
          type="password"
          placeholder="请重复新密码"
          required
          :error="errors.repeatedPassword"
          @input="clearFieldError('repeatedPassword')"
        />
        <BaseField
          v-model="emailMasked"
          name="emailMasked"
          label="邮箱"
          placeholder="已绑定的邮箱"
          disabled
        />

        <view class="code-row">
          <view class="code-field">
            <BaseField
              v-model="code"
              name="code"
              label="验证码"
              placeholder="请输入验证码"
              required
              :error="errors.code"
              @input="clearFieldError('code')"
            />
          </view>
          <BaseButton
            class="code-button"
            variant="ghost"
            size="medium"
            :disabled="isSending"
            @click="getCode"
          >
            {{ sendCodeMsg }}
          </BaseButton>
        </view>
        <BaseButton
          block
          :loading="submitting"
          @click="reset"
        >
          重置密码
        </BaseButton>
      </view>
    </view>
  </PageShell>
</template>

<script>
import PageShell from '@/components/PageShell.vue';
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import {
  getEmailByUsername,
  requestPasswordResetCode,
  resetPassword,
} from '@/services/user';
import { applyFieldErrors, readableErrorMessage } from '@/utils/apiError';
import getCodeMixin from './mixin/getCodeMixin';

export default {
  name: 'ForgetPage',
  components: { PageShell, BaseButton, BaseField },
  mixins: [getCodeMixin],
  data() {
    return {
      username: '',
      emailMasked: '',
      steps: 0,
      password: '',
      repeatedPassword: '',
      code: '',
      checking: false,
      submitting: false,
      errors: {
        username: '',
        password: '',
        repeatedPassword: '',
        code: '',
      },
    };
  },
  onLoad(query) {
    this.username = String(query?.username || '').trim();
  },
  methods: {
    clearFieldError(field) {
      this.errors[field] = '';
    },
    async next() {
      const username = String(this.username || '').trim();
      this.errors.username = username ? '' : '请输入用户名';
      if (this.errors.username) return;

      this.checking = true;
      try {
        const res = await getEmailByUsername(username);
        this.emailMasked = res.email_masked;
        this.steps = 1;
      } catch (error) {
        if (!applyFieldErrors(this.errors, error, ['username'])) {
          const title = readableErrorMessage(error, {
            404: '没有找到该账号',
          }) || '查询失败';
          uni.showToast({ title, icon: 'none' });
        }
      } finally {
        this.checking = false;
      }
    },
    async getCode() {
      try {
        const res = await requestPasswordResetCode(this.username);
        this.emailMasked = res.email_masked;
        uni.showToast({ title: '验证码已发送', icon: 'success' });
        this.isSending = true;
      } catch (error) {
        if (!applyFieldErrors(this.errors, error, ['username', 'code'])) {
          uni.showToast({
            title: readableErrorMessage(error) || '验证码发送失败',
            icon: 'none',
          });
        }
      }
    },
    async reset() {
      const password = String(this.password || '');
      const repeatedPassword = String(this.repeatedPassword || '');
      const code = String(this.code || '').trim();

      this.errors.password = password ? '' : '请输入新密码';
      this.errors.repeatedPassword = repeatedPassword ? '' : '请重复新密码';
      this.errors.code = code ? '' : '请输入验证码';
      if (this.errors.password || this.errors.repeatedPassword || this.errors.code) return;

      if (password.length < 6 || password.length > 32) {
        this.errors.password = '密码长度 6 - 32 位';
        return;
      }
      if (repeatedPassword !== password) {
        this.errors.repeatedPassword = '两次密码不一致';
        return;
      }

      this.submitting = true;
      try {
        await resetPassword(this.username, password, code);
        uni.showToast({ title: '重置成功', icon: 'success', duration: 2000 });
        uni.navigateBack({ delta: 1 });
      } catch (error) {
        if (!applyFieldErrors(this.errors, error, ['password', 'code'])) {
          uni.showToast({ title: readableErrorMessage(error) || '重置失败', icon: 'none' });
        }
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style scoped>
.auth-card {
  max-width: 680rpx;
  margin: 42rpx auto 0;
  padding: 52rpx 34rpx 38rpx;
  border: 1rpx solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--surface-color);
  box-shadow: 0 20rpx 60rpx var(--border-color);
  box-sizing: border-box;
}

.auth-card__title {
  color: var(--text-color);
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.auth-card__lead {
  margin-top: var(--space-2);
  color: var(--text-secondary-color);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.auth-form {
  margin-top: var(--space-4);
}

.code-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.code-field {
  flex: 1;
  min-width: 0;
}

.code-button {
  flex: 0 0 auto;
  margin-bottom: var(--space-3);
}

</style>
