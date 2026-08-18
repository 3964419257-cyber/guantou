<template>
  <PageShell
    title="用户"
    :back-fallback="ROUTES.home"
  >
    <view
      v-if="loading"
      class="state-card"
    >
      正在读取用户档案…
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
      <view class="profile">
        <image
          class="avatar"
          :src="userInfo.user.avatar"
          mode="aspectFill"
        />
        <view class="profile-copy">
          <view class="name">
            {{ userInfo.user.nickname || userInfo.user.username }}
          </view>
          <view
            v-if="userInfo.user.primary_dialect"
            class="dialect-badge"
          >
            {{ locationText }}
          </view>
          <view
            v-else
            class="meta"
          >
            未填写方言点
          </view>
        </view>
        <BaseButton
          v-if="!isSelf"
          size="small"
          :variant="userInfo.user.is_following ? 'ghost' : 'primary'"
          :disabled="followingBusy"
          :loading="followingBusy"
          @click="toggleFollow"
        >
          {{ userInfo.user.is_following ? '已关注' : '关注' }}
        </BaseButton>
      </view>
      <view class="social-stats">
        <text>{{ userInfo.user.follower_count }} 位关注者</text>
        <text>{{ userInfo.user.following_count }} 个关注</text>
      </view>
      <view class="stats">
        <view class="stat">
          <view class="number">
            {{ userInfo.contribution.cans_uploaded }}
          </view>
          <view class="label">
            罐头
          </view>
        </view>
        <view class="stat">
          <view class="number">
            {{ userInfo.contribution.flavors_uploaded }}
          </view>
          <view class="label">
            义项
          </view>
        </view>
        <view class="stat">
          <view class="number">
            {{ userInfo.contribution.nameplates }}
          </view>
          <view class="label">
            铭牌
          </view>
        </view>
      </view>
    </template>
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import PageShell from '@/components/PageShell.vue';
import { APP_NAME } from '@/const/branding';
import { requireAuth } from '@/services/authGuard';
import { followUser, unfollowUser } from '@/services/following';
import { ROUTES } from '@/services/navigation';
import { defaultMessage } from '@/services/shareMessages';
import { getUserInfo } from '@/services/user';

export default {
  components: { BaseButton, PageShell },
  data() {
    return {
      ROUTES,
      id: 0,
      loading: true,
      loadError: '',
      userInfo: {
        user: {
          avatar: '',
          nickname: '',
          username: '',
          primary_dialect: null,
          follower_count: 0,
          following_count: 0,
          is_following: false,
        },
        contribution: {
          cans_uploaded: 0,
          flavors_uploaded: 0,
          nameplates: 0,
        },
      },
      followingBusy: false,
    };
  },
  computed: {
    locationText() {
      return this.userInfo.user.primary_dialect?.qualified_code || '未填写方言点';
    },
    isSelf() {
      return Number(uni.getStorageSync('id')) === Number(this.id);
    },
  },
  async onLoad(options) {
    this.id = options.id;
    await this.getInfo();
  },
  onShareAppMessage() {
    return {
      title: `${APP_NAME}用户`,
      path: `/pages/users/details?id=${this.id}`,
      ...defaultMessage(),
    };
  },
  methods: {
    async getInfo() {
      if (!this.id) {
        this.loading = false;
        this.loadError = '缺少用户';
        return;
      }
      this.loading = true;
      this.loadError = '';
      try {
        this.userInfo = await getUserInfo(this.id);
      } catch (error) {
        this.loadError = error?.message || '用户档案加载失败';
      } finally {
        this.loading = false;
      }
    },
    async toggleFollow() {
      if (!requireAuth('follow', { page: 'user_detail', userId: this.id })) return;
      if (this.followingBusy) return;
      this.followingBusy = true;
      const wasFollowing = this.userInfo.user.is_following;
      try {
        if (wasFollowing) {
          await unfollowUser(this.id);
        } else {
          await followUser(this.id);
        }
        this.userInfo.user.is_following = !wasFollowing;
        this.userInfo.user.follower_count = Math.max(
          0,
          Number(this.userInfo.user.follower_count || 0) + (wasFollowing ? -1 : 1),
        );
      } catch {
        return;
      } finally {
        this.followingBusy = false;
      }
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

.profile {
  display: flex;
  align-items: center;
  gap: 22rpx;
}

.profile-copy {
  min-width: 0;
  flex: 1;
}

.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 64rpx;
  background: var(--surface-subtle-color);
}

.name {
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.meta {
  margin-top: 8rpx;
  color: var(--muted-color);
}

.dialect-badge {
  display: inline-flex;
  margin-top: 10rpx;
  padding: 7rpx 16rpx;
  border-radius: var(--radius-pill);
  background: var(--accent-subtle-color);
  color: var(--accent-color);
  font-size: 23rpx;
}

.social-stats {
  display: flex;
  gap: 28rpx;
  margin-top: var(--space-3);
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: var(--space-3);
}

.stat {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 24rpx 12rpx;
  text-align: center;
}

.number {
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--accent-color);
}

.label {
  margin-top: 8rpx;
  color: var(--muted-color);
}
</style>
