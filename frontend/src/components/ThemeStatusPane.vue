<template>
  <EmptyState
    :title="copy.title"
    :description="copy.description"
    :action-text="copy.actionText"
    @action="onAction"
  />
</template>

<script>
import EmptyState from '@/components/EmptyState.vue';
import { trackThemeEmptyClick, trackThemeEmptyShow } from '@/services/themeAnalytics';
import { themeEmptyCopy } from '@/services/themeStatus';

export default {
  name: 'ThemeStatusPane',
  components: { EmptyState },
  props: {
    scene: { type: String, required: true },
  },
  emits: ['action'],
  computed: {
    copy() {
      return themeEmptyCopy(this.scene);
    },
  },
  watch: {
    scene: {
      immediate: true,
      handler(scene) {
        if (scene) trackThemeEmptyShow(scene);
      },
    },
  },
  methods: {
    onAction() {
      trackThemeEmptyClick(this.scene, this.copy.action);
      this.$emit('action');
    },
  },
};
</script>
