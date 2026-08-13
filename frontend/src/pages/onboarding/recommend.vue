<template>
  <PageShell
    title="推荐关注"
    :show-back="false"
    :scroll="true"
  >
    <view class="hero">
      <text class="headline">
        关注几位同方言的人
      </text>
      <text class="sub">
        首页会更有意思。完整推荐列表在下一期（W3-E2）接入，先可跳过进入首页。
      </text>
    </view>

    <view class="placeholder">
      <text class="placeholder-title">
        「{{ dialectLabel }}」创作者推荐即将上线
      </text>
      <text class="placeholder-sub">
        稍后也可在发现里再看。
      </text>
    </view>

    <view class="footer">
      <button
        class="btn ghost"
        @tap="goHome"
      >
        跳过推荐，直接进首页
      </button>
      <button
        class="btn primary"
        @tap="goHome"
      >
        进入首页
      </button>
    </view>
  </PageShell>
</template>

<script>
import PageShell from '@/components/PageShell.vue';
import { toIndexPage } from '@/routers';

export default {
  components: { PageShell },
  data() {
    return {
      primaryDialect: '',
    };
  },
  computed: {
    dialectLabel() {
      return this.primaryDialect || '同方言';
    },
  },
  onLoad() {
    const user = getApp().globalData.userInfo || {};
    this.primaryDialect = user.primary_dialect || '';
  },
  methods: {
    goHome() {
      toIndexPage(true);
    },
  },
};
</script>

<style scoped>
.hero {
  margin-bottom: 36rpx;
}

.headline {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
  color: #1d2a24;
}

.sub {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.55;
  color: #6c776e;
}

.placeholder {
  padding: 48rpx 32rpx;
  background: #fff;
  border: 1px dashed #c5d9cd;
  border-radius: 14rpx;
  text-align: center;
}

.placeholder-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1f5c43;
}

.placeholder-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #6c776e;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 20rpx 28rpx calc(20rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(246, 247, 243, 0), #f6f7f3 28%);
  box-sizing: border-box;
}

.btn {
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

.btn.ghost {
  color: #1d2a24;
  background: #fff;
  border: 1px solid #e1e6dc;
}
</style>
