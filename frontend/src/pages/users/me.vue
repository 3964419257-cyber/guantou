<template>
  <AppShell
    title="我的"
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
          <view class="hero">
            <image
              :src="avatar"
              class="avatar"
              mode="aspectFill"
              @tap="toUserInfoPage"
            />
            <view class="hero-copy">
              <view class="name">
                {{ nickname || '未填写昵称' }}
              </view>
              <view class="handle">
                乡声号 {{ username || '未设置' }}
              </view>
              <view class="bio">
                {{ bioText }}
              </view>
              <view class="meta-row">
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
                <view
                  v-if="titleLabel"
                  class="title-badge"
                >
                  {{ titleLabel }}
                </view>
              </view>
            </view>
          </view>

          <view class="social-stats">
            <view
              class="social-stat"
              @tap="toCanLibrary"
            >
              <view class="number">
                {{ cansCount }}
              </view>
              <view class="label">
                罐头
              </view>
            </view>
            <view class="social-stat">
              <view class="number">
                {{ followingCount }}
              </view>
              <view class="label">
                关注
              </view>
            </view>
            <view class="social-stat">
              <view class="number">
                {{ followerCount }}
              </view>
              <view class="label">
                粉丝
              </view>
            </view>
          </view>

          <view class="profile-actions">
            <view class="action-slot">
              <BaseButton
                variant="ghost"
                size="small"
                block
                @click="toUserInfoPage"
              >
                编辑资料
              </BaseButton>
            </view>
            <view class="action-slot">
              <BaseButton
                variant="ghost"
                size="small"
                block
                @click="toMailsPage"
              >
                {{ unreadMailsCount > 0 ? `消息 ${unreadMailsCount}` : '消息' }}
              </BaseButton>
            </view>
            <view class="action-slot">
              <BaseButton
                size="small"
                block
                @click="toCreate"
              >
                装一罐
              </BaseButton>
            </view>
          </view>

          <view
            v-if="followedDialects.length"
            class="dialect-follow"
          >
            <view class="section-kicker">
              关注的方言
            </view>
            <view class="chip-row">
              <view
                v-for="dialect in followedDialects"
                :key="dialect.id"
                class="dialect-badge"
              >
                {{ dialect.qualified_code || dialect.name }}
              </view>
            </view>
          </view>

          <view class="works">
            <view class="works-tabs">
              <view
                class="works-tab"
                :class="{ active: worksTab === 'cans' }"
                @tap="worksTab = 'cans'"
              >
                罐头 {{ cansCount }}
              </view>
              <view
                class="works-tab"
                :class="{ active: worksTab === 'nameplates' }"
                @tap="worksTab = 'nameplates'"
              >
                铭牌 {{ nameplatesCount }}
              </view>
              <view
                class="works-tab"
                :class="{ active: worksTab === 'flavors' }"
                @tap="worksTab = 'flavors'"
              >
                义项 {{ flavorsCount }}
              </view>
            </view>
            <view class="works-empty">
              <view class="works-empty-title">
                {{ worksPanelTitle }}
              </view>
              <view class="works-empty-copy">
                {{ worksPanelCopy }}
              </view>
              <BaseButton
                v-if="worksCount === 0 && worksTab === 'cans'"
                class="works-empty-action"
                block
                @click="toCreate"
              >
                去装一罐
              </BaseButton>
              <BaseButton
                v-else
                class="works-empty-action"
                variant="ghost"
                block
                @click="toCanLibrary"
              >
                打开罐头库
              </BaseButton>
            </view>
          </view>

          <view class="tool-grid">
            <view
              class="tool-item"
              @tap="toCanLibrary"
            >
              <view class="tool-count">
                {{ cansCount }}
              </view>
              <view class="tool-label">
                罐头库
              </view>
            </view>
            <view
              class="tool-item"
              @tap="toLikes"
            >
              <view class="tool-count">
                ·
              </view>
              <view class="tool-label">
                收藏
              </view>
            </view>
            <view
              class="tool-item"
              @tap="toDrafts"
            >
              <view class="tool-count">
                {{ draftsCount }}
              </view>
              <view class="tool-label">
                草稿箱
              </view>
            </view>
          </view>

          <view class="menu">
            <view class="section-kicker menu-kicker">
              账号与安全
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
          登录后可以装罐、看草稿和自己的贡献。公开乡音不用登录，先听也可以。
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
          @click="toHome"
        >
          先去听罐头
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
} from '@/services/user';
import { resolveSessionUserId } from '@/services/session';
import request from '@/utils/request';

