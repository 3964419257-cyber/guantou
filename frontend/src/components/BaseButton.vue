<template>
  <t-button
    class="base-button"
    :class="rootClass"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled || loading ? 'true' : 'false'"
    :theme="tdTheme"
    :variant="tdVariant"
    :size="size"
    :shape="shape"
    :icon="icon"
    :block="block"
    :disabled="disabled"
    :loading="loading"
    :type="type || undefined"
    v-bind="buttonA11y"
    @click="handleClick"
  >
    <slot>{{ text }}</slot>
  </t-button>
</template>

<script>
import TButton from '@tdesign/uniapp/button/button.vue';

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
    icon: { type: [String, Object], default: '' },
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
  computed: {
    tdTheme() {
      if (this.variant === 'light') return 'light';
      return this.variant.startsWith('danger') ? 'danger' : 'primary';
    },
    tdVariant() {
      return ['ghost', 'danger-ghost'].includes(this.variant) ? 'outline' : 'base';
    },
    rootClass() {
      return [
        `base-button--${this.variant}`,
        `base-button--${this.size}`,
        { 'base-button--block': this.block },
      ];
    },
    resolvedAriaLabel() {
      return this.ariaLabel || this.text || undefined;
    },
    buttonA11y() {
      return this.resolvedAriaLabel ? { 'aria-label': this.resolvedAriaLabel } : {};
    },
  },
  methods: {
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
</style>
