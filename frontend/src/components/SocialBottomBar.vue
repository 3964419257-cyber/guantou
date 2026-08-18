<template>
  <view class="bottom-bar">
    <button
      class="bar-btn"
      :class="{ active: liked }"
      :disabled="likeBusy"
      @tap="$emit('like')"
    >
      {{ liked ? '♥' : '♡' }} {{ likeCount }}
    </button>
    <button
      class="bar-btn"
      @tap="$emit('comment')"
    >
      评 {{ commentCount }}
    </button>
    <button
      class="bar-btn"
      :disabled="repostBusy"
      @tap="$emit('repost')"
    >
      转
    </button>
    <button
      class="bar-btn"
      @tap="$emit('use-same')"
    >
      用同款
    </button>
    <button
      class="bar-btn"
      @tap="$emit('share')"
    >
      分享
    </button>
  </view>
</template>

<script>
export default {
  name: 'SocialBottomBar',
  props: {
    liked: {
      type: Boolean,
      default: false,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    likeBusy: {
      type: Boolean,
      default: false,
    },
    repostBusy: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['like', 'comment', 'repost', 'use-same', 'share'],
};
</script>

<style scoped>
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8rpx;
  padding: 12rpx 16rpx calc(12rpx + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-color);
  background: var(--surface-color);
  box-sizing: border-box;
}

.bar-btn {
  margin: 0;
  padding: 0;
  border-radius: 999rpx;
  background: var(--surface-subtle-color);
  color: var(--text-secondary-color);
  font-size: 22rpx;
  line-height: 64rpx;
}

.bar-btn.active {
  background: var(--accent-subtle-color);
  color: var(--accent-color);
  font-weight: 700;
}

.bar-btn::after {
  border: 0;
}
</style>
