<template>
  <PageShell
    title="编辑资料"
    :back-fallback="ROUTES.mine"
  >
    <template #before>
      <view
        v-if="avatarSheetOpen"
        class="avatar-mask"
        @tap="closeAvatarSheet"
      >
        <view class="avatar-mask-dim" />
        <view
          class="avatar-sheet"
          @tap.stop
        >
          <view class="sheet-title">
            更换头像
          </view>
          <view class="sheet-copy">
            选好照片后立刻上传并保存。微信头像和昵称需要分别点选授权。
          </view>
          <view
            class="sheet-item pressable"
            @tap="pickFromAlbum"
          >
            从相册选择
          </view>
          <view
            class="sheet-item pressable"
            @tap="pickFromCamera"
          >
            拍照
          </view>
          <!-- 微信头像必须用原生 button open-type="chooseAvatar"；H5 改走相册/拍照。 -->
          <!--  #ifdef  MP-WEIXIN -->
          <view
            class="sheet-item pressable"
            @tap="pickFromChat"
          >
            从聊天记录选择
          </view>
          <button
            class="sheet-item sheet-button pressable"
            open-type="chooseAvatar"
            :disabled="saving || avatarBusy"
            @chooseavatar="onChooseWechatAvatar"
          >
            使用微信头像
          </button>
          <input
            class="sheet-item sheet-nickname"
            type="nickname"
            :value="user.nickname"
            placeholder="点这里填入微信昵称"
            :disabled="saving || avatarBusy"
            @blur="onChooseWechatNickname"
          >
          <!--  #endif -->
          <!--  #ifndef  MP-WEIXIN -->
          <view class="sheet-copy sheet-copy-foot">
            微信头像和聊天记录需要在小程序里使用。
          </view>
          <!--  #endif -->
          <view
            class="sheet-item sheet-cancel pressable"
            @tap="closeAvatarSheet"
          >
            取消
          </view>
        </view>
      </view>
    </template>

    <view
      v-if="loading"
      class="state-card"
    >
      正在读取资料…
    </view>
    <view
      v-else-if="loadError"
      class="state-card"
    >
      <view>{{ loadError }}</view>
      <BaseButton
        class="state-action"
        block
        @click="getInfo"
      >
        重试
      </BaseButton>
    </view>
    <view
      v-else
      class="profile-form"
    >
      <view
        v-if="saveError"
        class="form-error"
      >
        {{ saveError }}
      </view>
      <view class="edit-hero">
        <view
          class="avatar-hit pressable"
          @tap="openAvatarSheet"
        >
          <image
            class="hero-avatar"
            :src="user.avatar"
            mode="aspectFill"
          />
        </view>
        <view class="edit-hero-hint">
          点击头像更换。H5 用相册或拍照；小程序还可选聊天记录和微信头像。
        </view>
      </view>

      <SectionBlock title="公开档案">
        <view
          class="row pressable"
          @tap="goUserUsername"
        >
          <view class="row-label">
            用户名
          </view>
          <view class="row-value">
            {{ user.username || '未填写' }}
          </view>
        </view>
        <view
          class="row pressable"
          @tap="goUserNickname"
        >
          <view class="row-label">
            昵称
          </view>
          <view class="row-value">
            {{ user.nickname || '未填写' }}
          </view>
        </view>
      </SectionBlock>

      <SectionBlock title="账号与安全（仅自己可见）">
        <view
          class="row pressable"
          @tap="goUserEmail"
        >
          <view class="row-label">
            邮箱
          </view>
          <view class="row-value">
            {{ user.email || '未填写' }}
          </view>
        </view>
        <!--  #ifndef  MP-WEIXIN -->
        <view
          class="row pressable"
          @tap="goUserPhone"
        >
          <view class="row-label">
            手机
          </view>
          <view class="row-value">
            {{ user.telephone || '未填写' }}
          </view>
        </view>
        <!--  #endif -->
        <view
          class="row pressable"
          @tap="openBirthdayPicker"
        >
          <view class="row-label">
            生日
          </view>
          <view class="row-value">
            {{ date }}
          </view>
        </view>
      </SectionBlock>

      <SectionBlock title="装罐默认">
        <view
          class="row pressable"
          @tap="openDialectPicker"
        >
          <view class="row-label">
            发音默认地点
          </view>
          <view class="row-value">
            {{ selectedDialectLabel }}
          </view>
        </view>
      </SectionBlock>

      <t-date-time-picker
        :visible="birthdayPickerOpen"
        title="生日"
        mode="date"
        format="YYYY-MM-DD"
        start="1960-09-01"
        end="2020-09-01"
        cancel-btn="取消"
        confirm-btn="确定"
        :value="birthdayPickerValue"
        @confirm="onBirthdayConfirm"
        @cancel="closeBirthdayPicker"
        @close="closeBirthdayPicker"
      />
      <t-picker
        :visible="dialectPickerOpen"
        title="发音默认地点"
        cancel-btn="取消"
        confirm-btn="确定"
        :value="dialectPickerValue"
        @confirm="onDialectConfirm"
        @cancel="closeDialectPicker"
        @close="closeDialectPicker"
      >
        <t-picker-item :options="dialectPickerOptions" />
      </t-picker>
    </view>
  </PageShell>
