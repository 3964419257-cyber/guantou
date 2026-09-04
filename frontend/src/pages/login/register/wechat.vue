<template>
  <PageShell
    title="微信注册"
    :show-back="true"
  >
    <view class="auth-card">
      <view class="auth-card__title">
        绑定账号信息
      </view>
      <view class="auth-card__lead">
        为你的微信登录补全用户名、昵称和密码。
      </view>

      <view class="auth-form">
        <BaseField
          v-model="username"
          name="username"
          label="用户名"
          placeholder="请输入用户名（账号唯一标识）"
          required
          :error="errors.username"
          @input="clearFieldError('username')"
        />
        <BaseField
          v-model="nickname"
          name="nickname"
          label="昵称"
          placeholder="请输入昵称（空白则默认为用户名）"
          :error="errors.nickname"
          @input="clearFieldError('nickname')"
        />
        <BaseField
          v-model="password"
          name="password"
          label="密码"
          type="password"
          placeholder="请输入6~32位密码"
          required
          :error="errors.password"
          @input="clearFieldError('password')"
        />
        <BaseField
          v-model="passwordConfirmed"
          name="passwordConfirmed"
          label="确认密码"
          type="password"
          placeholder="请再次输入密码"
          required
          :error="errors.passwordConfirmed"
          @input="clearFieldError('passwordConfirmed')"
        />

        <BaseButton
          block
          :loading="submitting"
          @click="wechatRegister"
        >
          微信注册
        </BaseButton>
      </view>
    </view>
  </PageShell>
</template>

<script>
import PageShell from '@/components/PageShell.vue';
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import confirmDialog from '@/components/ConfirmDialog';
import { registerWechatUser } from '@/services/user';
import { applyFieldErrors, readableErrorMessage } from '@/utils/apiError';

export default {
  name: 'WechatRegisterPage',
  components: { PageShell, BaseButton, BaseField },
  data() {
    return {
      username: '',
      nickname: '',
      password: '',
      passwordConfirmed: '',
      submitting: false,
      errors: {
        username: '',
        nickname: '',
        password: '',
        passwordConfirmed: '',
      },
    };
  },
  methods: {
    clearFieldError(field) {
      this.errors[field] = '';
    },
    async wechatRegister() {
      const username = String(this.username || '').trim();
      const nickname = String(this.nickname || '').trim();
      const { password, passwordConfirmed } = this;

      this.errors.username = username ? '' : '请输入用户名';
      this.errors.password = password ? '' : '请输入密码';
      this.errors.passwordConfirmed = passwordConfirmed ? '' : '请再次输入密码';
      if (this.errors.username || this.errors.password || this.errors.passwordConfirmed) return;

      if (password.length < 6 || password.length > 32) {
        this.errors.password = '密码长度 6 - 32 位';
        return;
      }
      if (password !== passwordConfirmed) {
        this.errors.passwordConfirmed = '两次密码不相同';
        return;
      }

      let finalNickname = nickname;
      if (!finalNickname) {
        const confirmed = await confirmDialog({
          content: '未填写昵称将会用用户名暂代哦~',
        });
        if (!confirmed) return;
        finalNickname = username;
      }

      this.submitting = true;
      try {
        await registerWechatUser(username, password, finalNickname);
      } catch (error) {
        if (!applyFieldErrors(this.errors, error, ['username', 'nickname', 'password'])) {
          uni.showToast({ title: readableErrorMessage(error) || '注册失败', icon: 'none' });
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
</style>
