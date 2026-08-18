<template>
  <PageShell
    title="编辑资料"
    :back-fallback="ROUTES.mine"
  >
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
    <template v-else>
      <view
        v-if="saveError"
        class="form-error"
      >
        {{ saveError }}
      </view>
      <view class="edit-hero">
        <button
          class="avatar-button"
          open-type="chooseAvatar"
          @chooseavatar="onChooseAvatar"
        >
          <image
            class="hero-avatar"
            :src="user.avatar"
            mode="aspectFill"
          />
        </button>
        <view class="edit-hero-hint">
          点击更换头像
        </view>
      </view>
      <SectionBlock title="公开档案">
        <view
          class="row"
          @tap="goUserUsername"
        >
          <text class="row-label">
            用户名
          </text>
          <text class="row-value">
            {{ user.username || '未填写' }}
          </text>
        </view>
        <view
          class="row"
          @tap="goUserNickname"
        >
          <text class="row-label">
            昵称
          </text>
          <text class="row-value">
            {{ user.nickname || '未填写' }}
          </text>
        </view>
      </SectionBlock>

      <SectionBlock title="账号与安全（仅自己可见）">
        <view
          class="row"
          @tap="goUserEmail"
        >
          <text class="row-label">
            邮箱
          </text>
          <text class="row-value">
            {{ user.email || '未填写' }}
          </text>
        </view>
        <!--  #ifndef  MP-WEIXIN -->
        <view
          class="row"
          @tap="goUserPhone"
        >
          <text class="row-label">
            手机
          </text>
          <text class="row-value">
            {{ user.telephone || '未填写' }}
          </text>
        </view>
        <view class="row">
          <text class="row-label">
            生日
          </text>
          <picker
            mode="date"
            :value="date"
            start="1960-09-01"
            end="2020-09-01"
            @change="changeDate"
          >
            <view class="row-value">
              {{ date }}
            </view>
          </picker>
        </view>
        <!--  #endif -->
      </SectionBlock>

      <SectionBlock title="装罐默认">
        <view class="row">
          <text class="row-label">
            发音默认地点
          </text>
          <picker
            mode="selector"
            :value="dialectIndex"
            :range="dialectLabels"
            @change="dialectChange"
          >
            <view class="row-value">
              {{ selectedDialectLabel }}
            </view>
          </picker>
        </view>
      </SectionBlock>
    </template>
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { notify, notifySuccess } from '@/services/feedback';
import { uploadFile } from '@/services/file';
import { listAllDialects } from '@/services/guantou';
import {
  goUserEmail,
  goUserNickname,
  goUserPhone,
  goUserUsername,
  ROUTES,
} from '@/services/navigation';
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
  components: { BaseButton, PageShell, SectionBlock },
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
    };
  },
  computed: {
    dialectLabels() {
      return this.dialectOptions.map((dialect) => dialect.qualified_code || dialect.name);
    },
    selectedDialectLabel() {
      return this.dialectLabels[this.dialectIndex] || '未填写方言点';
    },
  },
  onShow() {
    this.getInfo();
  },
  methods: {
    goUserNickname,
    goUserEmail,
    goUserPhone,
    goUserUsername,
    async getInfo() {
      this.loading = true;
      this.loadError = '';
      try {
        this.dialectOptions = await listAllDialects();
        const userInfo = await getUserInfo(app.globalData.id);
        this.user = { ...userInfo.user };
        this.date = userInfo.user.birthday || '未知';
        if (userInfo.user.primary_dialect) {
          this.dialectIndex = this.dialectOptions.findIndex(
            (dialect) => dialect.id === userInfo.user.primary_dialect.id,
          );
        }
      } catch (error) {
        this.loadError = error?.message || '资料加载失败';
      } finally {
        this.loading = false;
      }
    },
    async persistUser(nextUser) {
      if (this.saving) return;
      this.saving = true;
      this.saveError = '';
      try {
        const res = await request.put(
          `/users/${app.globalData.id}`,
          { user: nextUser },
          true,
        );
        if (res.token) uni.setStorageSync('token', res.token);
        this.user = { ...(res.user || nextUser) };
        app.globalData.userInfo = this.user;
        notifySuccess('修改成功');
      } catch (error) {
        this.saveError = fieldErrorMessage(error, 'primary_dialect')
          || fieldErrorMessage(error, 'telephone')
          || fieldErrorMessage(error, 'avatar')
          || '保存失败';
        notify({ title: this.saveError });
      } finally {
        this.saving = false;
      }
    },
    async onChooseAvatar(e) {
      try {
        const { url } = await uploadFile(e.detail.avatarUrl);
        const userInfo = await getUserInfo(app.globalData.id);
        userInfo.user.avatar = url;
        await this.persistUser(userInfo.user);
      } catch (error) {
        this.saveError = fieldErrorMessage(error, 'avatar') || '头像更新失败';
      }
    },
    async changeDate(e) {
      this.date = e.detail.value;
      const userInfo = await getUserInfo(app.globalData.id);
      userInfo.user.birthday = e.detail.value;
      await this.persistUser(userInfo.user);
    },
    async dialectChange(e) {
      this.dialectIndex = Number(e.detail.value);
      const dialect = this.dialectOptions[this.dialectIndex];
      if (!dialect) return;
      const userInfo = await getUserInfo(app.globalData.id);
      userInfo.user.primary_dialect_id = dialect.id;
      await this.persistUser(userInfo.user);
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
}

.hero-avatar {
  width: 168rpx;
  height: 168rpx;
  border-radius: var(--radius-pill);
  background: var(--surface-subtle-color);
}

.row {
  min-height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-bottom: 1px solid var(--border-color);
}

.row:last-child {
  border-bottom: 0;
}

.row-label {
  color: var(--text-color);
  font-size: var(--font-size-base);
  font-weight: 600;
}

.row-value {
  color: var(--muted-color);
  font-size: var(--font-size-sm);
}

.avatar-button {
  margin: 0;
  padding: 0;
  background: transparent;
  line-height: 0;
}

.avatar-button::after {
  border: 0;
}
</style>