</template>

<script>
import TDateTimePicker from '@tdesign/uniapp/date-time-picker/date-time-picker.vue';
import TPicker from '@tdesign/uniapp/picker/picker.vue';
import TPickerItem from '@tdesign/uniapp/picker-item/picker-item.vue';
import BaseButton from '@/components/BaseButton.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { notify, notifySuccess } from '@/services/feedback';
import { uploadFile } from '@/services/file';
import { listAllDialects } from '@/services/guantou';
import {
  goLogin,
  goUserEmail,
  goUserNickname,
  goUserPhone,
  goUserUsername,
  ROUTES,
} from '@/services/navigation';
import { resolveSessionUserId } from '@/services/session';
import { changeUserInfo, getUserInfo } from '@/services/user';

const app = getApp();
// 微信头像/昵称只能写在原生 button[open-type=chooseAvatar] 与 input[type=nickname] 上；
// H5 没有这两项开放能力，改走 uni.chooseImage 相册/拍照，选完立即 uploadFile 再 PUT。
const BIRTHDAY_START = '1960-09-01';
const BIRTHDAY_END = '2020-09-01';
const BIRTHDAY_FALLBACK = '1990-01-01';

function fieldErrorMessage(error, field) {
  const item = error?.data?.[field] || error?.data?.user?.[field];
  if (typeof item === 'string') return item;
  if (item?.message) return item.message;
  return '';
}

function pickerEventValue(event) {
  if (event == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(event, 'detail')) {
    return event.detail?.value ?? event.detail;
  }
  return event.value;
}

function isDateValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

