<template>
  <PageShell
    title="修改密码"
    :back-fallback="ROUTES.userInformation"
  >
    <BaseField
      v-model="oldPassword"
      label="原密码"
      type="password"
      required
      placeholder="请输入原密码"
      :error="oldError"
      :disabled="saving"
    />
    <BaseField
      v-model="newPassword"
      label="新密码"
      type="password"
      required
      placeholder="请输入新密码"
      :error="newError"
      :disabled="saving"
    />
    <BaseField
      v-model="confirmPassword"
      label="确认密码"
      type="password"
      required
      placeholder="请再次输入新密码"
      :error="confirmError"
      :disabled="saving"
    />
    <BaseButton
      block
      :disabled="saving"
      :loading="saving"
      @click="savePassword"
    >
      保存
    </BaseButton>
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
  const item = error?.data?.[field];
  if (typeof item === 'string') return item;
  if (item?.message) return item.message;
  return error?.message || '';
}

export default {
  components: { BaseButton, BaseField, PageShell },
  data() {
    return {
      ROUTES,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      oldError: '',
      newError: '',
      confirmError: '',
      saving: false,
    };
  },
  onShow() {
    if (!app.globalData.id) {
      goLogin({}, { reset: true });
    }
  },
  methods: {
    async savePassword() {
      const oldPassword = String(this.oldPassword || '').trim();
      const newPassword = String(this.newPassword || '').trim();
      const confirmPassword = String(this.confirmPassword || '').trim();
      this.oldError = oldPassword ? '' : '请输入原密码';
      this.newError = newPassword ? '' : '请输入新密码';
      this.confirmError = confirmPassword ? '' : '请确认新密码';
      if (!oldPassword || !newPassword || !confirmPassword) return;
      if (newPassword !== confirmPassword) {
        this.confirmError = '两次密码不一样';
        return;
      }
      this.saving = true;
      try {
        await request.put(`/users/${app.globalData.id}/password`, {
          oldpassword: oldPassword,
          newpassword: newPassword,
        }, true);
        notifySuccess('修改成功');
        goBack(ROUTES.userInformation);
      } catch (error) {
        this.oldError = fieldErrorMessage(error, 'oldpassword');
        this.newError = fieldErrorMessage(error, 'newpassword')
          || (!this.oldError ? (error?.message || '保存失败') : '');
        notify({ title: this.oldError || this.newError || '保存失败' });
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
