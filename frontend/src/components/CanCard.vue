<template>
  <view
    class="can-card"
    @tap="$emit('open', can.id)"
  >
    <view
      v-if="social && can.recorder"
      class="author-row"
      @tap.stop="$emit('author', can.recorder.id)"
    >
      <image
        class="author-avatar"
        :src="can.recorder.avatar"
        mode="aspectFill"
      />
      <view class="author-main">
        <view class="author-name-row">
          <text class="author-name">
            {{ can.recorder.nickname || can.recorder.username }}
          </text>
          <DialectBadge :dialect="authorDialect" />
        </view>
        <text
          v-if="relativeTime"
          class="author-time"
        >
          {{ relativeTime }}
        </text>
      </view>
      <button
        class="follow-chip"
        :disabled="followBusy"
        @tap.stop="followAuthor"
      >
        关注
      </button>
    </view>

    <view class="card-head">
      <text class="label">
        {{ primaryText }}
      </text>
      <text class="status">
        {{ statusText(can.status) }}
      </text>
    </view>
    <view class="concept">
      {{ can.concept_text || '未填写普通话概念' }}
    </view>
    <view
      v-if="wordLabel"
      class="word-chip"
      @tap.stop="openWord"
    >
      词：{{ wordLabel }}
    </view>
    <view class="meta">
      <DialectBadge :dialect="can.submitted_dialect" />
      <text class="meta-copy">
        {{ nameplateCount }} 张铭牌 · {{ can.views || 0 }} 次查看
      </text>
    </view>
    <button
      class="play-button"
      :disabled="!can.audio_url"
      @tap.stop="play"
    >
      <text class="play-icon">
        ▶
      </text>
      <text>{{ can.audio_url ? `听乡音${durationText}` : '暂无可播放音频' }}</text>
    </button>
    <view
      v-if="subtitleLine"
      class="subtitle-line"
    >
      {{ subtitleLine }}
    </view>
    <view
      v-if="social"
      class="social-actions"
    >
      <button
        class="social-button"
        :class="{ active: liked }"
        :disabled="likeBusy"
        @tap.stop="toggleLike"
      >
        {{ liked ? '♥' : '♡' }} {{ likeCount }}
      </button>
      <button
        class="social-button"
        @tap.stop="$emit('comment', can.id)"
      >
        评 {{ can.comment_count || 0 }}
      </button>
      <button
        class="social-button"
        :disabled="repostBusy"
        @tap.stop="repost"
      >
        {{ repostBusy ? '…' : '转' }}
      </button>
      <button
        class="social-button"
        @tap.stop="useSame"
      >
        用同款 {{ can.use_count || 0 }}
      </button>
      <button
        class="social-button"
        open-type="share"
        @tap.stop="share"
      >
        分享
      </button>
    </view>
    <view
      v-if="ownerActions"
      class="owner-actions"
    >
      <button @tap.stop="useSame">
        用同款
      </button>
      <button
        class="danger"
        @tap.stop="$emit('delete', can)"
      >
        删除
      </button>
    </view>
  </view>
</template>

<script>
import DialectBadge from '@/components/DialectBadge.vue';
import { playAudio } from '@/utils/audio';
import { requireAuth } from '@/services/authGuard';
import { likeCan, repostCan, unlikeCan } from '@/services/canSocial';
import { startUseSame } from '@/services/canPostJourney';
import { notify, notifySuccess } from '@/services/feedback';
import { followUser } from '@/services/following';
import { shareCanOnWeb } from '@/utils/shareCan';

const statusLabels = {
  unlabeled: '无铭牌',
  pending: '待校验',
  tentative: '社区暂定',
  verified: '正品认证',
  disputed: '有争议',
  rejected: '已驳回',
};

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(0, 16);
  }
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return String(value).replace('T', ' ').slice(0, 10);
}

