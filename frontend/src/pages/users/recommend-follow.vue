<template>
  <PageShell
    title="推荐关注"
    :show-back="false"
  >
    <view class="intro-card">
      <view class="step-mark">
        冷启动 · 推荐关注
      </view>
      <view class="intro-title">
        关注几位同方言的人，首页会更有意思
      </view>
      <view class="intro-copy">
        先关注几位说{{ dialectLabel }}的人，关注流就不会空
      </view>
      <view
        v-if="primaryDialect"
        class="primary-badge"
      >
        主方言 · {{ dialectLabel }}
      </view>
    </view>

    <view class="section-card creator-section">
      <view class="section-kicker">
        候选人
      </view>
      <view class="section-title">
        同方言作者 · 官方 · 圈主
      </view>
      <view class="section-hint">
        默认可选中若干高质量账号；也可全选或跳过。
      </view>
      <view
        v-if="loading"
        class="loading-copy"
      >
        正在读取推荐…
      </view>
      <view
        v-else-if="!candidates.length"
        class="empty-copy"
      >
        暂时没有可推荐的同方言作者。可以直接进入首页。
      </view>
      <view
        v-for="candidate in candidates"
        :key="candidate.id"
        :class="['creator-row', isAuthorSelected(candidate.id) ? 'selected' : '']"
        @tap="toggleAuthor(candidate.id)"
      >
        <image
          class="creator-avatar"
          :src="candidate.avatar"
          mode="aspectFill"
        />
        <view class="creator-copy">
          <view class="creator-name-row">
            <text class="creator-name">
              {{ candidate.nickname || candidate.username }}
            </text>
            <DialectBadge :dialect="candidate.primary_dialect" />
            <text
              v-if="candidate.role_label"
              class="role-chip"
            >
              {{ candidate.role_label }}
            </text>
          </view>
          <view class="creator-meta">
            {{ candidate.bio || `${candidate.public_can_count || 0} 罐公开乡音` }}
          </view>
        </view>
        <view class="creator-check">
          {{ isAuthorSelected(candidate.id) ? '已选' : '选择' }}
        </view>
      </view>
      <button
        v-if="candidates.length"
        class="select-all"
        @tap="toggleSelectAll"
      >
        {{ allSelected ? '取消全选' : '全选推荐' }}
      </button>
    </view>

    <view class="actions">
      <button
        class="secondary-button"
        :disabled="saving"
        @tap="skip"
      >
        跳过
      </button>
      <button
        class="primary-button"
        :disabled="saving"
        @tap="save"
      >
        {{ saving ? '正在关注…' : actionText }}
      </button>
    </view>
  </PageShell>
</template>

<script>
import DialectBadge from '@/components/DialectBadge.vue';
import PageShell from '@/components/PageShell.vue';
import { goOnboarding } from '@/services/navigation';
import { toIndexPage } from '@/routers';
import {
  batchFollowUsers,
  listFollowRecommendations,
  markRecommendFollowSeen,
} from '@/services/following';

