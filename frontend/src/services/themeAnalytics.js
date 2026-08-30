import { isLoggedIn } from '@/services/authGuard';
import { isWechatMiniProgram } from '@/services/platform';
import {
  accessLabel,
  catalogStatus,
  DIALECT_REGIONS,
  DRESS_CATEGORIES,
  getActiveThemeId,
  getDressGroup,
  THEME_ACCESS_FILTERS,
  THEME_CATEGORIES,
  THEME_SORTS,
} from '@/services/themeCenter';

export const THEME_ANALYTICS_EVENTS = {
  ENTER: 'theme_center_enter',
  TAB_SWITCH: 'theme_tab_switch',
  ITEM_DETAIL: 'theme_item_enter_detail',
  LIST_SCROLL: 'theme_list_scroll',
  FILTER_CLICK: 'theme_filter_click',
  SEARCH: 'theme_search',
  HOT_SEARCH: 'theme_hot_search_click',
  COLLECT: 'theme_collect_click',
  SHARE: 'theme_share_click',
  PREVIEW: 'theme_preview_click',
  APPLY: 'theme_apply_click',
  GET: 'theme_get_click',
  SAVE_MIX: 'theme_save_mix',
  APPLY_MIX: 'theme_apply_mix',
  RESET_ALL: 'theme_reset_all',
  SWITCH_CONFLICT: 'theme_switch_conflict',
  UNSUPPORTED_ENV: 'theme_unsupported_env',
  APPLY_INVALID: 'theme_apply_invalid_item',
};

export const THEME_TAB_LABELS = {
  global: '全局主题',
  local: '局部装扮',
  favorites: '我的收藏',
  mine: '我的装扮',
};

export const THEME_ITEM_TYPES = {
  theme: '全局主题',
  dress: '局部装扮',
};

export const THEME_SHARE_CHANNELS = {
  friend: 'APP私信',
  wechat: '微信',
  mp_share: '小程序转发',
  copy_link: '复制链接',
  save_poster: '保存海报',
};

export const THEME_PREVIEW_TYPES = {
  detail: '大图预览',
  live: '实时模拟预览',
};

export const THEME_APPLY_RESULTS = {
  success: '成功启用',
  no_permission: '权限不足',
  unsupported_env: '环境不支持',
};

export const THEME_GET_METHODS = {
  member: '会员',
  event: '活动',
  creator: '创作者任务',
};

const PRIVACY_KEYS = [
  'nickname',
  'phone',
  'telephone',
  'email',
  'token',
  'avatar',
  'user_id',
  'userid',
  'openid',
  'unionid',
  'visitor_id',
  'name',
];

const QUEUE_LIMIT = 200;
const queue = [];

function wechatApi() {
  if (typeof globalThis === 'undefined') return null;
  const api = globalThis.wx;
  return api && typeof api === 'object' ? api : null;
}

function lookupLabel(list, value, fallback = '') {
  const match = (list || []).find((item) => item.value === value);
  return match?.label || fallback || '';
}

export function themeAnalyticsPlatform() {
  return isWechatMiniProgram() ? 'miniprogram' : 'h5';
}

export function themeItemType(kind) {
  return THEME_ITEM_TYPES[kind] || THEME_ITEM_TYPES.theme;
}

export function themeRegionLabel(region) {
  if (!region || region === 'all') return '';
  return lookupLabel(DIALECT_REGIONS, region, region);
}

export function themeAccessType(item) {
  if (!item) return '';
  return accessLabel(item.access, item);
}

export function themeDressCategoryLabel(category) {
  if (!category || category === 'all') return '';
  return lookupLabel(DRESS_CATEGORIES, category, category);
}

export function describeThemeQuery(query = {}) {
  const regions = (query.regions || [])
    .map((value) => themeRegionLabel(value))
    .filter(Boolean);
  return {
    access_filter: lookupLabel(THEME_ACCESS_FILTERS, query.access, '全部'),
    style_filter: lookupLabel(THEME_CATEGORIES, query.category, '全部'),
    dress_category: themeDressCategoryLabel(query.dressCategory) || '全部',
    region_tags: regions.join(','),
    sort: lookupLabel(THEME_SORTS, query.sort, '最新上架'),
  };
}

