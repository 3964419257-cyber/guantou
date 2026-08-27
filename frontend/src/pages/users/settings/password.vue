<template>
  <PageShell
    title="修改密码"
    :back-fallback="ROUTES.userInformation"
  >
    <view class="password-form">
      <view class="hint">
        新密码长度为 6 到 32 个字符。修改成功后，下次登录请使用新密码。
      </view>

      <BaseForm
        ref="form"
        :data="form"
        :rules="rules"
      >
        <view class="password-row">
          <view class="password-field">
            <BaseField
              v-model="form.oldpassword"
              name="oldpassword"
              label="原密码"
              :type="oldVisible ? 'text' : 'password'"
              required
              placeholder="请输入原密码"
              :maxlength="32"
              :error="oldError"
              :disabled="saving"
            />
          </view>
          <BaseButton
            class="password-toggle"
            size="small"
            variant="ghost"
            :disabled="saving"
            @click="toggleVisible('old')"
          >
            {{ oldVisible ? '隐藏' : '显示' }}
          </BaseButton>
        </view>

        <view class="password-row">
          <view class="password-field">
            <BaseField
              v-model="form.newpassword"
              name="newpassword"
              label="新密码"
              :type="newVisible ? 'text' : 'password'"
              required
              placeholder="请输入新密码"
              :maxlength="32"
              :error="newError"
              :disabled="saving"
            />
          </view>
          <BaseButton
            class="password-toggle"
            size="small"
            variant="ghost"
            :disabled="saving"
            @click="toggleVisible('new')"
          >
            {{ newVisible ? '隐藏' : '显示' }}
          </BaseButton>
        </view>

        <view class="password-row">
          <view class="password-field">
            <BaseField
              v-model="form.confirm"
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

        <BaseButton
          block
          :disabled="saving"
          :loading="saving"
          @click="savePassword"
        >
          保存
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
import { goBack, goLogin, ROUTES } from '@/services/navigation';
import { resolveSessionUserId } from '@/services/session';
import request from '@/utils/request';

const app = getApp();

function fieldErrorMessage(error, field) {
  const item = error?.data?.[field];
  if (typeof item === 'string') return item;
  if (item?.message) return item.message;
  return '';
}

function applyPasswordErrors(error) {
  const oldError = fieldErrorMessage(error, 'oldpassword');
  const newError = fieldErrorMessage(error, 'newpassword');
  if (oldError || newError) {
    return { oldError, newError };
  }
  const message = error?.message || '保存失败';
  if (error?.statusCode === 401) {
    return { oldError: message, newError: '' };
  }
  return { oldError: '', newError: message };
}

export default {
  name: 'ChangePassword',
  components: {
    BaseButton, BaseField, BaseForm, PageShell,
  },
  data() {
    return {
      ROUTES,
      form: {
        oldpassword: '',
        newpassword: '',
        confirm: '',
      },
      rules: {
        oldpassword: [{ required: true, message: '请输入原密码' }],
        newpassword: [{ required: true, message: '请输入新密码' }],
        confirm: [{ required: true, message: '请确认新密码' }],
      },
      oldError: '',
      newError: '',
      confirmError: '',
      oldVisible: false,
      newVisible: false,
      confirmVisible: false,
      saving: false,
    };
  },
  computed: {
    oldPassword: {
      get() {
        return this.form.oldpassword;
      },
      set(value) {
        this.form.oldpassword = value;
      },
    },
    newPassword: {
      get() {
        return this.form.newpassword;
      },
      set(value) {
        this.form.newpassword = value;
      },
    },
    confirmPassword: {
      get() {
        return this.form.confirm;
      },
      set(value) {
        this.form.confirm = value;
      },
    },
  },
  onShow() {
    if (!resolveSessionUserId()) {
      goLogin({}, { reset: true });
    }
  },
  methods: {
    toggleVisible(field) {
      if (this.saving) return;
      const key = `${field}Visible`;
      this[key] = !this[key];
    },
    async savePassword() {
      if (this.saving) return;
      const oldPassword = String(this.form.oldpassword || '').trim();
      const newPassword = String(this.form.newpassword || '').trim();
      const confirmPassword = String(this.form.confirm || '').trim();
      this.oldError = oldPassword ? '' : '请输入原密码';
      this.newError = newPassword ? '' : '请输入新密码';
      this.confirmError = confirmPassword ? '' : '请确认新密码';
      if (!oldPassword || !newPassword || !confirmPassword) return;
      if (newPassword !== confirmPassword) {
        this.confirmError = '两次密码不一样';
        return;
      }
      const valid = await this.$refs.form.validate();
      if (valid !== true) return;
      this.saving = true;
      try {
        await request.put(`/users/${app.globalData.id}/password`, {
          oldpassword: oldPassword,
          newpassword: newPassword,
        }, true);
        notifySuccess('修改成功');
        goBack(ROUTES.userInformation);
      } catch (error) {
        const next = applyPasswordErrors(error);
        this.oldError = next.oldError;
        this.newError = next.newError;
        notify({ title: this.oldError || this.newError || '保存失败' });
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.password-form {
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

.password-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.password-field {
  min-width: 0;
  flex: 1;
}

.password-toggle {
  margin-bottom: var(--space-3);
  flex-shrink: 0;
}

:deep(.base-field-control),
:deep(.uni-input-wrapper),
:deep(.uni-input-input) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
</style>
