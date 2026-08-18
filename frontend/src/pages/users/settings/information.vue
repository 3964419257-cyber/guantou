<template>
  <PageShell
    title="个人信息"
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
      <view class="card">
        <view class="row">
          <text class="row-label">
            头像
          </text>
          <button
            class="avatar-button"
            open-type="chooseAvatar"
            @chooseavatar="onChooseAvatar"
          >
            <image
              class="avatar"
              :src="user.avatar"
              mode="aspectFill"
            />
          </button>
        </view>
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
      </view>

      <view class="section-kicker">
        个人信息（将会默认公开）
      </view>
      <!--  #ifndef  MP-WEIXIN -->
      <view class="card">
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
      </view>
      <!--  #endif -->
      <view class="card">
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
      </view>
    </template>
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import PageShell from '@/components/PageShell.vue';
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
  components: { BaseButton, PageShell },
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
        uni.showToast({ title: '修改成功' });
      } catch (error) {
        this.saveError = fieldErrorMessage(error, 'primary_dialect')
          || fieldErrorMessage(error, 'telephone')
          || fieldErrorMessage(error, 'avatar')
          || '保存失败';
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
.state-card,
.card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
}

.state-card {
  padding: var(--space-4);
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

.section-kicker {
  margin: var(--space-4) 0 var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.card + .card {
  margin-top: var(--space-3);
}

.row {
  min-height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 0 var(--space-3);
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

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: var(--surface-subtle-color);
}
</style>