export function themeItemContext(kind, item, group) {
  const dressGroup = group || getDressGroup(item?.group);
  return {
    item_id: item?.id || '',
    item_type: themeItemType(kind),
    access_type: themeAccessType(item),
    region_tag: themeRegionLabel(item?.region),
    dress_category: themeDressCategoryLabel(dressGroup?.category),
    catalog_status: catalogStatus(item),
  };
}

function stripPrivacy(payload = {}) {
  const clean = {};
  Object.keys(payload || {}).forEach((key) => {
    if (PRIVACY_KEYS.includes(key)) return;
    const value = payload[key];
    if (value == null || value === '') return;
    clean[key] = value;
  });
  return clean;
}

export function flattenThemeAnalyticsParams(payload = {}) {
  const flat = {};
  Object.keys(payload).forEach((key) => {
    const value = payload[key];
    if (value == null || value === '') return;
    if (Array.isArray(value)) {
      flat[key] = value.map((item) => String(item)).filter(Boolean).slice(0, 40).join(',');
      return;
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
      flat[key] = String(value);
      return;
    }
    if (typeof value === 'object') {
      flat[key] = JSON.stringify(value).slice(0, 256);
      return;
    }
    flat[key] = String(value).slice(0, 256);
  });
  return flat;
}

function trimQueue() {
  if (queue.length > QUEUE_LIMIT) {
    queue.splice(0, queue.length - QUEUE_LIMIT);
  }
}

function reportWeb(event, params) {
  const record = {
    event,
    params,
    transport: 'web',
    at: Date.now(),
  };
  if (typeof window === 'undefined') return;
  if (typeof window.themeAnalyticsReport === 'function') {
    window.themeAnalyticsReport(record);
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', event, params);
  }
  const endpoint = window.themeAnalyticsEndpoint;
  if (endpoint && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      navigator.sendBeacon(endpoint, JSON.stringify(record));
    } catch {
      // ignore transport failures; queue still holds the event
    }
  }
}

function reportMiniProgram(event, params) {
  const wxApi = wechatApi();
  if (wxApi && typeof wxApi.reportEvent === 'function') {
    wxApi.reportEvent(event, params);
    return;
  }
  if (typeof uni !== 'undefined' && typeof uni.report === 'function') {
    uni.report(event, params);
  }
}

export function getThemeAnalyticsQueue() {
  return queue.slice();
}

export function resetThemeAnalyticsQueue() {
  queue.length = 0;
}

export function reportThemeEvent(event, payload = {}) {
  const params = flattenThemeAnalyticsParams(stripPrivacy({
    platform: themeAnalyticsPlatform(),
    ...payload,
  }));
  const record = {
    event,
    params,
    transport: themeAnalyticsPlatform() === 'miniprogram' ? 'miniprogram' : 'web',
    at: Date.now(),
  };
  queue.push(record);
  trimQueue();
  if (record.transport === 'miniprogram') {
    reportMiniProgram(event, params);
  } else {
    reportWeb(event, params);
  }
  import('@/services/themeApi').then(({ postThemeEvent }) => {
    postThemeEvent(event, params.item_id || payload.item_id || '');
  }).catch(() => {});
  return record;
}

export function trackThemeCenterEnter(extra = {}) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.ENTER, {
    logged_in: isLoggedIn() ? 'logged' : 'guest',
    theme_id: extra.themeId || getActiveThemeId(),
  });
}

export function trackThemeTabSwitch(tab) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.TAB_SWITCH, {
    tab: THEME_TAB_LABELS[tab] || tab,
  });
}

export function trackThemeItemDetail(kind, item, group) {
  return reportThemeEvent(
    THEME_ANALYTICS_EVENTS.ITEM_DETAIL,
    themeItemContext(kind, item, group),
  );
}

