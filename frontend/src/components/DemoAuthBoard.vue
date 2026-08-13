<template>
  <view class="demo-board">
    <view class="demo-heading">
      <view>
        <view class="demo-title">
          Demo 登录分流
        </view>
        <view class="demo-copy">
          按当前会话高亮决策行（游客 / 需引导 / 就绪）
        </view>
      </view>
      <text class="demo-state">
        {{ stateLabel }}
      </text>
    </view>

    <view class="demo-table">
      <view
        v-for="row in rows"
        :key="row.key"
        class="demo-row"
        :class="{ active: row.key === activeKey }"
      >
        <view class="demo-row-type">
          {{ row.type }}
        </view>
        <view class="demo-row-meta">
          isNew={{ row.isNew }} · primary={{ row.primaryDialect }}
        </view>
        <view class="demo-row-dest">
          → {{ row.destination }} · {{ row.demoPhone }}
        </view>
      </view>
    </view>

    <button
      class="demo-reset"
      :disabled="resetting"
      @tap="resetDemo"
    >
      {{ resetting ? '正在重置…' : '重置演示账号' }}
    </button>
  </view>
</template>

<script>
import {
  DEMO_DECISION_ROWS,
  resolveDemoDecisionRow,
  seedDemoUsers,
} from '@/services/demoUsers';

export default {
  name: 'DemoAuthBoard',
  props: {
    loggedIn: {
      type: Boolean,
      default: false,
    },
    user: {
      type: Object,
      default: null,
    },
    onboardingReason: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      rows: DEMO_DECISION_ROWS,
      resetting: false,
    };
  },
  computed: {
    activeKey() {
      return resolveDemoDecisionRow({
        loggedIn: this.loggedIn,
        user: this.user,
        onboardingReason: this.onboardingReason,
      });
    },
    stateLabel() {
      if (this.activeKey === 'guest') return '游客';
      if (this.activeKey === 'ready') return '就绪';
      return '需引导';
    },
  },
  methods: {
    async resetDemo() {
      if (this.resetting) return;
      this.resetting = true;
      try {
        await seedDemoUsers({ reset: true });
        uni.showToast({ title: '演示账号已重置', icon: 'success' });
        this.$emit('reset');
      } catch (error) {
        const message = error?.message || '重置失败';
        uni.showToast({ title: message, icon: 'none' });
      } finally {
        this.resetting = false;
      }
    },
  },
};
</script>

<style scoped>
.demo-board {
  margin-top: 28rpx;
  padding: 26rpx;
  border: 1px solid var(--border-color, #e1e6dc);
  border-radius: 14rpx;
  background: var(--surface-color, #ffffff);
}

.demo-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}

.demo-title {
  font-size: 29rpx;
  font-weight: 700;
  color: var(--text-color, #1d2a24);
}

.demo-copy {
  margin-top: 8rpx;
  color: var(--muted-color, #647068);
  font-size: 22rpx;
  line-height: 1.5;
}

.demo-state {
  flex-shrink: 0;
  color: var(--accent-color, #1f5c43);
  font-size: 24rpx;
  font-weight: 700;
}

.demo-table {
  margin-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.demo-row {
  padding: 16rpx 18rpx;
  border: 1px solid var(--border-color, #e1e6dc);
  border-radius: 10rpx;
  background: var(--page-color, #f6f7f3);
}

.demo-row.active {
  border-color: var(--accent-color, #1f5c43);
  background: rgba(31, 92, 67, 0.08);
  box-shadow: inset 0 0 0 2rpx var(--accent-color, #1f5c43);
}

.demo-row-type {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-color, #1d2a24);
}

.demo-row-meta,
.demo-row-dest {
  margin-top: 6rpx;
  color: var(--muted-color, #647068);
  font-size: 22rpx;
  line-height: 1.45;
}

.demo-reset {
  margin-top: 22rpx;
  border-radius: 999rpx;
  background: var(--page-color, #f6f7f3);
  border: 1px solid var(--border-color, #ccd7ca);
  color: var(--accent-color, #1f5c43);
  font-size: 26rpx;
}

.demo-reset::after {
  border: 0;
}
</style>
