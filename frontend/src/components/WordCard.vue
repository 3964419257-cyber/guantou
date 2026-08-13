<template>
  <view
    v-if="word"
    class="word-card"
  >
    <view class="word-kicker">
      关联词条
    </view>
    <view class="word-title">
      {{ word.text }}
    </view>
    <view
      v-if="word.dialect"
      class="word-dialect"
    >
      {{ word.dialect }}
    </view>
    <view
      v-if="word.gloss"
      class="word-gloss"
    >
      {{ word.gloss }}
    </view>
    <view
      v-if="loadError"
      class="word-error"
    >
      {{ loadError }}
      <button
        class="retry"
        @tap="$emit('retry')"
      >
        重试
      </button>
    </view>
    <view class="word-actions">
      <button
        class="action"
        :disabled="!canListen || listening"
        @tap="listen"
      >
        {{ listening ? '播放中…' : '听词典发音' }}
      </button>
      <button
        class="action primary"
        @tap="openWord"
      >
        进词条
      </button>
    </view>
  </view>
</template>

<script>
import { playAudio, stopAudioChannel } from '@/utils/audio';

export default {
  name: 'WordCard',
  props: {
    word: {
      type: Object,
      default: null,
    },
    /** 词典无独立音频时，回退播放关联罐头 */
    audioUrl: {
      type: String,
      default: '',
    },
    loadError: {
      type: String,
      default: '',
    },
  },
  emits: ['open', 'retry'],
  data() {
    return {
      listening: false,
    };
  },
  computed: {
    canListen() {
      return Boolean(this.audioUrl);
    },
  },
  methods: {
    listen() {
      if (!this.audioUrl) {
        uni.showToast({ title: '暂无词典发音', icon: 'none' });
        return;
      }
      stopAudioChannel('can');
      this.listening = true;
      playAudio(this.audioUrl, false, {
        channel: 'dictionary',
        onEnded: () => {
          this.listening = false;
        },
        onStop: () => {
          this.listening = false;
        },
        onPause: () => {
          this.listening = false;
        },
      });
    },
    openWord() {
      this.$emit('open', this.word);
      if (this.word?.id) {
        uni.navigateTo({ url: `/pages/flavors/details?id=${this.word.id}` });
      }
    },
  },
};
</script>

<style scoped>
.word-card {
  margin-top: 22rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  border: 1px solid #e2c9b0;
  background: #fff8f1;
}

.word-kicker {
  color: #885331;
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 3rpx;
}

.word-title {
  margin-top: 10rpx;
  font-size: 36rpx;
  font-weight: 900;
}

.word-dialect,
.word-gloss,
.word-error {
  margin-top: 8rpx;
  color: #6b5a4a;
  font-size: 24rpx;
  line-height: 1.5;
}

.word-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-top: 18rpx;
}

.action {
  margin: 0;
  border-radius: 999rpx;
  background: #fff;
  border: 1px solid #d8c3ad;
  color: #7b4f2f;
  font-size: 24rpx;
}

.action.primary {
  background: #7b4f2f;
  color: #fff;
  border-color: #7b4f2f;
}

.action::after,
.retry::after {
  border: 0;
}

.retry {
  display: inline-block;
  margin-left: 12rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #7b4f2f;
  font-size: 22rpx;
  line-height: 44rpx;
}
</style>
