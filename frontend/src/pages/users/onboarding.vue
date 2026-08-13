<template>
  <PageShell
    :title="pageTitle"
    :show-back="false"
  >
    <view class="intro">
      <view class="step-mark">
        {{ step }}/3
      </view>
      <view
        v-if="forcedHint"
        class="forced-banner"
      >
        请先选择主方言
      </view>
      <view class="intro-title">
        {{ stepTitle }}
      </view>
      <view class="intro-copy">
        {{ stepCopy }}
      </view>
    </view>

    <view
      v-if="step === 1"
      class="form-card"
    >
      <view class="field-label">
        怎么称呼你
      </view>
      <input
        v-model="nickname"
        class="nickname-input"
        maxlength="100"
        placeholder="输入昵称"
      >
      <view
        v-if="error"
        class="error"
      >
        {{ error }}
      </view>
      <button
        class="primary-button"
        @tap="nextFromNickname"
      >
        下一步
      </button>
    </view>

    <view v-else-if="step === 2">
      <view class="dialect-card">
        <view class="field-label">
          主方言（必选）
        </view>
        <view class="field-hint">
          选项来自词典方言树；先选最贴近你日常乡音的一项。
        </view>
        <view
          v-if="loadingDialects"
          class="loading-copy"
        >
          正在加载方言树…
        </view>
        <view
          v-else
          class="chip-row"
        >
          <view
            v-for="dialect in primaryDialectChoices"
            :key="dialect.id"
            :class="['chip', selectedDialectId === dialect.id ? 'selected' : '']"
            @tap="selectPrimaryDialect(dialect)"
          >
            {{ dialect.name }}
          </view>
        </view>
      </view>

      <view
        v-if="selectedDialectId && exampleWord"
        class="sample-card"
      >
        <view class="sample-kicker">
          例词卡
        </view>
        <view class="sample-title">
          例词「{{ exampleWord.word }}」：{{ exampleWord.meaning }}
        </view>
        <view class="sample-meta">
          {{ selectedDialectLabel }}
          <text v-if="sampleDuration">
            · {{ sampleDuration }}
          </text>
        </view>
        <button
          class="sample-button"
          :disabled="!sample?.audio_url"
          @tap="playSample"
        >
          ▶ 试听例词
        </button>
        <view
          v-if="!loadingSample && !sample?.audio_url"
          class="sample-empty"
        >
          词典暂无该方言公开录音，仍可继续选择。
        </view>
      </view>

      <view
        v-if="error"
        class="error"
      >
        {{ error }}
      </view>
      <view class="button-row">
        <button
          class="secondary-button"
          @tap="step = 1"
        >
          上一步
        </button>
        <button
          class="primary-button finish-button"
          @tap="nextFromPrimary"
        >
          下一步
        </button>
      </view>
    </view>

    <view v-else>
      <view class="dialect-card">
        <view class="field-label">
          还会哪些方言（可多选，可跳过）
        </view>
        <view class="field-hint">
          主方言会自动保留；这里可再勾选你会说的其他方言。
        </view>
        <view class="chip-row">
          <view
            v-for="dialect in secondaryDialectChoices"
            :key="dialect.id"
            :class="['chip', secondarySelectedIds.includes(dialect.id) ? 'selected' : '']"
            @tap="toggleSecondaryDialect(dialect)"
          >
            {{ dialect.name }}
          </view>
        </view>
      </view>

      <view
        v-if="error"
        class="error"
      >
        {{ error }}
      </view>
      <view class="button-row triple">
        <button
          class="secondary-button"
          :disabled="saving"
          @tap="step = 2"
        >
          上一步
        </button>
        <button
          class="secondary-button"
          :disabled="saving"
          @tap="finish(true)"
        >
          跳过并完成
        </button>
        <button
          class="primary-button finish-button"
          :disabled="saving"
          @tap="finish(false)"
        >
          {{ saving ? '正在保存…' : '完成' }}
        </button>
      </view>
    </view>

    <button
      class="logout-button"
      @tap="abandon"
    >
      退出账号，返回游客模式
    </button>
  </PageShell>
</template>

<script>
import PageShell from '@/components/PageShell.vue';
import { toIndexPage } from '@/routers';
import {
  completeOnboarding,
  exampleWordForDialect,
  loadDialectSample,
  normalizeOnboardingReason,
  ONBOARDING_REASONS,
} from '@/services/dialectOnboarding';
import { listAllDialects } from '@/services/guantou';
import { resumeInterruptedPageAfterLogin } from '@/services/login';
import { clearUserInfo } from '@/services/user';
import { playAudio } from '@/utils/audio';

