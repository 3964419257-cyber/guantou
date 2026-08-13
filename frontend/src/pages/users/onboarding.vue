<template>
  <PageShell
    :title="pageTitle"
    :show-back="false"
  >
    <view class="intro">
      <view class="step-mark">
        {{ step }}/4
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
          选项来自词典方言树；主方言决定你看到的同方言流。
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

    <view v-else-if="step === 3">
      <view class="dialect-card">
        <view class="field-label">
          还会哪些方言（可多选，可跳过）
        </view>
        <view class="field-hint">
          主方言会自动保留；这里可再勾选你会说的其他方言。跳过时 dialects 仅含主方言。
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
          @tap="step = 2"
        >
          上一步
        </button>
        <button
          class="secondary-button"
          @tap="skipSecondary"
        >
          跳过
        </button>
        <button
          class="primary-button finish-button"
          @tap="nextFromSecondary"
        >
          下一步
        </button>
      </view>
    </view>

    <view v-else>
      <view class="dialect-card">
        <view class="field-label">
          家乡 / 常住地（可选）
        </view>
        <view class="field-hint">
          方便以后看到同城乡音（同城流）。本周只保存字段，同城流后续再做。
        </view>
        <input
          v-model="region"
          class="nickname-input"
          maxlength="100"
          placeholder="例如：成都"
        >
        <view class="chip-row region-chips">
          <view
            v-for="city in regionSuggestions"
            :key="city"
            :class="['chip', region === city ? 'selected' : '']"
            @tap="region = city"
          >
            {{ city }}
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
          @tap="step = 3"
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
import { peekInterceptIntent } from '@/services/authGuard';
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
import { toFollowRecommendations } from '@/routers/user';
import { playAudio } from '@/utils/audio';

const REGION_SUGGESTIONS = [
  '成都', '重庆', '广州', '上海', '北京', '郑州', '长沙', '武汉', '福州', '厦门',
];

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
      region: user.region || '',
      regionSuggestions: REGION_SUGGESTIONS,
      sample: null,
      sampleRequestId: 0,
      saving: false,
      secondarySelectedIds: [],
      selectedDialectId: user.primary_dialect?.id || null,
      skipSecondaryDialects: false,
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
      return '补选主方言';
    },
    stepTitle() {
      if (this.step === 1) {
        return this.isNewUser ? '先取个昵称' : '确认你的昵称';
      }
      if (this.step === 2) return '选择你的主方言';
      if (this.step === 3) return '还会哪些方言？';
      return '家乡 / 常住地';
    },
    stepCopy() {
      if (this.step === 1) {
        return this.isNewUser
          ? '先取个昵称，一步步选好你的乡音'
          : '还没有主方言，补选后才能进入同方言首页';
      }
      if (this.step === 2) {
        return '主方言决定你看到的同方言流，必选一项后可试听例词。';
      }
      if (this.step === 3) {
        return '可多选，也可直接跳过；主方言会始终写入 dialects。';
      }
      return '可选；方便以后看到同城乡音（同城流）。';
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
    skipSecondary() {
      this.skipSecondaryDialects = true;
      this.secondarySelectedIds = [];
      this.error = '';
      this.step = 4;
    },
    nextFromSecondary() {
      this.skipSecondaryDialects = false;
      this.error = '';
      this.step = 4;
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
    async finish(skipRegion) {
      if (!this.selectedDialectId) {
        this.error = '请选择主方言';
        this.step = 2;
        return;
      }
      this.error = '';
      this.saving = true;
      try {
        const dialectIds = this.skipSecondaryDialects
          ? [this.selectedDialectId]
          : [this.selectedDialectId, ...this.secondarySelectedIds];
        await completeOnboarding(this.userId, {
          nickname: this.nickname || this.defaultNickname,
          primaryDialectId: this.selectedDialectId,
          dialectIds,
          region: skipRegion ? '' : String(this.region || '').trim(),
        });
        uni.showToast({ title: '方言身份已设置', icon: 'success' });
        // 有拦截意图：优先回流；否则进入推荐关注（W3-E1 → W3-E2）
        if (peekInterceptIntent()) {
          if (await resumeInterruptedPageAfterLogin(this.userId)) return;
        }
        toFollowRecommendations(true);
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
.field-hint,
.loading-copy,
.sample-empty {
  margin-top: 12rpx;
  color: #607067;
  font-size: 26rpx;
  line-height: 1.6;
}

.form-card,
.dialect-card,
.sample-card {
  border: 1px solid #dce5d8;
  border-radius: 18rpx;
  background: #fff;
  padding: 28rpx;
}

.sample-card {
  margin-top: 22rpx;
}

.field-label {
  font-size: 28rpx;
  font-weight: 800;
}

.nickname-input {
  margin-top: 18rpx;
  padding: 18rpx 22rpx;
  border-radius: 12rpx;
  background: #f4f7f2;
  font-size: 28rpx;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 20rpx;
}

.region-chips {
  margin-top: 18rpx;
}

.chip {
  padding: 12rpx 22rpx;
  border: 1px solid #d5ddd2;
  border-radius: 999rpx;
  background: #f7faf5;
  color: #355445;
  font-size: 24rpx;
}

.chip.selected {
  border-color: #1f6549;
  background: #e7f2ea;
  color: #1f6549;
  font-weight: 800;
}

.sample-title {
  margin-top: 10rpx;
  font-size: 32rpx;
  font-weight: 850;
}

.sample-meta {
  margin-top: 8rpx;
  color: #7a867d;
  font-size: 22rpx;
}

.sample-button,
.primary-button,
.secondary-button,
.logout-button {
  margin-top: 22rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
}

.sample-button,
.primary-button {
  background: #1f6549;
  color: #fff;
}

.secondary-button,
.logout-button {
  border: 1px solid #cfd9cc;
  background: #fff;
  color: #315b49;
}

.button-row {
  display: grid;
  grid-template-columns: 0.8fr 1.4fr;
  gap: 14rpx;
  margin-top: 8rpx;
}

.button-row.triple {
  grid-template-columns: 0.7fr 0.9fr 1.2fr;
}

.button-row .primary-button,
.button-row .secondary-button {
  margin-top: 22rpx;
  width: 100%;
}

.finish-button {
  margin-top: 22rpx;
}

.error {
  margin-top: 16rpx;
  color: #a14436;
  font-size: 24rpx;
}

.logout-button {
  margin-top: 36rpx;
  margin-bottom: 40rpx;
}

.sample-button::after,
.primary-button::after,
.secondary-button::after,
.logout-button::after {
  border: 0;
}
</style>
