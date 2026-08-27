<template>
  <PageShell
    title="修改昵称"
    :back-fallback="ROUTES.userInformation"
  >
    <view class="setting-hint">
      昵称用于用户之间的交流，会经常展示。
    </view>
    <BaseForm
      ref="form"
      :data="form"
      :rules="rules"
    >
      <BaseField
        v-model="form.nickname"
        name="nickname"
        label="昵称"
        required
        clearable
        placeholder="请输入不超过 20 位的昵称"
        :maxlength="20"
        :error="error"
        :disabled="saving"
      />
      <BaseButton
        block
        text="保存"
        :disabled="saving || form.nickname === currentNickname"
        :loading="saving"
        @click="saveNickname"
      />
    </BaseForm>
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import BaseForm from '@/components/BaseForm.vue';
import PageShell from '@/components/PageShell.vue';
import { notify, notifySuccess } from '@/services/feedback';
import { goBack, goLogin, ROUTES } from '@/services/navigation';
import { resolveSessionUserId } from '@/services/session';
import { changeUserInfo } from '@/services/user';

const app = getApp();

function fieldErrorMessage(error, field) {
  const item = error?.data?.[field] || error?.data?.user?.[field];
  if (typeof item === 'string') return item;
  if (item?.message) return item.message;
  return '';
}

export default {
  name: 'ChangeNickname',
  components: {
    BaseButton, BaseField, BaseForm, PageShell,
  },
  data() {
    return {
      ROUTES,
      form: { nickname: '' },
      rules: {
        nickname: [
          { required: true, message: '请输入正确的昵称' },
          { whitespace: true, message: '请输入正确的昵称' },
        ],
      },
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
    if (!resolveSessionUserId()) {
      goLogin({}, { reset: true });
      return;
    }
    this.form.nickname = this.currentNickname;
    this.error = '';
  },
  methods: {
    async saveNickname() {
      const valid = await this.$refs.form.validate();
      if (valid !== true) return;
      const nickname = String(this.form.nickname || '').trim();
      if (!nickname) {
        this.error = '请输入昵称';
        return;
      }
      this.error = '';
      this.saving = true;
      try {
        const userInfo = { ...app.globalData.userInfo, nickname };
        await changeUserInfo(app.globalData.id, userInfo);
        app.globalData.userInfo = userInfo;
        notifySuccess('修改成功');
        goBack(ROUTES.userInformation);
      } catch (error) {
        this.error = fieldErrorMessage(error, 'nickname') || error?.message || '保存失败，请检查网络后重试';
        notify({ title: this.error });
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.setting-hint {
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--accent-subtle-color);
  color: var(--text-secondary-color);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
</style>