export default {
  components: { PageShell },
  data() {
    const user = getApp().globalData.userInfo || {};
    const fallbackNickname = user.nickname || user.username || '';
    return {
      defaultNickname: fallbackNickname,
      dialects: [],
      error: '',
      loadingDialects: true,
      loadingSample: false,
      nickname: fallbackNickname,
      reason: ONBOARDING_REASONS.MISSING_DIALECT,
      sample: null,
      sampleRequestId: 0,
      saving: false,
      secondarySelectedIds: [],
      selectedDialectId: user.primary_dialect?.id || null,
      step: 1,
      userId: user.id || uni.getStorageSync('id'),
    };
  },
  computed: {
    isNewUser() {
      return this.reason === ONBOARDING_REASONS.NEW_USER;
    },
    forcedHint() {
      return this.reason === ONBOARDING_REASONS.FORCED;
    },
    pageTitle() {
      if (this.isNewUser) return '欢迎加入乡音罐头';
      if (this.forcedHint) return '完善方言身份';
      return '完善方言身份';
    },
    stepTitle() {
      if (this.step === 1) return '先取个昵称';
      if (this.step === 2) return '选择你的主方言';
      return '还会哪些方言？';
    },
    stepCopy() {
      if (this.step === 1) return '先取个昵称，一步步选好你的乡音';
      if (this.step === 2) return '主方言是同方言流的基础，必选一项后可试听例词。';
      return '可多选，也可直接跳过；完成后会写入你的方言身份。';
    },
    primaryDialectChoices() {
      return this.dialects;
    },
    secondaryDialectChoices() {
      return this.dialects.filter((dialect) => dialect.id !== this.selectedDialectId);
    },
    selectedDialect() {
      return this.dialects.find((dialect) => dialect.id === this.selectedDialectId) || null;
    },
    selectedDialectLabel() {
      return this.selectedDialect?.qualified_code || this.selectedDialect?.name || '';
    },
    exampleWord() {
      return exampleWordForDialect(this.selectedDialect);
    },
    sampleDuration() {
      const milliseconds = Number(this.sample?.duration_ms || 0);
      return milliseconds ? `${Math.max(1, Math.round(milliseconds / 1000))} 秒` : '';
    },
  },
  async onLoad(options = {}) {
    this.reason = normalizeOnboardingReason(options.reason);
    if (!this.userId) {
      uni.reLaunch({ url: '/pages/login/login' });
      return;
    }
    try {
      this.dialects = await listAllDialects();
      if (this.selectedDialectId) await this.loadSample(this.selectedDialectId);
    } finally {
      this.loadingDialects = false;
    }
  },
  onBackPress() {
    uni.showToast({ title: '请先选择主方言，或退出账号', icon: 'none' });
    return true;
  },
  methods: {
    nextFromNickname() {
      this.nickname = String(this.nickname || '').trim() || this.defaultNickname;
      this.error = '';
      this.step = 2;
    },
    async selectPrimaryDialect(dialect) {
      this.selectedDialectId = dialect.id;
      this.secondarySelectedIds = this.secondarySelectedIds.filter(
        (id) => id !== dialect.id,
      );
      this.error = '';
      await this.loadSample(dialect.id);
    },
    nextFromPrimary() {
      if (!this.selectedDialectId) {
        this.error = '请选择主方言';
        return;
      }
      this.error = '';
      this.step = 3;
    },
    toggleSecondaryDialect(dialect) {
      if (this.secondarySelectedIds.includes(dialect.id)) {
        this.secondarySelectedIds = this.secondarySelectedIds.filter(
          (id) => id !== dialect.id,
        );
        return;
      }
      this.secondarySelectedIds = [...this.secondarySelectedIds, dialect.id];
    },
    async loadSample(dialectId) {
      const requestId = this.sampleRequestId + 1;
      this.sampleRequestId = requestId;
      this.loadingSample = true;
      try {
        const sample = await loadDialectSample(dialectId);
        if (requestId === this.sampleRequestId) this.sample = sample;
      } catch (error) {
        if (requestId === this.sampleRequestId) this.sample = null;
      } finally {
        if (requestId === this.sampleRequestId) this.loadingSample = false;
      }
    },
    playSample() {
      if (!this.sample?.audio_url) {
        uni.showToast({ title: '暂无例词录音', icon: 'none' });
        return;
      }
      playAudio(this.sample.audio_url);
    },
    async finish(skipSecondary) {
      if (!this.selectedDialectId) {
        this.error = '请选择主方言';
        this.step = 2;
        return;
      }
      this.error = '';
      this.saving = true;
      try {
        const dialectIds = skipSecondary
          ? [this.selectedDialectId]
          : [this.selectedDialectId, ...this.secondarySelectedIds];
        await completeOnboarding(this.userId, {
          nickname: this.nickname || this.defaultNickname,
          primaryDialectId: this.selectedDialectId,
          dialectIds,
        });
        uni.showToast({ title: '方言身份已设置', icon: 'success' });
        if (!(await resumeInterruptedPageAfterLogin(this.userId))) {
          toIndexPage(true);
        }
      } finally {
        this.saving = false;
      }
    },
    abandon() {
      clearUserInfo();
      uni.reLaunch({ url: '/pages/search' });
    },
  },
};
</script>

