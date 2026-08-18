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
        return `转发了 @${this.forwardFrom.authorName || this.forwardFrom.author_name || '某人'} 的博文`;
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
        uni.navigateTo({ url: `/pages/posts/details?id=${postId}` });
        return;
      }
      const sourcePostId = this.useSameFrom?.sourcePostId
        || this.useSameFrom?.source_post_id;
      if (sourcePostId) {
        uni.navigateTo({ url: `/pages/posts/details?id=${sourcePostId}` });
        return;
      }
      const canId = this.useSameFrom?.canId || this.useSameFrom?.can_id;
      if (canId) {
        uni.navigateTo({ url: `/pages/cans/details?id=${canId}` });
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
  padding: 20rpx;
  border-radius: 14rpx;
  border: 1px solid #dce5d8;
  background: #f7faf5;
}

.source-bar.use-same {
  border-left: 8rpx solid #1f5c43;
}

.source-bar.forward {
  border-left: 8rpx solid #7b4f2f;
  background: #fff8f1;
}

.source-main {
  min-width: 0;
  flex: 1;
}

.source-kicker {
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
  color: #657168;
}

.source-bar.forward .source-kicker {
  color: #885331;
}

.source-title {
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 800;
  color: #1d2a24;
}

.source-snippet,
.source-meta,
.source-unavailable {
  margin-top: 8rpx;
  color: #657168;
  font-size: 22rpx;
  line-height: 1.45;
}

.source-unavailable {
  color: #8a958c;
}

.mini-play {
  align-self: center;
  margin: 0;
  width: 64rpx;
  height: 64rpx;
  padding: 0;
  border-radius: 50%;
  background: #1f5c43;
  color: #fff;
  font-size: 24rpx;
  line-height: 64rpx;
}

.mini-play::after {
  border: 0;
}
</style>
