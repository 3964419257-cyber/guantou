import { toLoginPage } from '@/routers/login';
import { notify } from '@/services/feedback';

/**
 * 乡音保护动作表（W1-E2 / 初稿 §1.1「需登录」能力清单）
 *
 * 新增保护动作必须改这张表；名称对应产品话术，尤其是 use_same =「用同款」。
 * action 不在表内 → requireAuth 直接放行（查词、听音、看公开流）。
 *
 * | action | 用户感知 | 典型入口 |
 * |--------|----------|----------|
 * | record_can | 录方言罐头 | 发布器、词条 CTA |
 * | publish_post | 发博文 | 发布器提交 |
 * | use_same | 用同款 | Feed / 罐头详情 |
 * | like | 赞 | Feed / 详情 |
 * | comment | 评论 | 详情 |
 * | follow | 关注 | Feed / 主页 |
 * | circle_join | 加入方言圈 | 圈子详情 |
 * | dm | 私信 | 主页 |
 * | tab_publish | 点底部/首页发布 | TabBar / 首页装罐 |
 * | tab_like | 点底部赞 | TabBar |
 * | tab_follow | 关注流入口 | 若有 |
 */
export const PROTECTED_ACTIONS = {
  // —— 初稿 §1.1 第一周必须入库 ——
  record_can: '录一罐',
  publish_post: '发布',
  use_same: '用同款',
  like: '点赞',
  comment: '评论',
  follow: '关注',
  circle_join: '加入方言圈',
  dm: '私信',
  tab_publish: '发布',
  tab_like: '点赞',
  tab_follow: '关注流',
  // —— 产品扩展（同样走唯一守卫，禁止页面私自跳登录）——
  comment_like: '赞评论',
  nameplate_support: '支持铭牌',
  nameplate_create: '贴铭牌',
  pronunciation_create: '添加读音',
  shelf_create: '创建集盒',
  shelf_edit: '编辑集盒',
  open_mine: '查看我的',
  open_can_library: '查看罐头库',
};

const STORAGE_KEY = 'auth_intercept_intent';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isProtectedAction(action) {
  return Object.prototype.hasOwnProperty.call(PROTECTED_ACTIONS, action);
}

export function actionLabel(action) {
  return PROTECTED_ACTIONS[action] || action || '';
}

export function isLoggedIn() {
  return Boolean(uni.getStorageSync('token'));
}

/**
 * @param {{ action: string, context?: object, createdAt?: number, voluntary?: boolean }} intent
 */
export function saveInterceptIntent(intent) {
  const payload = {
    action: intent.action,
    context: intent.context || {},
    createdAt: intent.createdAt || Date.now(),
    voluntary: Boolean(intent.voluntary),
  };
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

/** 只读不清；超过 24h 视为过期并清除 */
export function peekInterceptIntent() {
  const raw = uni.getStorageSync(STORAGE_KEY);
  if (!raw) return null;
  try {
    const intent = JSON.parse(raw);
    if (!intent.createdAt || Date.now() - intent.createdAt > MAX_AGE_MS) {
      uni.removeStorageSync(STORAGE_KEY);
      return null;
    }
    return intent;
  } catch (error) {
    uni.removeStorageSync(STORAGE_KEY);
    return null;
  }
}

export function clearInterceptIntent() {
  uni.removeStorageSync(STORAGE_KEY);
}

/**
 * requireAuth(action, context?) → boolean
 * true  = 已登录（或该动作无需登录），调用方继续业务
 * false = 未登录，已存意图并跳转登录，调用方必须立刻 return
 *
 * 禁止：先改本地 liked/following 再判断登录；禁止各页直接 navigate(login) 丢意图。
 */
export function requireAuth(action, context = {}) {
  if (!isProtectedAction(action)) return true;
  if (isLoggedIn()) return true;
  saveInterceptIntent({ action, context });
  notify({ title: '请先登录' });
  toLoginPage();
  return false;
}

export default {
  PROTECTED_ACTIONS,
  actionLabel,
  clearInterceptIntent,
  isLoggedIn,
  isProtectedAction,
  peekInterceptIntent,
  requireAuth,
  saveInterceptIntent,
};