export default {
  name: 'EditProfile',
  components: {
    BaseButton,
    PageShell,
    SectionBlock,
    TDateTimePicker,
    TPicker,
    TPickerItem,
  },
  data() {
    return {
      ROUTES,
      user: {},
      date: '未知',
      dialectIndex: -1,
      dialectOptions: [],
      loading: true,
      loadError: '',
      saveError: '',
      saving: false,
      avatarSheetOpen: false,
      avatarBusy: false,
      birthdayPickerOpen: false,
      dialectPickerOpen: false,
    };
  },
  computed: {
    dialectLabels() {
      return this.dialectOptions.map((dialect) => dialect.qualified_code || dialect.name);
    },
    selectedDialectLabel() {
      return this.dialectLabels[this.dialectIndex] || '未填写方言点';
    },
    dialectPickerOptions() {
      return this.dialectOptions.map((dialect) => ({
        label: dialect.qualified_code || dialect.name,
        value: String(dialect.id),
      }));
    },
    dialectPickerValue() {
      const dialect = this.dialectOptions[this.dialectIndex];
      return dialect ? [String(dialect.id)] : [];
    },
    birthdayPickerValue() {
      return isDateValue(this.date) ? this.date : BIRTHDAY_FALLBACK;
    },
  },
  onShow() {
    if (!resolveSessionUserId()) {
      goLogin({}, { reset: true });
      return;
    }
    this.getInfo();
  },
  methods: {
    goUserNickname,
    goUserEmail,
    goUserPhone,
    goUserUsername,
    openAvatarSheet() {
      if (this.saving || this.avatarBusy) return;
      this.avatarSheetOpen = true;
    },
    closeAvatarSheet() {
      if (this.saving || this.avatarBusy) return;
      this.avatarSheetOpen = false;
    },
    openBirthdayPicker() {
      if (this.saving || this.avatarBusy) return;
      this.birthdayPickerOpen = true;
    },
    closeBirthdayPicker() {
      this.birthdayPickerOpen = false;
    },
    openDialectPicker() {
      if (this.saving || this.avatarBusy) return;
      if (!this.dialectOptions.length) {
        notify({ title: '暂时没有方言点可选' });
        return;
      }
      this.dialectPickerOpen = true;
    },
    closeDialectPicker() {
      this.dialectPickerOpen = false;
    },
    isUserCancel(error) {
      const message = error?.errMsg || error?.message || '';
      return /cancel/i.test(message);
    },
    chooseImagePath(sourceType) {
      return new Promise((resolve, reject) => {
        uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType,
          success: (res) => {
            const path = res.tempFilePaths?.[0]
              || res.tempFiles?.[0]?.path
              || res.tempFiles?.[0]?.tempFilePath
              || '';
            if (!path) {
              reject(new Error('未选择图片'));
              return;
            }
            resolve(path);
          },
          fail: reject,
        });
      });
    },
    async saveAvatarFromPath(path, { closeSheet = true } = {}) {
      if (!path || this.saving || this.avatarBusy) return;
      this.avatarBusy = true;
      this.saveError = '';
      try {
        const { url } = await uploadFile(path);
        await this.persistUser({ ...this.user, avatar: url });
        if (closeSheet) this.avatarSheetOpen = false;
      } catch (error) {
        this.saveError = fieldErrorMessage(error, 'avatar') || error?.message || '头像更新失败';
        notify({ title: this.saveError });
      } finally {
        this.avatarBusy = false;
      }
    },
    async pickFromAlbum() {
      try {
        const path = await this.chooseImagePath(['album']);
        await this.saveAvatarFromPath(path);
      } catch (error) {
        if (this.isUserCancel(error)) return;
        this.saveError = '选择相册图片失败';
        notify({ title: this.saveError });
      }
    },
    async pickFromCamera() {
      try {
        const path = await this.chooseImagePath(['camera']);
        await this.saveAvatarFromPath(path);
      } catch (error) {
        if (this.isUserCancel(error)) return;
        this.saveError = '拍照失败';
        notify({ title: this.saveError });
      }
    },
    async pickFromChat() {
      try {
        const path = await new Promise((resolve, reject) => {
          uni.chooseMessageFile({
            count: 1,
            type: 'image',
            success: (res) => {
              const file = res.tempFiles?.[0] || {};
              const nextPath = file.path || file.tempFilePath || '';
              if (!nextPath) {
                reject(new Error('未选择图片'));
                return;
              }
              resolve(nextPath);
            },
            fail: reject,
          });
        });
        await this.saveAvatarFromPath(path);
      } catch (error) {
        if (this.isUserCancel(error)) return;
        this.saveError = '选择聊天记录图片失败';
        notify({ title: this.saveError });
      }
    },
    async onChooseWechatAvatar(event) {
      const path = event?.detail?.avatarUrl || '';
      await this.saveAvatarFromPath(path, { closeSheet: false });
    },
    async onChooseWechatNickname(event) {
      const nickname = String(event?.detail?.value || '').trim();
      if (!nickname || nickname === this.user.nickname) return;
      await this.persistUser({ ...this.user, nickname });
    },
    async getInfo() {
      this.loading = true;
      this.loadError = '';
      try {
        this.dialectOptions = await listAllDialects();
        const userInfo = await getUserInfo(app.globalData.id, true);
        this.user = { ...userInfo.user };
        this.date = userInfo.user.birthday || '未知';
        this.dialectIndex = userInfo.user.primary_dialect
          ? this.dialectOptions.findIndex(
            (dialect) => dialect.id === userInfo.user.primary_dialect.id,
          )
          : -1;
      } catch (error) {
        this.loadError = error?.message || '资料加载失败，请检查网络后重试';
      } finally {
        this.loading = false;
      }
    },
    async persistUser(nextUser) {
      if (this.saving) return;
      this.saving = true;
      this.saveError = '';
      try {
        const res = await changeUserInfo(app.globalData.id, nextUser);
        this.user = { ...(res.user || nextUser) };
        app.globalData.userInfo = this.user;
        notifySuccess('修改成功');
      } catch (error) {
        this.saveError = fieldErrorMessage(error, 'primary_dialect')
          || fieldErrorMessage(error, 'birthday')
          || fieldErrorMessage(error, 'telephone')
          || fieldErrorMessage(error, 'avatar')
          || fieldErrorMessage(error, 'nickname')
          || error?.message
          || '保存失败，请检查网络后重试';
        notify({ title: this.saveError });
      } finally {
        this.saving = false;
      }
    },
    async onBirthdayConfirm(event) {
      const value = pickerEventValue(event);
      this.closeBirthdayPicker();
      if (!isDateValue(value) || value < BIRTHDAY_START || value > BIRTHDAY_END) return;
      if (value === this.date) return;
      this.date = value;
      await this.persistUser({ ...this.user, birthday: value });
    },
    async onDialectConfirm(event) {
      const raw = pickerEventValue(event);
      const selected = Array.isArray(raw) ? raw[0] : raw;
      this.closeDialectPicker();
      const dialectId = Number(selected);
      const nextIndex = this.dialectOptions.findIndex((dialect) => dialect.id === dialectId);
      if (nextIndex < 0) return;
      if (nextIndex === this.dialectIndex) return;
      const dialect = this.dialectOptions[nextIndex];
      this.dialectIndex = nextIndex;
      await this.persistUser({ ...this.user, primary_dialect_id: dialect.id });
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

.profile-form {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.form-error {
  margin-bottom: var(--space-3);
  color: var(--danger-color);
  font-size: var(--font-size-sm);
}

.edit-hero {
  margin-bottom: var(--space-4);
  text-align: center;
}

.edit-hero-hint {
  margin-top: var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.hero-avatar {
  width: 168rpx;
  height: 168rpx;
  border-radius: var(--radius-pill);
  background: var(--surface-subtle-color);
}

.avatar-hit {
  display: inline-block;
}

.avatar-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.avatar-mask-dim {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--text-color);
  opacity: 0.4;
}

.avatar-sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  padding-bottom: var(--space-4);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--surface-color);
  overflow: hidden;
}

