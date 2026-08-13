import { listCans } from '@/services/guantou';
import request from '@/utils/request';

export const ONBOARDING_REASONS = {
  MISSING_DIALECT: 'missing_dialect',
  NEW_USER: 'new_user',
  FORCED: 'forced',
};

export const DIALECT_EXAMPLE_WORDS = {
  四川话: { word: '巴适', meaning: '舒服、好、妥帖' },
  粤语: { word: '得闲', meaning: '有空' },
  吴语: { word: '侬好', meaning: '你好' },
  闽南语: { word: '呷饱未', meaning: '吃饱了没' },
  东北话: { word: '整景', meaning: '逗乐子' },
  河南话: { word: '得劲', meaning: '舒服、带劲' },
};

const ALLOWED_WHILE_ONBOARDING = [
  'pages/users/onboarding',
  'pages/login/login',
  'pages/login/register',
  'pages/login/register/wechat',
  'pages/login/forget',
];

export function needsDialectOnboarding(user, isNewFlag = false) {
  // Require a loaded user id so cold-start empty globalData does not flash onboarding.
  if (!user || !user.id) return false;
  if (isNewFlag) return true;
  return !user.primary_dialect;
}

export function normalizeOnboardingReason(reason) {
  if (reason === ONBOARDING_REASONS.NEW_USER) return ONBOARDING_REASONS.NEW_USER;
  if (reason === ONBOARDING_REASONS.FORCED) return ONBOARDING_REASONS.FORCED;
  return ONBOARDING_REASONS.MISSING_DIALECT;
}

export function dialectOnboardingUrl(reason) {
  const normalized = normalizeOnboardingReason(reason);
  return `/pages/users/onboarding?reason=${normalized}`;
}

export function toDialectOnboarding(reason, closeAll = true) {
  const url = dialectOnboardingUrl(reason);
  if (closeAll) {
    uni.reLaunch({ url });
  } else {
    uni.redirectTo({ url });
  }
}

function currentRoutePath() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  const currentRoute = pages.length ? pages[pages.length - 1].route : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  return String(currentRoute || currentPath || '').replace(/^\//, '');
}

function isOnboardingAllowedRoute(route = currentRoutePath()) {
  const normalized = String(route || '').replace(/^\//, '');
  return ALLOWED_WHILE_ONBOARDING.some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`),
  );
}

export function ensureDialectOnboarding(user, reason) {
  if (!needsDialectOnboarding(user, false)) return false;
  if (isOnboardingAllowedRoute()) return true;
  toDialectOnboarding(reason || ONBOARDING_REASONS.FORCED, true);
  return true;
}

export function redirectIfNeedsDialectOnboarding() {
  if (!uni.getStorageSync('token')) return false;
  const app = typeof getApp === 'function' ? getApp() : null;
  const user = app?.globalData?.userInfo;
  return ensureDialectOnboarding(user, ONBOARDING_REASONS.FORCED);
}

export function exampleWordForDialect(dialect) {
  if (!dialect) return null;
  const haystack = `${dialect.name || ''} ${dialect.qualified_code || ''}`;
  const matchedKey = Object.keys(DIALECT_EXAMPLE_WORDS).find((key) => haystack.includes(key));
  return matchedKey ? { key: matchedKey, ...DIALECT_EXAMPLE_WORDS[matchedKey] } : null;
}

export async function loadDialectSample(dialectId) {
  if (!dialectId) return null;
  const response = await listCans({
    dialect_id: dialectId,
    dialect_scope: 'subtree',
    page: 1,
    page_size: 1,
  });
  return (response.results || response || [])[0] || null;
}

export async function saveDialectProfile(userId, {
  nickname,
  primaryDialectId,
  dialectIds = [],
}) {
  const followedDialectIds = [...new Set(
    [primaryDialectId, ...(dialectIds || [])].filter(Boolean),
  )];
  const response = await request.put(`/users/${userId}`, {
    user: {
      nickname: String(nickname || '').trim(),
      primary_dialect_id: primaryDialectId,
      followed_dialect_ids: followedDialectIds,
    },
  });
  if (response.token) uni.setStorageSync('token', response.token);
  const app = getApp();
  app.globalData.userInfo = response.user;
  app.globalData.id = response.user.id;
  return response.user;
}

export async function completeOnboarding(userId, payload) {
  return saveDialectProfile(userId, payload);
}

export default {
  ONBOARDING_REASONS,
  DIALECT_EXAMPLE_WORDS,
  completeOnboarding,
  dialectOnboardingUrl,
  ensureDialectOnboarding,
  exampleWordForDialect,
  loadDialectSample,
  needsDialectOnboarding,
  normalizeOnboardingReason,
  redirectIfNeedsDialectOnboarding,
  saveDialectProfile,
  toDialectOnboarding,
};