export function trackThemeListScroll({
  itemIds = [],
  scrollTop = 0,
  query = {},
} = {}) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.LIST_SCROLL, {
    item_ids: itemIds,
    scroll_top: Math.round(Number(scrollTop) || 0),
    ...describeThemeQuery(query),
  });
}

export function trackThemeFilterClick(query = {}) {
  return reportThemeEvent(
    THEME_ANALYTICS_EVENTS.FILTER_CLICK,
    describeThemeQuery(query),
  );
}

export function trackThemeSearch(keyword, resultCount = 0) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.SEARCH, {
    keyword: String(keyword || '').trim(),
    result_count: Number(resultCount) || 0,
  });
}

export function trackThemeHotSearch(keyword) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.HOT_SEARCH, {
    keyword: String(keyword || '').trim(),
  });
}

export function trackThemeCollect(kind, item, favorited) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.COLLECT, {
    ...themeItemContext(kind, item),
    collect_state: favorited ? '收藏' : '取消收藏',
  });
}

export function trackThemeShare(kind, item, channel) {
  const platform = themeAnalyticsPlatform();
  let resolved = channel;
  if (platform === 'miniprogram' && channel === 'wechat') {
    resolved = 'mp_share';
  }
  if (platform === 'miniprogram' && resolved === 'copy_link') {
    return null;
  }
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.SHARE, {
    item_id: item?.id || '',
    item_type: themeItemType(kind),
    share_channel: THEME_SHARE_CHANNELS[resolved] || resolved,
  });
}

export function trackThemePreview(kind, item, previewType) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.PREVIEW, {
    item_id: item?.id || '',
    item_type: kind ? themeItemType(kind) : '',
    preview_type: THEME_PREVIEW_TYPES[previewType] || previewType,
  });
}

export function trackThemeApply({
  kind,
  item,
  fromHistory = false,
  isMix = false,
  result = 'success',
  permission = '',
} = {}) {
  const payload = {
    ...themeItemContext(kind, item),
    from_history: fromHistory ? '1' : '0',
    is_mix: isMix ? '1' : '0',
    apply_result: THEME_APPLY_RESULTS[result] || result,
  };
  if (permission) {
    payload.permission_type = THEME_GET_METHODS[permission] || permission;
  }
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.APPLY, payload);
}

export function trackThemeGet(kind, item, method) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.GET, {
    item_id: item?.id || '',
    item_type: kind ? themeItemType(kind) : '',
    get_method: THEME_GET_METHODS[method] || method,
  });
}

export function trackThemeSaveMix(outfit) {
  const dressIds = Object.values(outfit?.localDress || {});
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.SAVE_MIX, {
    mix_id: outfit?.id || '',
    theme_id: outfit?.themeId || '',
    dress_ids: dressIds,
  });
}

export function trackThemeApplyMix(outfit, { hasUnavailable = false } = {}) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.APPLY_MIX, {
    mix_id: outfit?.id || '',
    has_unavailable: hasUnavailable ? '1' : '0',
  });
}

export function trackThemeResetAll({ themeId, dressCount = 0 } = {}) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.RESET_ALL, {
    theme_id: themeId || getActiveThemeId(),
    dress_count: Number(dressCount) || 0,
  });
}

export function trackThemeSwitchConflict(enabled) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.SWITCH_CONFLICT, {
    overlay: enabled ? '开启' : '关闭',
  });
}

export function trackThemeUnsupportedEnv(kind, item) {
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.UNSUPPORTED_ENV, {
    item_id: item?.id || item?.group || '',
    item_type: kind ? themeItemType(kind) : '',
  });
}

export function trackThemeApplyInvalid(kind, item, status) {
  const resolved = status
    || (item?.eventStatus === 'ended' ? '已绝版' : '已下架');
  return reportThemeEvent(THEME_ANALYTICS_EVENTS.APPLY_INVALID, {
    item_id: item?.id || '',
    item_status: resolved,
  });
}