.sheet-title {
  padding: var(--space-4) var(--space-4) var(--space-1);
  font-size: var(--font-size-lg);
  font-weight: 700;
  text-align: center;
}

.sheet-copy {
  padding: 0 var(--space-4) var(--space-3);
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  text-align: center;
}

.sheet-copy-foot {
  padding-top: var(--space-3);
}

.sheet-item {
  width: 100%;
  margin: 0;
  padding: var(--space-4);
  background: var(--surface-color);
  color: var(--text-color);
  font-size: var(--font-size-base);
  line-height: 1.6;
  text-align: center;
  border: 0;
  border-top: 1px solid var(--border-color);
  border-radius: 0;
  box-sizing: border-box;
}

.sheet-button {
  display: block;
}

.sheet-button::after {
  border: 0;
}

.sheet-nickname {
  height: auto;
  min-height: 96rpx;
}

.sheet-cancel {
  color: var(--muted-color);
}

.row {
  min-height: 92rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-color);
}

.row:last-child {
  border-bottom: 0;
}

.row-label {
  flex: 0 0 auto;
  max-width: 42%;
  color: var(--text-color);
  font-size: var(--font-size-base);
  font-weight: 600;
  line-height: 1.6;
}

.row-value {
  flex: 1;
  min-width: 0;
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  text-align: right;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.pressable {
  transition: opacity 200ms ease, transform 200ms ease;
}

.pressable:active {
  opacity: 0.72;
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .pressable {
    transition: none;
  }

  .pressable:active {
    transform: none;
  }
}
</style>
