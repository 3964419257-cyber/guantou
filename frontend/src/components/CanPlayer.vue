<template>
  <view class="can-player">
    <view class="player-meta">
      <text
        v-if="dialectLabel"
        class="tag"
      >
        {{ dialectLabel }}
      </text>
      <text
        v-if="sceneLabel"
        class="tag muted"
      >
        {{ sceneLabel }}
      </text>
      <text class="time">
        {{ currentLabel }} / {{ durationLabel }}
      </text>
    </view>
    <view class="progress-track">
      <view
        class="progress-fill"
        :style="{ width: `${progressPercent}%` }"
      />
    </view>
    <button
      class="play-button"
      :disabled="!audioUrl"
      @tap="toggle"
    >
      {{ playing ? '暂停' : '▶ 播放完整乡音' }}
    </button>
    <view
      v-if="subtitle"
      class="subtitle"
    >
      {{ subtitle }}
    </view>
  </view>
</template>

<script>
import {
  getPlayingSrc,
  isAudioPlaying,
  pauseAudio,
  playAudio,
  stopAudioChannel,
} from '@/utils/audio';

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default {
  name: 'CanPlayer',
  props: {
    audioUrl: {
      type: String,
      default: '',
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    subtitle: {
      type: String,
      default: '',
    },
    dialectLabel: {
      type: String,
      default: '',
    },
    sceneLabel: {
      type: String,
      default: '',
    },
    channel: {
      type: String,
      default: 'can',
    },
    autoContinue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['play', 'pause', 'ended'],
  data() {
    return {
      playing: false,
      currentSeconds: 0,
      knownDuration: Math.max(0, Number(this.durationMs || 0) / 1000),
    };
  },
  computed: {
    progressPercent() {
      if (!this.knownDuration) return 0;
      return Math.min(100, (this.currentSeconds / this.knownDuration) * 100);
    },
    currentLabel() {
      return formatClock(this.currentSeconds);
    },
    durationLabel() {
      return formatClock(this.knownDuration || Number(this.durationMs || 0) / 1000);
    },
  },
  mounted() {
    if (this.autoContinue && this.audioUrl && getPlayingSrc() === this.audioUrl) {
      this.playing = isAudioPlaying(this.channel);
    }
  },
  beforeUnmount() {
    // 离开详情：暂停当前罐头，符合 §2.1 滑走暂停
    if (this.playing && getPlayingSrc() === this.audioUrl) {
      pauseAudio();
    }
  },
  methods: {
    toggle() {
      if (!this.audioUrl) {
        uni.showToast({ title: '暂无音频', icon: 'none' });
        return;
      }
      if (this.playing && getPlayingSrc() === this.audioUrl) {
        pauseAudio();
        this.playing = false;
        this.$emit('pause');
        return;
      }
      stopAudioChannel('dictionary');
      playAudio(this.audioUrl, false, {
        channel: this.channel,
        onPlay: () => {
          this.playing = true;
          this.$emit('play');
        },
        onPause: () => {
          this.playing = false;
          this.$emit('pause');
        },
        onEnded: () => {
          this.playing = false;
          this.currentSeconds = 0;
          this.$emit('ended');
        },
        onStop: () => {
          this.playing = false;
        },
        onTimeUpdate: ({ currentTime, duration }) => {
          this.currentSeconds = currentTime || 0;
          if (duration) this.knownDuration = duration;
        },
      });
      this.playing = true;
    },
  },
};
</script>

<style scoped>
.can-player {
  margin-top: 18rpx;
  padding: 22rpx;
  border-radius: 16rpx;
  background: #f3f7f2;
  border: 1px solid #dce5d8;
}

.player-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10rpx;
}

.tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #e7f1eb;
  color: #1f5c43;
  font-size: 20rpx;
  font-weight: 700;
}

.tag.muted {
  background: #ece7e1;
  color: #7b4f2f;
}

.time {
  margin-left: auto;
  color: #657168;
  font-size: 22rpx;
}

.progress-track {
  margin-top: 16rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #d9e3d7;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1f5c43;
}

.play-button {
  margin-top: 18rpx;
  border-radius: 999rpx;
  background: #1f5c43;
  color: #fff;
  font-size: 26rpx;
}

.play-button::after {
  border: 0;
}

.subtitle {
  margin-top: 16rpx;
  color: #33463b;
  font-size: 28rpx;
  line-height: 1.55;
  white-space: pre-wrap;
}
</style>