<style scoped>
.intro {
  padding: 10rpx 4rpx 30rpx;
}

.step-mark,
.sample-kicker {
  color: #7b4f2f;
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
}

.forced-banner {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  border: 1px solid #e2c9b0;
  border-left: 8rpx solid #7b4f2f;
  border-radius: 12rpx;
  background: #fff7ee;
  color: #7b4f2f;
  font-size: 26rpx;
  font-weight: 700;
}

.intro-title {
  margin-top: 12rpx;
  font-size: 46rpx;
  font-weight: 900;
  line-height: 1.2;
}

.intro-copy,
.field-hint {
  margin-top: 12rpx;
  color: #627067;
  font-size: 26rpx;
  line-height: 1.6;
}

.form-card,
.dialect-card,
.sample-card {
  border: 1px solid #dfe5da;
  border-radius: 16rpx;
  background: #ffffff;
  padding: 28rpx;
}

.field-label {
  color: #1d2a24;
  font-size: 29rpx;
  font-weight: 800;
}

.nickname-input {
  height: 86rpx;
  margin-top: 20rpx;
  padding: 0 22rpx;
  border: 1px solid #ccd6ca;
  border-radius: 12rpx;
  background: #f8f9f6;
  font-size: 30rpx;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 20rpx;
}

.chip {
  padding: 14rpx 22rpx;
  border: 1px solid #d5ddd2;
  border-radius: 999rpx;
  background: #f7f8f4;
  color: #33463b;
  font-size: 26rpx;
}

.chip.selected {
  border-color: #1f5c43;
  background: #edf5eb;
  color: #1f5c43;
  font-weight: 700;
}

.primary-button,
.secondary-button,
.sample-button,
.logout-button {
  border-radius: 999rpx;
  font-size: 27rpx;
}

.primary-button {
  margin-top: 28rpx;
  background: #1f5c43;
  color: #ffffff;
}

.primary-button::after,
.secondary-button::after,
.sample-button::after,
.logout-button::after {
  border: 0;
}

.loading-copy,
.sample-empty {
  padding: 28rpx 0 8rpx;
  color: #748078;
  font-size: 25rpx;
  line-height: 1.5;
}

.sample-card {
  margin-top: 20rpx;
  border-color: #eadbc9;
  background: #fffaf2;
}

.sample-title {
  margin-top: 14rpx;
  color: #32261c;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1.4;
}

.sample-meta {
  margin-top: 8rpx;
  color: #786a5e;
  font-size: 24rpx;
}

.sample-button {
  margin: 22rpx 0 0;
  border: 1px solid #d9bea0;
  background: #ffffff;
  color: #7b4f2f;
}

.error {
  margin-top: 18rpx;
  color: #a13b2c;
  font-size: 25rpx;
}

.button-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16rpx;
  margin-top: 24rpx;
}

.button-row.triple {
  grid-template-columns: 1fr 1.2fr 1.2fr;
}

.secondary-button,
.finish-button {
  width: 100%;
  margin: 0;
}

.secondary-button {
  border: 1px solid #cbd6c9;
  background: #ffffff;
  color: #1f5c43;
}

.logout-button {
  margin: 36rpx auto 10rpx;
  background: transparent;
  color: #7b4f2f;
  font-size: 24rpx;
}
</style>
