<template>
  <view
    v-if="visible"
    class="source-bar"
    :class="kindClass"
  >
    <view
      v-if="unavailable"
      class="source-unavailable"
      @tap="toastUnavailable"
    >
      原内容已无法查看
    </view>
    <template v-else>
      <view
        class="source-main"
        @tap="openSource"
      >
        <view class="source-kicker">
          {{ kicker }}
        </view>
        <view class="source-title">
          {{ title }}
        </view>
        <view
          v-if="snippet"
          class="source-snippet"
        >
          {{ snippet }}
        </view>
        <view
          v-if="miniMeta"
          class="source-meta"
        >
          {{ miniMeta }}
        </view>
      </view>
      <button
        v-if="miniAudioUrl"
        class="mini-play"
        @tap.stop="playMini"
      >
        ▶
      </button>
    </template>
  </view>
</template>

<script>
import { goCanDetail, goPostDetail } from '@/services/navigation';
import { playManaged, stopAudio } from '@/utils/audio';

export default {
  name: 'PostSourceBar',
  props: {
    useSameFrom: {
      type: Object,
      default: null,
    },
    forwardFrom: {
      type: Object,
      default: null,
    },
  },
  computed: {
    visible() {
      return Boolean(this.useSameFrom || this.forwardFrom);
    },
    unavailable() {
      const source = this.useSameFrom || this.forwardFrom || {};
      return Boolean(source.sourceUnavailable || source.source_unavailable);
    },
    kindClass() {
      return this.forwardFrom ? 'forward' : 'use-same';
    },
    kicker() {
      return this.forwardFrom ? '转发' : '同款';
    },
    title() {
      if (this.forwardFrom) {
        return `转发了 @${this.forwardFrom.authorName || this.forwardFrom.author_name || '某人'} 的表达`;
      }
      const name = this.useSameFrom?.authorName
        || this.useSameFrom?.author_name
        || '原作者';
      return `使用了 @${name} 的罐头`;
    },
    snippet() {
      if (this.forwardFrom) {
        return this.forwardFrom.snippet || this.forwardFrom.canSubtitle || '';
      }
      return this.useSameFrom?.subtitle || this.useSameFrom?.canSubtitle || '';
    },
    miniMeta() {
      const duration = this.useSameFrom?.durationMs || this.useSameFrom?.duration_ms;
      if (!duration) return '';
      return `${Math.max(1, Math.round(Number(duration) / 1000))} 秒`;
    },
    miniAudioUrl() {
      return this.useSameFrom?.audioUrl
        || this.useSameFrom?.audio_url
        || this.forwardFrom?.audioUrl
        || '';
    },
  },
  methods: {
    toastUnavailable() {
      uni.showToast({ title: '原内容已无法查看', icon: 'none' });
    },
    openSource() {
      if (this.unavailable) {
        this.toastUnavailable();
        return;
      }
      if (this.forwardFrom?.postId || this.forwardFrom?.post_id) {
        const postId = this.forwardFrom.postId || this.forwardFrom.post_id;
        goPostDetail(postId);
        return;
      }
      const sourcePostId = this.useSameFrom?.sourcePostId
        || this.useSameFrom?.source_post_id;
      if (sourcePostId) {
        goPostDetail(sourcePostId);
        return;
      }
      const canId = this.useSameFrom?.canId || this.useSameFrom?.can_id;
      if (canId) {
        goCanDetail(canId);
        return;
      }
      uni.showToast({ title: '暂无法查看', icon: 'none' });
    },
    playMini() {
      if (!this.miniAudioUrl) return;
      stopAudio();
      playManaged(this.miniAudioUrl);
    },
  },
};
</script>

<style scoped>
.source-bar {
  display: flex;
  align-items: stretch;
  gap: 12rpx;
  margin-top: 22rpx;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--surface-subtle-color);
}

.source-bar.use-same {
  border-left: 8rpx solid var(--accent-color);
}

.source-bar.forward {
  border-left: 8rpx solid var(--warning-color);
  background: var(--accent-subtle-color);
}

.source-main {
  min-width: 0;
  flex: 1;
}

.source-kicker {
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
  color: var(--muted-color);
}

.source-bar.forward .source-kicker {
  color: var(--warning-color);
}

.source-title {
  margin-top: 8rpx;
  font-size: var(--font-size-md);
  font-weight: 800;
  color: var(--text-color);
}

.source-snippet,
.source-meta,
.source-unavailable {
  margin-top: 8rpx;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.source-unavailable {
  color: var(--muted-color);
}

.mini-play {
  align-self: center;
  margin: 0;
  width: 64rpx;
  height: 64rpx;
  padding: 0;
  border-radius: 50%;
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-xs);
  line-height: 64rpx;
}

.mini-play::after {
  border: 0;
}
</style>
