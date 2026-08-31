<template>
  <t-button
    class="base-button"
    :class="rootClass"
    :theme="tdTheme"
    :variant="tdVariant"
    :size="size"
    :shape="resolvedShape"
    :block="block"
    :disabled="disabled"
    :loading="loading"
    :type="type || undefined"
    :aria-label="ariaLabel || text"
    @click="handleClick"
  >
    <slot>{{ text }}</slot>
  </t-button>
</template>

<script>
import TButton from '@tdesign/uniapp/button/button.vue';
import {
  FILL_GHOST_LOOKS,
  getEffectPreference,
  getGhostLookPreference,
  getPrimaryLookPreference,
  OUTLINE_PRIMARY_LOOKS,
  RECT_PRIMARY_LOOKS,
} from '@/services/theme';

export default {
  name: 'BaseButton',
  components: { TButton },
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'ghost', 'danger', 'danger-ghost', 'light'].includes(value),
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['extra-small', 'small', 'medium', 'large'].includes(value),
    },
    text: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    block: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    shape: {
      type: String,
      default: 'round',
      validator: (value) => ['rectangle', 'square', 'round', 'circle'].includes(value),
    },
    type: {
      type: String,
      default: '',
      validator: (value) => ['', 'submit', 'reset'].includes(value),
    },
  },
  emits: ['click'],
  data() {
    return {
      primaryLook: getPrimaryLookPreference(),
      ghostLook: getGhostLookPreference(),
      effect: getEffectPreference(),
    };
  },
  computed: {
    isPrimary() {
      return this.variant === 'primary';
    },
    isGhost() {
      return this.variant === 'ghost';
    },
    activeLook() {
      if (this.isPrimary) return this.primaryLook;
      if (this.isGhost) return this.ghostLook;
      return '';
    },
    tdTheme() {
      if (this.variant === 'light') return 'light';
      return this.variant.startsWith('danger') ? 'danger' : 'primary';
    },
    tdVariant() {
      if (this.variant === 'danger-ghost') return 'outline';
      if (this.isGhost) return FILL_GHOST_LOOKS.has(this.ghostLook) ? 'base' : 'outline';
      if (this.isPrimary && OUTLINE_PRIMARY_LOOKS.has(this.primaryLook)) return 'outline';
      return 'base';
    },
    resolvedShape() {
      if (this.isPrimary && RECT_PRIMARY_LOOKS.has(this.primaryLook)) return 'rectangle';
      if (this.isGhost && ['classic', 'seal', 'solemn'].includes(this.ghostLook)) return 'rectangle';
      return this.shape;
    },
    rootClass() {
      return [
        `base-button--${this.variant}`,
        `base-button--${this.size}`,
        this.activeLook ? `base-button--look-${this.activeLook}` : '',
        this.effectClass,
        { 'base-button--block': this.block },
      ];
    },
    followsEffect() {
      return this.isPrimary || this.isGhost;
    },
    effectClass() {
      if (!this.followsEffect || this.effect === 'none') return '';
      return `base-button--effect-${this.effect}`;
    },
  },
  mounted() {
    if (typeof uni !== 'undefined' && typeof uni.$on === 'function') {
      uni.$on('theme-change', this.handleThemeChange);
    }
  },
  beforeUnmount() {
    if (typeof uni !== 'undefined' && typeof uni.$off === 'function') {
      uni.$off('theme-change', this.handleThemeChange);
    }
  },
  methods: {
    handleThemeChange(theme) {
      this.primaryLook = theme?.primaryLook || theme?.buttonStyle || getPrimaryLookPreference();
      this.ghostLook = theme?.ghostLook || getGhostLookPreference();
      this.effect = theme?.effect || getEffectPreference();
    },
    handleClick(event) {
      if (this.disabled || this.loading) return;
      this.$emit('click', event);
    },
  },
};
</script>

<style scoped>
.base-button {
  --td-button-border-radius: var(--radius-pill);
}

.base-button :deep(.t-button__content) {
  pointer-events: none;
}