export default {
  name: 'CanCard',
  components: { DialectBadge },
  props: {
    can: {
      type: Object,
      required: true,
    },
    social: {
      type: Boolean,
      default: false,
    },
    ownerActions: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['author', 'comment', 'delete', 'open', 'reuse', 'share'],
  data() {
    return {
      likeBusy: false,
      followBusy: false,
      repostBusy: false,
      liked: Boolean(this.can.liked_by_me),
      likeCount: Number(this.can.like_count || 0),
    };
  },
  computed: {
    primaryText() {
      return this.can.primary_nameplate
        ? this.can.primary_nameplate.display_text
        : '等待铭牌';
    },
    wordLabel() {
      return this.can.primary_nameplate?.display_text || '';
    },
    authorDialect() {
      return this.can.recorder?.primary_dialect || this.can.submitted_dialect || null;
    },
    nameplateCount() {
      return this.can.nameplate_count || 0;
    },
    durationText() {
      const durationMs = Number(this.can.duration_ms || 0);
      if (!durationMs) return '';
      return ` · ${Math.max(1, Math.round(durationMs / 1000))} 秒`;
    },
    relativeTime() {
      return formatRelativeTime(this.can.created_at);
    },
    subtitleLine() {
      const text = String(this.can.concept_text || '').trim();
      if (!text) return '';
      return text.length > 28 ? `${text.slice(0, 28)}…` : text;
    },
  },
  mounted() {
    if (typeof uni !== 'undefined' && uni.$on) {
      uni.$on('can-like-changed', this.onCanLikeChanged);
    }
  },
  beforeUnmount() {
    if (typeof uni !== 'undefined' && uni.$off) {
      uni.$off('can-like-changed', this.onCanLikeChanged);
    }
  },
  methods: {
    play() {
      playAudio(this.can.audio_url, false, { channel: 'can' });
    },
    statusText(status) {
      return statusLabels[status] || status || '未知';
    },
    openWord() {
      const flavorId = this.can.primary_nameplate?.flavor?.id
        || this.can.primary_nameplate?.flavor_id;
      if (flavorId) {
        uni.navigateTo({ url: `/pages/flavors/details?id=${flavorId}` });
        return;
      }
      if (this.wordLabel) {
        uni.navigateTo({
          url: `/pages/search?q=${encodeURIComponent(this.wordLabel)}`,
        });
      }
    },
    onCanLikeChanged(payload = {}) {
      if (Number(payload.canId) !== Number(this.can.id)) return;
      this.liked = Boolean(payload.liked);
      this.likeCount = Number(payload.likeCount || 0);
    },
    async toggleLike() {
      if (!requireAuth('like', { page: 'can_detail', canId: this.can.id })) return;
      if (this.likeBusy) return;
      const previousLiked = this.liked;
      const previousCount = this.likeCount;
      this.liked = !previousLiked;
      this.likeCount = Math.max(0, previousCount + (this.liked ? 1 : -1));
      this.likeBusy = true;
      try {
        const response = previousLiked
          ? await unlikeCan(this.can.id)
          : await likeCan(this.can.id);
        this.liked = response.liked;
        this.likeCount = response.like_count;
        if (typeof uni !== 'undefined' && uni.$emit) {
          uni.$emit('can-like-changed', {
            canId: Number(this.can.id),
            liked: this.liked,
            likeCount: this.likeCount,
          });
        }
      } catch (error) {
        this.liked = previousLiked;
        this.likeCount = previousCount;
        notify({ title: (error && error.message) || '点赞失败' });
      } finally {
        this.likeBusy = false;
      }
    },
    async repost() {
      if (!requireAuth('repost', { page: 'can_feed', canId: this.can.id })) return;
      if (this.repostBusy) return;
      this.repostBusy = true;
      try {
        await repostCan(this.can.id);
        notifySuccess('转发成功');
      } catch (error) {
        notify({ title: (error && error.message) || '转发失败' });
      } finally {
        this.repostBusy = false;
      }
    },
    async share() {
      this.$emit('share', this.can);
      // #ifdef H5
      await shareCanOnWeb(this.can);
      // #endif
    },
    useSame() {
      this.$emit('reuse', this.can.id);
      startUseSame(this.can.id, { page: 'can_feed' });
    },
    async followAuthor() {
      const userId = this.can.recorder && this.can.recorder.id;
      if (!userId || this.followBusy) return;
      if (!requireAuth('follow', { page: 'can_feed', userId })) return;
      this.followBusy = true;
      try {
        await followUser(userId);
        notifySuccess('已关注');
      } catch (error) {
        notify({ title: (error && error.message) || '关注失败' });
      } finally {
        this.followBusy = false;
      }
    },
  },
};
</script>

<style scoped>
.can-card {
  background: #fff;
  border: 1px solid #e1e6dc;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 18rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  align-items: center;
  margin-top: 14rpx;
}

.label {
  min-width: 0;
  font-size: 34rpx;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.status {
  flex: 0 0 auto;
  font-size: 24rpx;
  color: #1f5c43;
  background: #e8f1eb;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}

.concept {
  margin-top: 14rpx;
  color: #33463b;
}

.word-chip {
  display: inline-flex;
  margin-top: 12rpx;
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
  background: #f3ebe2;
  color: #7b4f2f;
  font-size: 22rpx;
  font-weight: 700;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: #58675e;
  font-size: 24rpx;
}

.author-avatar {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #e6ebe3;
}

.author-main {
  min-width: 0;
  flex: 1;
}

.author-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.author-name {
  min-width: 0;
  font-weight: 700;
}

.author-time {
  display: block;
  margin-top: 4rpx;
  color: #8a958c;
  font-size: 20rpx;
}

.follow-chip {
  margin: 0;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #e8f1eb;
  color: #1f5c43;
  font-size: 22rpx;
  line-height: 48rpx;
}

.follow-chip::after {
  border: 0;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  color: #657168;
  font-size: 22rpx;
}

.meta-copy {
  margin-left: 4rpx;
}

.play-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin-top: 18rpx;
  border-radius: 999rpx;
  background: #1f5c43;
  color: #fff;
  font-size: 26rpx;
}

.play-button::after {
  border: 0;
}

.play-button[disabled] {
  opacity: 0.55;
}

.subtitle-line {
  margin-top: 12rpx;
  color: #7a867d;
  font-size: 22rpx;
}

.social-actions,
.owner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 16rpx;
}

.social-button,
.owner-actions button {
  margin: 0;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #f3f6f1;
  color: #355445;
  font-size: 22rpx;
  line-height: 52rpx;
}

.social-button.active {
  background: #e8f1eb;
  color: #1f5c43;
  font-weight: 700;
}

.social-button.placeholder {
  opacity: 0.45;
}

.social-button::after,
.owner-actions button::after {
  border: 0;
}

.owner-actions .danger {
  background: #f8ece8;
  color: #8b4438;
}
</style>