export default {
  components: { DialectBadge, PageShell },
  data() {
    const user = getApp().globalData.userInfo || {};
    return {
      candidates: [],
      loading: true,
      primaryDialect: user.primary_dialect || null,
      saving: false,
      selectedAuthorIds: [],
    };
  },
  computed: {
    dialectLabel() {
      return this.primaryDialect?.name
        || this.primaryDialect?.qualified_code
        || '你的方言';
    },
    allSelected() {
      return this.candidates.length > 0
        && this.candidates.every((item) => this.selectedAuthorIds.includes(item.id));
    },
    actionText() {
      const total = this.selectedAuthorIds.length;
      if (!total) return '进入首页';
      return `关注已选（${total}）`;
    },
  },
  async onLoad() {
    if (!this.primaryDialect?.id) {
      goOnboarding({ reason: 'missing_dialect' }, { reset: true });
      return;
    }
    try {
      const response = await listFollowRecommendations(this.primaryDialect.id);
      this.candidates = response.results || [];
      this.selectedAuthorIds = this.candidates.slice(0, 3).map((item) => item.id);
    } catch (error) {
      uni.showToast({ title: '推荐暂时加载失败，可以直接进入首页', icon: 'none' });
    } finally {
      this.loading = false;
    }
  },
  methods: {
    isAuthorSelected(id) {
      return this.selectedAuthorIds.includes(id);
    },
    toggleAuthor(id) {
      this.selectedAuthorIds = this.isAuthorSelected(id)
        ? this.selectedAuthorIds.filter((item) => item !== id)
        : [...this.selectedAuthorIds, id];
    },
    toggleSelectAll() {
      this.selectedAuthorIds = this.allSelected
        ? []
        : this.candidates.map((item) => item.id);
    },
    async save() {
      if (this.saving) return;
      this.saving = true;
      try {
        markRecommendFollowSeen();
        if (!this.selectedAuthorIds.length) {
          toIndexPage(true);
          return;
        }
        const { succeeded, failed } = await batchFollowUsers(this.selectedAuthorIds);
        if (failed.length) {
          uni.showToast({
            title: `成功 ${succeeded.length} 人，失败 ${failed.length} 人`,
            icon: 'none',
          });
        } else {
          uni.showToast({ title: `已关注 ${succeeded.length} 人`, icon: 'success' });
        }
        if (succeeded.length) {
          uni.showToast({ title: '去关注流看看他们', icon: 'none' });
        }
        toIndexPage(true);
      } finally {
        this.saving = false;
      }
    },
    skip() {
      markRecommendFollowSeen();
      toIndexPage(true);
    },
  },
};
</script>

<style scoped>
.intro-card,
.section-card {
  border: 1px solid #dce5d8;
  border-radius: 18rpx;
  background: #fff;
  padding: 28rpx;
}

.section-card {
  margin-top: 22rpx;
}

.step-mark,
.section-kicker {
  color: #885331;
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
}

.intro-title {
  margin-top: 14rpx;
  font-size: 40rpx;
  font-weight: 900;
  line-height: 1.3;
}

.section-title {
  margin-top: 10rpx;
  font-size: 32rpx;
  font-weight: 850;
}

.intro-copy,
.section-hint,
.loading-copy,
.empty-copy {
  margin-top: 12rpx;
  color: #607067;
  font-size: 25rpx;
  line-height: 1.6;
}

.primary-badge {
  display: inline-flex;
  margin-top: 20rpx;
  padding: 9rpx 18rpx;
  border-radius: 999rpx;
  background: #e9f2e8;
  color: #1f6549;
  font-size: 24rpx;
  font-weight: 800;
}

.creator-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 96rpx;
  border-bottom: 1px solid #edf0e9;
  box-sizing: border-box;
  padding: 12rpx 0;
}

.creator-row.selected {
  background: #f0f6ed;
}

.creator-copy {
  min-width: 0;
  flex: 1;
}

.creator-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
}

.creator-name {
  font-size: 28rpx;
  font-weight: 800;
}

.creator-meta {
  margin-top: 5rpx;
  color: #7a867d;
  font-size: 22rpx;
  overflow-wrap: anywhere;
}

.role-chip {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #f3ebe2;
  color: #885331;
  font-size: 18rpx;
  font-weight: 700;
}

.creator-check {
  flex: 0 0 auto;
  color: #1f6549;
  font-size: 22rpx;
  font-weight: 800;
}

.creator-section {
  margin-bottom: 26rpx;
}

.creator-avatar {
  width: 74rpx;
  height: 74rpx;
  border-radius: 50%;
  background: #e6ebe3;
}

.select-all {
  margin-top: 18rpx;
  border-radius: 999rpx;
  background: #f4f7f2;
  color: #1f6549;
  font-size: 24rpx;
}

.select-all::after {
  border: 0;
}

.actions {
  display: grid;
  grid-template-columns: 0.8fr 1.4fr;
  gap: 14rpx;
  padding-bottom: 34rpx;
}

.primary-button,
.secondary-button {
  width: 100%;
  margin: 0;
  border-radius: 999rpx;
  font-size: 26rpx;
}

.primary-button {
  background: #1f6549;
  color: #fff;
}

.secondary-button {
  border: 1px solid #cfd9cc;
  background: #fff;
  color: #315b49;
}

.primary-button::after,
.secondary-button::after {
  border: 0;
}
</style>
