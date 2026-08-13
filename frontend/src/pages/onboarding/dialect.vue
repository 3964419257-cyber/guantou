<template>
  <PageShell
    :title="shellTitle"
    :show-back="step > 1"
    :auto-back="false"
    :scroll="true"
    @back="goPrev"
  >
    <view class="progress">
      <view
        v-for="n in 3"
        :key="n"
        class="progress-dot"
        :class="{ active: n <= step, current: n === step }"
      />
      <text class="progress-text">
        {{ step }} / 3
      </text>
    </view>

    <!-- Step 1: 主方言 -->
    <view
      v-if="step === 1"
      class="step"
    >
      <view class="hero">
        <text class="eyebrow">
          乡音身份
        </text>
        <text class="headline">
          你的主方言是？
        </text>
        <text class="sub">
          主方言决定你看到的同方言流，选错也能之后在资料里改。
        </text>
      </view>

      <view class="dialect-list">
        <view
          v-for="item in dialects"
          :key="item.code || item.name"
          class="dialect-card"
          :class="{ selected: primaryDialect === item.name }"
          @tap="selectPrimary(item.name)"
        >
          <view class="dialect-main">
            <text class="dialect-name">
              {{ item.name }}
            </text>
            <text
              v-if="item.example"
              class="dialect-example"
            >
              例词「{{ item.example }}」
              <text
                v-if="item.exampleMeaning"
                class="muted"
              >
                · {{ item.exampleMeaning }}
              </text>
            </text>
          </view>
          <button
            v-if="item.example"
            class="listen-btn"
            :class="{ playing: playingName === item.name }"
            @tap.stop="playExample(item)"
          >
            {{ playingName === item.name ? '播放中' : '试听' }}
          </button>
        </view>
      </view>
    </view>

    <!-- Step 2: 次方言 -->
    <view
      v-else-if="step === 2"
      class="step"
    >
      <view class="hero">
        <text class="eyebrow">
          还会哪些
        </text>
        <text class="headline">
          你还会哪些方言？
        </text>
        <text class="sub">
          可多选，也可跳过。跳过时会保留主方言「{{ primaryDialect }}」。
        </text>
      </view>

      <view class="chip-wrap">
        <view
          v-for="item in secondaryOptions"
          :key="item.code || item.name"
          class="chip"
          :class="{ selected: secondaryDialects.includes(item.name) }"
          @tap="toggleSecondary(item.name)"
        >
          {{ item.name }}
        </view>
      </view>
    </view>

    <!-- Step 3: 家乡 -->
    <view
      v-else
      class="step"
    >
      <view class="hero">
        <text class="eyebrow">
          家乡 / 常住
        </text>
        <text class="headline">
          你的家乡或常住地？
        </text>
        <text class="sub">
          方便以后看到同城乡音（同城流）。可跳过，本周只先把数据埋好。
        </text>
      </view>

      <input
        v-model="regionQuery"
        class="region-input"
        placeholder="搜索或输入城市"
        confirm-type="done"
      >
      <view class="chip-wrap">
        <view
          v-for="city in filteredRegions"
          :key="city"
          class="chip"
          :class="{ selected: region === city }"
          @tap="region = city"
        >
          {{ city }}
        </view>
      </view>
    </view>

    <view class="footer">
      <button
        v-if="step === 2 || step === 3"
        class="btn ghost"
        :disabled="submitting"
        @tap="skipStep"
      >
        跳过
      </button>
      <button
        class="btn primary"
        :disabled="!canProceed || submitting"
        @tap="goNext"
      >
        {{ primaryActionLabel }}
      </button>
    </view>
  </PageShell>
</template>

<script>
import PageShell from '@/components/PageShell.vue';
import {
  IDENTITY_DIALECTS,
  REGION_OPTIONS,
  mergeIdentityDialects,
} from '@/const/identityDialects';
import { listDialects } from '@/services/guantou';
import { completeOnboarding } from '@/services/user';
import { resumeInterruptedPageAfterLogin } from '@/services/login';
import { toRecommendFollowPage } from '@/routers/onboarding';

let audioCtx = null;

