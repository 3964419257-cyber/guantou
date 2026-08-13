import { toIndexPage } from '@/routers';

/**
 * 是否需要强制进入方言身份引导
 */
export function needsDialectOnboarding(userInfo) {
  if (!userInfo) return false;
  return !((userInfo.primary_dialect || '').trim());
}

/**
 * 前往首次方言身份引导
 */
export function toDialectOnboardingPage(closeAll = false) {
  const url = '/pages/onboarding/dialect';
  if (closeAll) {
    uni.reLaunch({ url });
  } else {
    uni.navigateTo({ url });
  }
}

/**
 * 前往冷启动推荐关注（W3-E2 占位）
 */
export function toRecommendFollowPage(closeAll = false) {
  const url = '/pages/onboarding/recommend';
  if (closeAll) {
    uni.reLaunch({ url });
  } else {
    uni.navigateTo({ url });
  }
}

/**
 * 登录后分流：缺主方言 → 引导；否则回首页/我的
 */
export function routeAfterAuth(userInfo, { preferMe = false } = {}) {
  if (needsDialectOnboarding(userInfo)) {
    toDialectOnboardingPage(true);
    return 'onboarding';
  }
  if (preferMe) {
    uni.reLaunch({ url: '/pages/index?status=me' });
    return 'me';
  }
  toIndexPage(true);
  return 'home';
}