export default {
  components: { AppShell, BaseButton, ThemeSwitcher },
  data() {
    return {
      id: '',
      avatar: '',
      nickname: '',
      username: '',
      titleLabel: '',
      primaryDialect: null,
      cansCount: 0,
      flavorsCount: 0,
      nameplatesCount: 0,
      followerCount: 0,
      followingCount: 0,
      draftsCount: 0,
      unreadMailsCount: 0,
      followedDialects: [],
      wechatBindText: '绑定微信',
      isBinding: false,
      loading: Boolean(uni.getStorageSync('token')),
      loadError: '',
      loggedIn: Boolean(uni.getStorageSync('token')),
      resolvedTheme: 'light',
      worksTab: 'cans',
    };
  },
  computed: {
    locationText() {
      return this.primaryDialect?.qualified_code || '未填写方言点';
    },
    bioText() {
      const dialect = this.locationText;
      if (this.titleLabel) return `${this.titleLabel} · ${dialect}`;
      return `在「${dialect}」装罐`;
    },
    worksCount() {
      if (this.worksTab === 'nameplates') return this.nameplatesCount;
      if (this.worksTab === 'flavors') return this.flavorsCount;
      return this.cansCount;
    },
    worksPanelTitle() {
      if (this.worksCount > 0) {
        if (this.worksTab === 'nameplates') return `已有 ${this.worksCount} 张铭牌`;
        if (this.worksTab === 'flavors') return `已有 ${this.worksCount} 个义项`;
        return `已有 ${this.worksCount} 罐`;
      }
      if (this.worksTab === 'nameplates') return '还没有贴铭牌';
      if (this.worksTab === 'flavors') return '还没有提交义项';
      return '还没有装罐';
    },
    worksPanelCopy() {
      if (this.worksCount > 0) {
        return '完整列表在罐头库，可按录制、收藏和草稿查看。';
      }
      if (this.worksTab === 'nameplates') {
        return '铭牌是你对某条罐头的写法、释义和出处主张。';
      }
      if (this.worksTab === 'flavors') {
        return '义项用来收纳“同一个意思在各地怎么说”。';
      }
      return '罐头是一段乡音录音。装一罐后会出现在这里和罐头库。';
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
    toHome() {
      goHome();
    },
    toCreate() {
      goCreateCan();
    },
    toDrafts() {
      goCanLibrary({ tab: 'drafts' });
    },
    toLikes() {
      goCanLibrary({ tab: 'liked' });
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
      const id = resolveSessionUserId();
      if (!id) {
        this.loading = false;
        if (!uni.getStorageSync('token')) this.loggedIn = false;
        return;
      }
      this.loading = true;
      this.loadError = '';
      try {
        const userInfo = await request.get(`/users/${id}`, null, true);
        this.id = userInfo.user.id;
        this.avatar = userInfo.user.avatar;
        this.username = userInfo.user.username || '';
        this.nickname = userInfo.user.nickname || userInfo.user.username;
        this.titleLabel = userInfo.user.title?.title || '';
        this.primaryDialect = userInfo.user.primary_dialect;
        this.cansCount = userInfo.contribution.cans_uploaded
          ?? userInfo.contribution.cans
          ?? 0;
        this.flavorsCount = userInfo.contribution.flavors_uploaded
          ?? userInfo.contribution.flavors
          ?? 0;
        this.nameplatesCount = userInfo.contribution.nameplates_uploaded
          ?? userInfo.contribution.nameplates
          ?? 0;
        this.followerCount = userInfo.user.follower_count || 0;
        this.followingCount = userInfo.user.following_count || 0;
        this.followedDialects = userInfo.user.followed_dialects || [];
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
      const id = resolveSessionUserId();
      if (this.isBinding || !id) return;
      this.isBinding = true;
      try {
        const userInfo = await request.get(`/users/${id}`, null, true);
        if (!userInfo.user.wechat) {
          // #ifndef MP-WEIXIN
          notify({ title: '请在微信小程序中绑定微信' });
          // #endif
          // #ifdef MP-WEIXIN
          await bindingWechatService(id, false);
          notifySuccess('绑定成功');
          // #endif
        } else {
          await cancelBindingWechatService(id);
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
  width: 160rpx;
  height: 160rpx;
  margin: 0 auto;
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-xl);
  font-weight: 800;
  line-height: 160rpx;
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

.hero {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.avatar {
  width: 168rpx;
  height: 168rpx;
  border-radius: var(--radius-pill);
  background: var(--surface-subtle-color);
  flex-shrink: 0;
}

.hero-copy {
  min-width: 0;
  flex: 1;
}

.name {
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.handle,
.bio,
.meta {
  margin-top: var(--space-1);
  color: var(--muted-color);
  font-size: var(--font-size-sm);
}

.bio {
  line-height: 1.5;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.dialect-badge,
.title-badge {
  display: inline-flex;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
}

.dialect-badge {
  background: var(--accent-subtle-color);
  color: var(--accent-color);
}

.title-badge {
  background: var(--surface-subtle-color);
  color: var(--text-secondary-color);
}

.social-stats {
  display: flex;
  margin-top: var(--space-4);
}

.social-stat {
  flex: 1;
}

.number {
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.label,
.tool-label {
  margin-top: var(--space-1);
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.profile-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.action-slot {
  flex: 1;
  min-width: 0;
}

.dialect-follow {
  margin-top: var(--space-4);
}

.section-kicker {
  margin-bottom: var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.works,
.tool-grid,
.menu {
  margin-top: var(--space-4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
  overflow: hidden;
}

.works-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.works-tab {
  flex: 1;
  padding: var(--space-3) 0;
  text-align: center;
  color: var(--muted-color);
  font-size: var(--font-size-sm);
}

.works-tab.active {
  color: var(--text-color);
  font-weight: 700;
  box-shadow: inset 0 -4rpx 0 var(--accent-color);
}

.works-empty {
  padding: var(--space-5) var(--space-3);
  text-align: center;
}

.works-empty-title {
  font-weight: 700;
}

.works-empty-copy {
  margin-top: var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.works-empty-action {
  margin-top: var(--space-3);
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: var(--space-3) 0;
}

.tool-item {
  position: relative;
  text-align: center;
}

.tool-count {
  font-size: var(--font-size-lg);
  font-weight: 800;
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

.menu-kicker {
  margin: var(--space-3) var(--space-3) 0;
}
</style>
