<template>
  <PageShell
    title="修改昵称"
    :back-fallback="ROUTES.userInformation"
  >
    <view class="hint">
      昵称用于用户之间的交流，会经常展示。
    </view>
    <BaseField
      v-model="nickname"
      label="昵称"
      required
      placeholder="不要超过 20 个字"
      :maxlength="20"
      :error="error"
      :disabled="saving"
    />
    <BaseButton
      block
      :disabled="saving || nickname === currentNickname"
      :loading="saving"
      @click="saveNickname"
    >
      保存
    </BaseButton>
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import PageShell from '@/components/PageShell.vue';
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
      nickname: '',
      error: '',
      saving: false,
    };
  },
  computed: {
    currentNickname() {
      return app.globalData.userInfo?.nickname || '';
    },
  },
  onShow() {
    if (!app.globalData.id) {
      goLogin({}, { reset: true });
      return;
    }
    this.nickname = this.currentNickname;
    this.error = '';
  },
  methods: {
    async saveNickname() {
      const nickname = String(this.nickname || '').trim();
      if (!nickname) {
        this.error = '请输入昵称';
        return;
      }
      this.error = '';
      this.saving = true;
      try {
        const userInfo = { ...app.globalData.userInfo, nickname };
        const res = await request.put(`/users/${app.globalData.id}`, { user: userInfo }, true);
        if (res.token) uni.setStorageSync('token', res.token);
        app.globalData.userInfo = res.user || userInfo;
        uni.showToast({ title: '修改成功' });
        goBack(ROUTES.userInformation);
      } catch (error) {
        this.error = fieldErrorMessage(error, 'nickname') || '保存失败';
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
