<template>
  <AppShell
    title="我的乡音档案"
    active="me"
  >
    <view
      class="page"
      :class="`theme-${resolvedTheme}`"
    >
      <template v-if="loggedIn">
        <view
          v-if="loading"
          class="state-card"
        >
          正在读取你的乡音档案…
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
              :src="avatar"
              class="avatar"
              mode="aspectFill"
              @tap="toUserInfoPage"
            />
            <view>
              <view class="name">
                {{ nickname || '未填写昵称' }}
              </view>
              <view
                v-if="primaryDialect"
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
          </view>

          <view class="stats">
            <view
              class="stat"
              @tap="toCanLibrary"
            >
              <view class="number">
                {{ cansCount }}
              </view>
              <view class="label">
                罐头
              </view>
            </view>
            <view class="stat">
              <view class="number">
                {{ flavorsCount }}
              </view>
              <view class="label">
                义项
              </view>
            </view>
            <view class="stat">
              <view class="number">
                {{ nameplatesCount }}
              </view>
              <view class="label">
                铭牌
              </view>
            </view>
          </view>

          <view class="menu">
            <view
              class="menu-item"
              @tap="toCanLibrary"
            >
              我的罐头库
              <text class="menu-meta">
                录制 · 收藏 · 草稿
              </text>
            </view>
            <view
              class="menu-item"
              @tap="toCreate"
            >
              装一罐
            </view>
            <view
              class="menu-item"
              @tap="toDrafts"
            >
              草稿箱
              <text class="menu-meta">
                {{ draftsCount }} 条
              </text>
            </view>
            <view
              class="menu-item"
              @tap="toMailsPage"
            >
              我的消息
              <text
                v-if="unreadMailsCount > 0"
                class="badge"
              >
                {{ unreadMailsCount }}
              </text>
            </view>
            <view
              class="menu-item"
              @tap="toUserInfoPage"
            >
              个人资料
            </view>
            <view
              class="menu-item"
              @tap="toChangePasswordPage"
            >
              修改密码
            </view>
            <view
              class="menu-item"
              @tap="bindingWechat"
            >
              {{ wechatBindText }}
            </view>
            <view
              class="menu-item danger"
              @tap="exit"
            >
              退出登录
            </view>
          </view>
        </template>
        <ThemeSwitcher />
      </template>

      <view
        v-else
        class="guest-profile"
      >
        <view class="guest-mark">
          乡
        </view>
        <view class="guest-title">
          还没有登录
        </view>
        <view class="guest-copy">
          登录后可以查看自己的罐头、草稿和贡献记录。查词与收听公开乡音无需登录。
        </view>
        <BaseButton
          class="guest-action login-button"
          block
          @click="openLoginFromMine"
        >
          登录 / 注册
        </BaseButton>
        <BaseButton
          class="guest-action"
          variant="ghost"
          block
          @click="toSearch"
        >
          先去查词
        </BaseButton>
        <ThemeSwitcher />
      </view>
    </view>
  </AppShell>
</template>

<script>
import AppShell from '@/components/AppShell.vue';
import BaseButton from '@/components/BaseButton.vue';
import confirmDialog from '@/components/ConfirmDialog';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';
import { notify, notifySuccess } from '@/services/feedback';
import { openLoginFromMine } from '@/services/authJourney';
import { applyTheme, getThemePreference } from '@/services/theme';
import { listCanDrafts } from '@/services/canDrafts';
import {
  goCanLibrary,
  goCreateCan,
  goHome,
  goMails,
  goSearch,
  goUserInformation,
  goUserPassword,
} from '@/services/navigation';
import {
  bindingWechat as bindingWechatService,
  cancelBindingWechat as cancelBindingWechatService,
  clearUserInfo,
  getUserInfo,
} from '@/services/user';

const app = getApp();

