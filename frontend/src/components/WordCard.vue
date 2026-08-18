<template>
  <view
    v-if="word"
    class="word-card"
  >
    <view class="word-kicker">
      关联义项
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
        进义项
      </button>
    </view>
  </view>
</template>

<script>
import { goFlavorDetail } from '@/services/navigation';
import { playManaged, stopAudio } from '@/utils/audio';

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
      stopAudio();
      this.listening = true;
      playManaged(this.audioUrl, {
        onEnded: () => {
          this.listening = false;
        },
      });
    },
    openWord() {
      this.$emit('open', this.word);
      if (this.word?.id) goFlavorDetail(this.word.id);
    },
  },
};
</script>

<style scoped>
.word-card {
  margin-top: 22rpx;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--accent-subtle-color);
}

.word-kicker {
  color: var(--warning-color);
  font-size: var(--font-size-xs);
  font-weight: 800;
  letter-spacing: 3rpx;
}

.word-title {
  margin-top: 10rpx;
  font-size: var(--font-size-xl);
  font-weight: 900;
}

.word-dialect,
.word-gloss,
.word-error {
  margin-top: 8rpx;
  color: var(--text-secondary-color);
  font-size: var(--font-size-xs);
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
  border-radius: var(--radius-pill);
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  color: var(--accent-color);
  font-size: var(--font-size-xs);
}

.action.primary {
  background: var(--accent-color);
  color: var(--on-accent-color);
  border-color: var(--accent-color);
}

.action::after,
.retry::after {
  border: 0;
}

.retry {
  display: inline-block;
  margin-left: 12rpx;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--surface-color);
  color: var(--accent-color);
  font-size: var(--font-size-xs);
  line-height: 44rpx;
}
</style>
