<template>
  <PageShell
    title="修改手机"
    :back-fallback="ROUTES.userInformation"
  >
    <view class="hint">
      请填写 11 位大陆手机号，用于验证码登录。
    </view>
    <BaseField
      v-model="telephone"
      label="手机"
      type="number"
      required
      placeholder="请输入 11 位手机号"
      :maxlength="11"
      :error="error"
      :disabled="saving"
    />
    <BaseButton
      block
      :disabled="saving || telephone === currentTelephone"
      :loading="saving"
      @click="savePhone"
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
import { getUserInfo } from '@/services/user';
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
      telephone: '',
      error: '',
      saving: false,
    };
  },
  computed: {
    currentTelephone() {
      return app.globalData.userInfo?.telephone || '';
    },
  },
  onShow() {
    if (!app.globalData.id) {
      goLogin({}, { reset: true });
      return;
    }
    this.telephone = this.currentTelephone;
    this.error = '';
  },
  methods: {
    async savePhone() {
      const telephone = String(this.telephone || '').trim();
      if (!/^\d{11}$/.test(telephone)) {
        this.error = '请输入正确格式的手机号码';
        return;
      }
      this.error = '';
      this.saving = true;
      try {
        const userInfo = await getUserInfo(app.globalData.id);
        userInfo.user.telephone = telephone;
        const res = await request.put(
          `/users/${app.globalData.id}`,
          { user: userInfo.user },
          true,
        );
        if (res.token) uni.setStorageSync('token', res.token);
        app.globalData.userInfo = res.user || userInfo.user;
        notifySuccess('修改成功');
        goBack(ROUTES.userInformation);
      } catch (error) {
        this.error = fieldErrorMessage(error, 'telephone') || '保存失败';
        notify({ title: this.error });
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.hint {
  margin-bottom: var(--space-3);
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
</style>