export default {
  components: { PageShell },
  data() {
    return {
      step: 1,
      dialects: IDENTITY_DIALECTS,
      primaryDialect: '',
      secondaryDialects: [],
      region: '',
      regionQuery: '',
      playingName: '',
      submitting: false,
    };
  },
  computed: {
    shellTitle() {
      if (this.step === 1) return '选主方言';
      if (this.step === 2) return '还会哪些';
      return '家乡常住';
    },
    secondaryOptions() {
      return this.dialects.filter((item) => item.name !== this.primaryDialect);
    },
    filteredRegions() {
      const q = (this.regionQuery || '').trim();
      if (!q) return REGION_OPTIONS;
      return REGION_OPTIONS.filter((city) => city.includes(q));
    },
    canProceed() {
      if (this.step === 1) return !!this.primaryDialect;
      return true;
    },
    primaryActionLabel() {
      if (this.submitting) return '提交中…';
      if (this.step === 3) return '完成';
      return '下一步';
    },
  },
  onLoad() {
    this.loadDialectCatalog();
  },
  onUnload() {
    this.stopAudio();
  },
  methods: {
    async loadDialectCatalog() {
      try {
        const res = await listDialects({ region_level: 'family', parent: 'null' });
        const results = res.results || res || [];
        if (Array.isArray(results) && results.length) {
          this.dialects = mergeIdentityDialects(results);
        }
      } catch (error) {
        this.dialects = IDENTITY_DIALECTS;
      }
    },
    selectPrimary(name) {
      this.primaryDialect = name;
      this.secondaryDialects = this.secondaryDialects.filter((d) => d !== name);
    },
    toggleSecondary(name) {
      if (this.secondaryDialects.includes(name)) {
        this.secondaryDialects = this.secondaryDialects.filter((d) => d !== name);
      } else {
        this.secondaryDialects = [...this.secondaryDialects, name];
      }
    },
    playExample(item) {
      if (!item.audioUrl) {
        uni.showToast({
          title: `「${item.example}」暂无音频，词典接入后可试听`,
          icon: 'none',
        });
        return;
      }
      this.stopAudio();
      audioCtx = uni.createInnerAudioContext();
      audioCtx.src = item.audioUrl;
      this.playingName = item.name;
      audioCtx.onEnded(() => {
        this.playingName = '';
      });
      audioCtx.onError(() => {
        this.playingName = '';
        uni.showToast({ title: '试听失败', icon: 'none' });
      });
      audioCtx.play();
    },
    stopAudio() {
      if (audioCtx) {
        audioCtx.stop();
        audioCtx.destroy();
        audioCtx = null;
      }
      this.playingName = '';
    },
    goPrev() {
      if (this.step > 1) this.step -= 1;
    },
    skipStep() {
      if (this.step === 2) {
        this.secondaryDialects = [];
        this.step = 3;
        return;
      }
      if (this.step === 3) {
        this.region = '';
        this.finish();
      }
    },
    goNext() {
      if (!this.canProceed || this.submitting) return;
      if (this.step === 1) {
        this.step = 2;
        return;
      }
      if (this.step === 2) {
        this.step = 3;
        return;
      }
      this.finish();
    },
    async finish() {
      const id = uni.getStorageSync('id');
      if (!id) {
        uni.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      // 跳过次方言时约定 dialects = [primaryDialect]
      const dialects = this.secondaryDialects.length
        ? [this.primaryDialect, ...this.secondaryDialects.filter((d) => d !== this.primaryDialect)]
        : [this.primaryDialect];

      this.submitting = true;
      try {
        await completeOnboarding(id, {
          primary_dialect: this.primaryDialect,
          dialects,
          region: this.region || '',
        });
        if (resumeInterruptedPageAfterLogin(id)) return;
        toRecommendFollowPage(true);
      } catch (error) {
        const msg = (error && (error.msg || (error.data && error.data.msg))) || '提交失败';
        uni.showToast({ title: msg, icon: 'none' });
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style scoped>
.progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 28rpx;
}

.progress-dot {
  width: 48rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #d5ddd6;
}

.progress-dot.active {
  background: #9bb8a8;
}

.progress-dot.current {
  background: #1f5c43;
}

.progress-text {
  margin-left: auto;
  font-size: 22rpx;
  color: #6c776e;
}

.hero {
  margin-bottom: 28rpx;
}

.eyebrow {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #1f5c43;
}

.headline {
  display: block;
  margin-top: 12rpx;
  font-size: 44rpx;
  font-weight: 800;
  line-height: 1.25;
  color: #1d2a24;
}

.sub {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.55;
  color: #6c776e;
}

.dialect-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-bottom: 160rpx;
}

.dialect-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 22rpx;
  background: #fff;
  border: 1px solid #e1e6dc;
  border-radius: 14rpx;
}

.dialect-card.selected {
  border-color: #1f5c43;
  background: #f3f8f5;
  box-shadow: inset 0 0 0 1px #1f5c43;
}

.dialect-main {
  flex: 1;
  min-width: 0;
}

.dialect-name {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
}

.dialect-example {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #4a5750;
}

.muted {
  color: #8a948c;
}

.listen-btn {
  margin: 0;
  padding: 0 22rpx;
  height: 56rpx;
  line-height: 56rpx;
  font-size: 24rpx;
  color: #1f5c43;
  background: #e7f1eb;
  border-radius: 10rpx;
}

.listen-btn.playing {
  color: #fff;
  background: #1f5c43;
}

.chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-bottom: 160rpx;
}

.chip {
  padding: 14rpx 28rpx;
  font-size: 26rpx;
  color: #1d2a24;
  background: #fff;
  border: 1px solid #e1e6dc;
  border-radius: 999rpx;
}

.chip.selected {
  color: #fff;
  background: #1f5c43;
  border-color: #1f5c43;
}

.region-input {
  height: 80rpx;
  margin-bottom: 24rpx;
  padding: 0 24rpx;
  background: #fff;
  border: 1px solid #e1e6dc;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx 28rpx calc(20rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(246, 247, 243, 0), #f6f7f3 28%);
  box-sizing: border-box;
}

.btn {
  flex: 1;
  margin: 0;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 14rpx;
}

.btn.primary {
  color: #fff;
  background: #1f5c43;
}

.btn.primary[disabled] {
  opacity: 0.45;
}

.btn.ghost {
  flex: 0 0 28%;
  color: #1d2a24;
  background: #fff;
  border: 1px solid #e1e6dc;
}
</style>
