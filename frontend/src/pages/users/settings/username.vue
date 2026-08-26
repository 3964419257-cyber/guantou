<template>
  <PageShell
    title="修改用户名"
    :back-fallback="ROUTES.userInformation"
  >
    <view class="hint">
      用户名是识别账号的标识，也用于账号密码登录。
    </view>
    <BaseField
      v-model="username"
      label="用户名"
      required
      placeholder="不要超过 20 个字"
      :maxlength="20"
      :error="error"
      :disabled="saving"
    />
    <BaseButton
      block
      :disabled="saving || username === currentUsername"
      :loading="saving"
      @click="saveUsername"
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
import { resolveSessionUserId } from '@/services/session';
import request from '@/utils/request';

const app = getApp();

function fieldErrorMessage(error, field) {
  const item = error?.data?.[field] || error?.data?.user?.[field];
  if (typeof item === 'string') return item;
  if (item?.message) return item.message;
  return '';
}

export default {
  name: 'ChangeUsername',
  components: { BaseButton, BaseField, PageShell },
  data() {
    return {
      ROUTES,
      username: '',
      error: '',
      saving: false,
    };
  },
  computed: {
    currentUsername() {
      return app.globalData.userInfo?.username || '';
    },
  },
  onShow() {
    if (!resolveSessionUserId()) {
      goLogin({}, { reset: true });
      return;
    }
    this.username = this.currentUsername;
    this.error = '';
  },
  methods: {
    async saveUsername() {
      const username = String(this.username || '').trim();
      if (!username) {
        this.error = '请输入用户名';
        return;
      }
      this.error = '';
      this.saving = true;
      try {
        const userInfo = { ...app.globalData.userInfo, username };
        const res = await request.put(`/users/${app.globalData.id}`, { user: userInfo }, true);
        if (res.token) uni.setStorageSync('token', res.token);
        app.globalData.userInfo = res.user || userInfo;
        notifySuccess('修改成功');
        goBack(ROUTES.userInformation);
      } catch (error) {
        this.error = fieldErrorMessage(error, 'username') || error?.message || '保存失败';
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

:deep(.base-field-control),
:deep(.uni-input-wrapper),
:deep(.uni-input-input) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
</style>
