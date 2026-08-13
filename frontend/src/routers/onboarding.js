/**
 * 方言引导路由兼容层。
 * 登录后强制引导以 `@/services/dialectOnboarding` 为准（pages/users/onboarding）。
 * 本文件保留 W3-E1 多步页与推荐关注入口。
 */
import { toIndexPage } from '@/routers';
import {
  needsDialectOnboarding as needsDialectOnboardingFromService,
  toDialectOnboarding,
} from '@/services/dialectOnboarding';

export function needsDialectOnboarding(userInfo) {
  return needsDialectOnboardingFromService(userInfo);
}

/** @deprecated 请改用 services/dialectOnboarding.toDialectOnboarding */
export function toDialectOnboardingPage(closeAll = false) {
  toDialectOnboarding(undefined, closeAll);
}

export function toRecommendFollowPage(closeAll = false) {
  const url = '/pages/onboarding/recommend';
  if (closeAll) {
    uni.reLaunch({ url });
  } else {
    uni.navigateTo({ url });
  }
}

export function routeAfterAuth(userInfo, { preferMe = false } = {}) {
  if (needsDialectOnboarding(userInfo)) {
    toDialectOnboarding(undefined, true);
    return 'onboarding';
  }
  if (preferMe) {
    uni.reLaunch({ url: '/pages/index?status=me' });
    return 'me';
  }
  toIndexPage(true);
  return 'home';
}
