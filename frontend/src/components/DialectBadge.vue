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
    /** 字符串方言名，或 API 返回的 primary_dialect 对象 */
    dialect: {
      type: [String, Object],
      default: '',
    },
  },
  computed: {
    label() {
      if (!this.dialect) return '';
      if (typeof this.dialect === 'string') return this.dialect.trim();
      return (
        this.dialect.name
        || this.dialect.qualified_code
        || this.dialect.code
        || ''
      ).trim();
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
