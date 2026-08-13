<template>
  <text
    v-if="label"
    class="dialect-badge"
  >
    {{ label }}
  </text>
</template>

<script>
export default {
  name: 'DialectBadge',
  props: {
    dialect: {
      type: String,
      default: '',
    },
  },
  computed: {
    label() {
      return (this.dialect || '').trim();
    },
  },
};
</script>

<style scoped>
.dialect-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 12rpx;
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1.5;
  color: #1f5c43;
  background: #e7f1eb;
  border: 1px solid #c5d9cd;
  border-radius: 6rpx;
  vertical-align: middle;
}
</style>