export default {
  components: { AppShell, BaseButton, ThemeSwitcher },
  data() {
    return {
      id: '',
      avatar: '',
      nickname: '',
      primaryDialect: null,
      cansCount: 0,
      flavorsCount: 0,
      nameplatesCount: 0,
      draftsCount: 0,
      unreadMailsCount: 0,
      wechatBindText: '绑定微信',
      isBinding: false,
      loading: false,
      loadError: '',
      loggedIn: Boolean(uni.getStorageSync('token')),
      resolvedTheme: 'light',
    };
  },
  computed: {
    locationText() {
      return this.primaryDialect?.qualified_code || '未填写方言点';
    },
  },
  mounted() {
    this.handleThemeChange(applyTheme(getThemePreference()));
    uni.$on('theme-change', this.handleThemeChange);
  },
  beforeUnmount() {
    uni.$off('theme-change', this.handleThemeChange);
  },
  beforeMount() {
    this.getInfo();
  },
  onShow() {
    this.loggedIn = Boolean(uni.getStorageSync('token'));
    this.refreshDraftsCount();
    if (this.loggedIn) this.getInfo();
  },
  methods: {
    toMailsPage() {
      goMails();
    },
    toChangePasswordPage() {
      goUserPassword();
    },
    toUserInfoPage() {
      goUserInformation();
    },
    openLoginFromMine,
    toSearch() {
      goSearch();
    },
    toCreate() {
      goCreateCan();
    },
    toDrafts() {
      goCanLibrary({ tab: 'drafts' });
    },
    refreshDraftsCount() {
      this.draftsCount = listCanDrafts().length;
    },
    toCanLibrary() {
      goCanLibrary();
    },
    handleThemeChange(theme) {
      this.resolvedTheme = theme?.resolved || 'light';
    },
    async getInfo() {
      if (!app.globalData.id) return;
      this.loading = true;
      this.loadError = '';
      try {
        const userInfo = await getUserInfo(app.globalData.id);
        this.id = userInfo.user.id;
        this.avatar = userInfo.user.avatar;
        this.nickname = userInfo.user.nickname || userInfo.user.username;
        this.primaryDialect = userInfo.user.primary_dialect;
        this.cansCount = userInfo.contribution.cans_uploaded || 0;
        this.flavorsCount = userInfo.contribution.flavors_uploaded || 0;
        this.nameplatesCount = userInfo.contribution.nameplates || 0;
        this.unreadMailsCount = userInfo.notification
          ? userInfo.notification.statistics.unread
          : 0;
        this.wechatBindText = userInfo.user.wechat ? '解绑微信' : '绑定微信';
      } catch (error) {
        this.loadError = error?.message || '档案加载失败';
      } finally {
        this.loading = false;
      }
    },
    async exit() {
      const confirmed = await confirmDialog({
        title: '退出登录？',
        content: '退出后将回到游客模式，本地草稿仍会保留。',
        confirmText: '退出',
        danger: true,
      });
      if (!confirmed) return;
      clearUserInfo();
      goHome(true);
      notifySuccess('登出成功');
    },
    async bindingWechat() {
      if (this.isBinding || !app.globalData.id) return;
      this.isBinding = true;
      try {
        const userInfo = await getUserInfo(app.globalData.id);
        if (!userInfo.user.wechat) {
          // #ifndef MP-WEIXIN
          notify({ title: '请在微信小程序中绑定微信' });
          // #endif
          // #ifdef MP-WEIXIN
          await bindingWechatService(app.globalData.id, false);
          notifySuccess('绑定成功');
          // #endif
        } else {
          await cancelBindingWechatService(app.globalData.id);
          notifySuccess('解绑成功');
        }
        await this.getInfo();
      } catch (err) {
        notify({ title: (err && err.message) || '操作失败' });
      } finally {
        this.isBinding = false;
      }
    },
  },
};
</script>

<style scoped>
.page {
  color: var(--text-color);
}

.state-card,
.guest-profile {
  padding: var(--space-4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--surface-color);
  box-sizing: border-box;
}

.state-card {
  color: var(--text-secondary-color);
}

.state-action {
  margin-top: var(--space-3);
}

.guest-profile {
  max-width: 620rpx;
  margin: 8vh auto 0;
  text-align: center;
}

.guest-mark {
  width: 112rpx;
  height: 112rpx;
  margin: 0 auto;
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-xl);
  font-weight: 800;
  line-height: 112rpx;
}

.guest-title {
  margin-top: var(--space-3);
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.guest-copy {
  margin-top: var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  line-height: 1.65;
}

.guest-action {
  margin-top: var(--space-3);
}

.profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: var(--radius-pill);
  background: var(--surface-subtle-color);
}

.name {
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.meta {
  margin-top: var(--space-1);
  color: var(--muted-color);
}

.dialect-badge {
  display: inline-flex;
  margin-top: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--accent-subtle-color);
  color: var(--accent-color);
  font-size: var(--font-size-xs);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.stat,
.menu {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.stat {
  padding: var(--space-3) var(--space-2);
  text-align: center;
}

.number {
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--accent-color);
}

.label {
  margin-top: var(--space-1);
  color: var(--muted-color);
}

.menu {
  margin-top: var(--space-4);
  overflow: hidden;
}

.menu-item {
  min-height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--border-color);
}

.menu-item:last-child {
  border-bottom: 0;
}

.danger {
  color: var(--danger-color);
}

.badge {
  min-width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
  color: var(--on-danger-color);
  background: var(--danger-color);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
}

.menu-meta {
  color: var(--muted-color);
  font-size: var(--font-size-sm);
}
</style>
