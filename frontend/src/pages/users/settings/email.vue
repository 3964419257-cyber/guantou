<template>
  <PageShell
    title="修改邮箱"
    :back-fallback="ROUTES.userInformation"
  >
    <view
      v-if="loading"
      class="state-card"
    >
      正在读取邮箱…
    </view>
    <view
      v-else-if="loadError"
      class="state-card"
    >
      <view>{{ loadError }}</view>
      <BaseButton
        class="state-action"
        block
        @click="getUserEmail"
      >
        重试
      </BaseButton>
    </view>
    <template v-else>
      <BaseField
        :model-value="oldEmail"
        label="原邮箱"
        disabled
      />
      <BaseField
        v-model="newEmail"
        label="新邮箱"
        required
        placeholder="请输入新邮箱"
        :error="emailError"
        :disabled="saving || sending"
      />
      <view class="code-row">
        <view class="code-field">
          <BaseField
            v-model="code"
            label="验证码"
            required
            placeholder="请输入验证码"
            :error="codeError"
            :disabled="saving"
          />
        </view>
        <BaseButton
          size="small"
          variant="ghost"
          :disabled="sending || saving"
          :loading="sending"
          @click="sendCode"
        >
          获取验证码
        </BaseButton>
      </view>
      <BaseButton
        block
        :disabled="saving || sending"
        :loading="saving"
        @click="setNewEmail"
      >
        保存
      </BaseButton>
    </template>
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import PageShell from '@/components/PageShell.vue';
import { notify, notifySuccess } from '@/services/feedback';
import { goBack, goLogin, ROUTES } from '@/services/navigation';
import request from '@/utils/request';

const app = getApp();

function fieldErrorMessage(error, field) {
  const item = error?.data?.[field] || error?.data?.user?.[field];
  if (typeof item === 'string') return item;
  if (item?.message) return item.message;
  return error?.message || '';
}

export default {
  components: { BaseButton, BaseField, PageShell },
  data() {
    return {
      ROUTES,
      oldEmail: '',
      newEmail: '',
      code: '',
      emailError: '',
      codeError: '',
      sending: false,
      saving: false,
      loading: true,
      loadError: '',
    };
  },
  onLoad() {
    if (!app.globalData.id) {
      goLogin({}, { reset: true });
      return;
    }
    this.getUserEmail();
  },
  methods: {
    async getUserEmail() {
      this.loading = true;
      this.loadError = '';
      try {
        const userInfo = await request.get(`/users/${app.globalData.id}`, null, true);
        this.oldEmail = userInfo.user.email || '';
      } catch (error) {
        this.loadError = error?.message || '邮箱读取失败';
      } finally {
        this.loading = false;
      }
    },
    async sendCode() {
      const email = String(this.newEmail || '').trim();
      if (!email) {
        this.emailError = '请输入新邮箱';
        return;
      }
      this.emailError = '';
      this.sending = true;
      try {
        await request.post('/users/email-code', { email, purpose: 'bind' }, true);
        notify({ title: '验证码已发送' });
      } catch (error) {
        this.emailError = fieldErrorMessage(error, 'email') || '验证码发送失败';
        notify({ title: this.emailError });
      } finally {
        this.sending = false;
      }
    },
    async setNewEmail() {
      const email = String(this.newEmail || '').trim();
      const code = String(this.code || '').trim();
      this.emailError = email ? '' : '请输入新邮箱';
      this.codeError = code ? '' : '请输入验证码';
      if (!email || !code) return;
      this.saving = true;
      try {
        await request.put(`/users/${app.globalData.id}/email`, { email, code }, true);
        notifySuccess('修改成功');
        goBack(ROUTES.userInformation);
      } catch (error) {
        this.emailError = fieldErrorMessage(error, 'email');
        this.codeError = fieldErrorMessage(error, 'code')
          || (!this.emailError ? (error?.message || '保存失败') : '');
        notify({ title: this.emailError || this.codeError || '保存失败' });
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.state-card {
  padding: var(--space-4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
  color: var(--text-secondary-color);
}

.state-action {
  margin-top: var(--space-3);
}

.code-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.code-field {
  min-width: 0;
  flex: 1;
}
</style>