.base-button--look-soft {
  --td-brand-color: var(--accent-subtle-color);
  --td-brand-color-active: var(--accent-subtle-color);
  --td-text-color-anti: var(--accent-color);
}

.base-button--look-contrast {
  --td-button-border-radius: var(--radius-md);
  --td-brand-color: var(--text-color);
  --td-brand-color-active: var(--text-color);
  --td-text-color-anti: var(--page-color);
}

.base-button--look-solemn {
  --td-button-border-radius: var(--radius-sm);
  --td-brand-color: var(--text-color);
  --td-brand-color-active: var(--text-color);
  --td-text-color-anti: var(--page-color);
  letter-spacing: 0.1em;
}

.base-button--look-classic {
  --td-button-border-radius: var(--radius-sm);
  letter-spacing: 0.16em;
  box-shadow:
    inset 0 0 0 2rpx var(--accent-color),
    0 0 0 4rpx var(--surface-color),
    0 0 0 6rpx var(--accent-color);
}

.base-button--look-ardent {
  letter-spacing: 0.04em;
  box-shadow: 0 10rpx 28rpx var(--accent-subtle-color);
}

.base-button--look-fresh {
  --td-brand-color: var(--accent-subtle-color);
  --td-brand-color-active: var(--accent-subtle-color);
  --td-text-color-anti: var(--accent-color);
  --td-button-border-radius: var(--radius-pill);
}

.base-button--look-seal {
  --td-button-border-radius: var(--radius-sm);
  letter-spacing: 0.2em;
  box-shadow: inset 0 0 0 4rpx var(--on-accent-color);
}

.base-button--look-gilt {
  --td-button-border-radius: var(--radius-sm);
  color: var(--gilt-color);
  box-shadow: inset 0 0 0 2rpx var(--gilt-color);
}

.base-button--look-wash {
  --td-brand-color: var(--accent-subtle-color);
  --td-text-color-anti: var(--text-secondary-color);
  opacity: 0.94;
}

.base-button--look-fog {
  opacity: 0.88;
}

.base-button--ghost.base-button--look-filled,
.base-button--ghost.base-button--look-soft {
  --td-brand-color: var(--accent-subtle-color);
  --td-text-color-anti: var(--accent-color);
}

.base-button--ghost.base-button--look-quiet {
  opacity: 0.86;
}

.base-button--ghost.base-button--look-ardent {
  box-shadow: 0 8rpx 20rpx var(--accent-subtle-color);
}

.base-button--ghost.base-button--look-fresh {
  opacity: 0.94;
}

.base-button--ghost.base-button--look-fog {
  background: var(--surface-subtle-color);
}

.base-button--ghost.base-button--look-wash {
  opacity: 0.82;
}

.base-button--ghost.base-button--look-gilt {
  color: var(--gilt-color);
  box-shadow: inset 0 0 0 2rpx var(--gilt-color);
}

.base-button--effect-glow {
  box-shadow: 0 0 28rpx var(--accent-color);
}

.base-button--effect-lift {
  box-shadow: 0 12rpx 24rpx var(--border-color);
}

.base-button--effect-gilt {
  box-shadow: 0 0 0 3rpx var(--gilt-color);
}

.base-button--effect-ink {
  text-shadow: 2rpx 2rpx 0 var(--accent-subtle-color);
}

.base-button--effect-bloom {
  box-shadow: 0 0 36rpx var(--accent-subtle-color), 0 8rpx 20rpx var(--border-color);
}

.base-button--effect-press:active {
  opacity: 0.72;
  transform: scale(0.96);
}

.base-button--effect-pulse {
  animation: button-pulse 1.8s ease-in-out infinite;
}

@keyframes button-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--accent-subtle-color);
  }

  50% {
    box-shadow: 0 0 0 10rpx var(--accent-subtle-color);
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-button--effect-pulse {
    animation: none;
  }

  .base-button--effect-press:active {
    transform: none;
  }
}
</style>
