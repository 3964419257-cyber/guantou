<template>
  <view
    class="page-shell"
    :class="[`theme-${resolvedTheme}`, `accent-${accent}`]"
    :style="outfitVars"
  >
    <view
      class="shell-grain"
      aria-hidden="true"
    />
    <view class="shell-topbar">
      <text
        v-if="showBack"
        class="shell-back"
        @tap="handleBack"
      >
        ‹
      </text>
      <view
        v-else
        class="shell-back-placeholder"
      />
      <text class="shell-title">
        {{ title }}
      </text>
      <BaseButton
        v-if="actionText"
        class="shell-action"
        size="small"
        :text="actionText"
        @click="$emit('action')"
      />
      <view
        v-else
        class="shell-action-placeholder"
      />
    </view>
    <slot name="before" />
    <scroll-view
      v-if="scroll"
      scroll-y
      class="shell-content shell-scroll"
      :class="contentClass"
      @scroll="onScroll"
      @scrolltolower="$emit('scrolltolower')"
    >
      <slot />
    </scroll-view>
    <view
      v-else
      class="shell-content"
      :class="contentClass"
    >
      <slot />
    </view>
    <FeedbackHost />
  </view>
</template>

<script>
import { getAccentPreference } from '@/services/theme';
import { hydrateOutfitStyle } from '@/services/themeCenter';
import { getAppliedOutfitVars } from '@/services/themeSchema';
import { goBack, ROUTES } from '@/services/navigation';
import BaseButton from '@/components/BaseButton.vue';
import FeedbackHost from '@/components/FeedbackHost.vue';

export default {
  name: 'PageShell',
  components: { BaseButton, FeedbackHost },
  props: {
    title: {
      type: String,
      required: true,
    },
    showBack: {
      type: Boolean,
      default: true,
    },
    actionText: {
      type: String,
      default: '',
    },
    scroll: {
      type: Boolean,
      default: true,
    },
    contentClass: {
      type: [String, Array, Object],
      default: '',
    },
    backFallback: {
      type: String,
      default: ROUTES.home,
    },
    interceptBack: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['action', 'back', 'scroll', 'scrolltolower'],
  data() {
    return {
      resolvedTheme: 'light',
      accent: getAccentPreference(),
      outfitVars: {},
    };
  },
  mounted() {
    uni.$on('theme-change', this.handleThemeChange);
    hydrateOutfitStyle();
    this.syncOutfitVars();
  },
  beforeUnmount() {
    uni.$off('theme-change', this.handleThemeChange);
  },
  methods: {
    syncOutfitVars() {
      this.outfitVars = getAppliedOutfitVars();
    },
    handleThemeChange(theme) {
      this.resolvedTheme = theme?.resolved || 'light';
      this.accent = theme?.accent || getAccentPreference();
      this.syncOutfitVars();
    },
    onScroll(event) {
      const top = event?.detail?.scrollTop ?? event?.scrollTop ?? 0;
      this.$emit('scroll', { scrollTop: Number(top) || 0 });
    },
    handleBack() {
      this.$emit('back');
      if (this.interceptBack) return;
      goBack(this.backFallback);
    },
  },
};
</script>

<style scoped>
/* 颜色 Token 来自全局 styles/tokens.scss；暗色由 .theme-dark 全局规则覆盖子树 */
.page-shell {
  position: relative;
  min-height: 100vh;
  background: var(--page-color);
  color: var(--text-color);
  letter-spacing: var(--dress-letter-spacing, 0em);
}

.shell-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: var(--dress-grain-opacity, 0);
  background-image: var(--dress-grain-image, var(--grain-dot));
  background-size: var(--dress-grain-size, 46rpx 46rpx);
}

.shell-topbar {
  position: relative;
  z-index: 1;
  height: 96rpx;
  display: grid;
  grid-template-columns: 56rpx 1fr auto;
  align-items: center;
  gap: 16rpx;
  padding: 0 28rpx;
  background: var(--dress-nav-bar-background, var(--accent-subtle-color));
  border-bottom: 1px solid var(--dress-nav-bar-border-color, var(--accent-color));
  color: var(--dress-nav-bar-color, var(--text-color));
  box-sizing: border-box;
}

.shell-back,
.shell-back-placeholder {
  width: 56rpx;
}

.shell-back {
  font-size: 56rpx;
  line-height: 1;
}

.shell-title {
  min-width: 0;
  font-size: 34rpx;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.shell-action,
.shell-action-placeholder {
  min-width: 0;
}

.shell-action {
  margin: 0;
}

.shell-content {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 96rpx);
  padding: 28rpx;
  box-sizing: border-box;
}

.shell-scroll {
  height: calc(100vh - 96rpx);
}
</style>
