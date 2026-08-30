/**
 * Theme-center data contract: enums, DTO mapping, style_json injection,
 * and local/cloud storage field names. Catalog pages keep internal ids;
 * API payloads and snapshots use the names in docs/THEME_CENTER_DATA.md.
 */
import { isWechatMiniProgram } from '@/services/platform';
import { parseThemeStyle } from '@/services/themeFault';
import {
  applyTheme,
  getAccentPreference,
  getEffectPreference,
  getGhostLookPreference,
  getPrimaryLookPreference,
  getThemePreference,
} from '@/services/theme';

export const TERMINAL_H5 = 'h5';
export const TERMINAL_MP = 'miniprogram';
export const THEME_TERMINALS = [TERMINAL_H5, TERMINAL_MP];

export const PRIVILEGE_FREE = 'free';
export const PRIVILEGE_MEMBER = 'member';
export const PRIVILEGE_ACTIVITY = 'activity';
export const PRIVILEGE_CREATOR = 'creator';

export const PRIVILEGE_TYPES = [
  PRIVILEGE_FREE,
  PRIVILEGE_MEMBER,
  PRIVILEGE_ACTIVITY,
  PRIVILEGE_CREATOR,
];

export const ITEM_STATUS_AVAILABLE = 'available';
export const ITEM_STATUS_COMING = 'coming';
export const ITEM_STATUS_DEPRECATED = 'deprecated';

export const ITEM_STATUSES = [
  ITEM_STATUS_AVAILABLE,
  ITEM_STATUS_COMING,
  ITEM_STATUS_DEPRECATED,
];

export const ITEM_TYPE_THEME = 'theme';
export const ITEM_TYPE_DECORATION = 'decoration';

export const COMPONENT_NAV_BAR = 'nav_bar';
export const COMPONENT_TAB_BAR = 'tab_bar';
export const COMPONENT_BUTTON = 'button';
export const COMPONENT_CARD = 'card';
export const COMPONENT_HOME_BG = 'home_bg';
export const COMPONENT_AVATAR_FRAME = 'avatar_frame';
export const COMPONENT_COMMENT_BUBBLE = 'comment_bubble';
export const COMPONENT_TOPIC_CARD = 'topic_card';
export const COMPONENT_INPUT_BOX = 'input_box';

export const COMPONENT_TYPES = [
  COMPONENT_NAV_BAR,
  COMPONENT_TAB_BAR,
  COMPONENT_BUTTON,
  COMPONENT_CARD,
  COMPONENT_HOME_BG,
  COMPONENT_AVATAR_FRAME,
  COMPONENT_COMMENT_BUBBLE,
  COMPONENT_TOPIC_CARD,
  COMPONENT_INPUT_BOX,
];

export const MP_NATIVE_COMPONENTS = [COMPONENT_NAV_BAR, COMPONENT_TAB_BAR];

export const DIALECT_TAG_VALUES = {
  chuankiang: '川渝',
  wuyu: '江南吴语',
  yue: '岭南粤韵',
  minnan: '闽台闽南',
  jinshan: '北方晋陕',
  xiangchu: '湘楚潇湘',
  yungui: '云贵滇黔',
};

export const STYLE_TAG_VALUES = {
  simple: '简约',
  dialect: '地域方言风',
  retro: '复古',
  cyber: '赛博',
  guofeng: '国风',
  street: '市井烟火',
  festival: '节日限定',
  anime: '二次元',
  dark: '极简暗色',
  nav: '导航栏',
  tabbar: '底部Tab',
  buttons: '交互按钮',
  cards: '罐头卡片',
  profile: '个人主页',
  avatar: '头像挂件',
  comment: '评论区',
  topic: '话题卡片',
  chrome: '弹窗输入框',
};

export const GROUP_COMPONENT_TYPE = {
  navbar: COMPONENT_NAV_BAR,
  'navbar-font': COMPONENT_NAV_BAR,
  tabbar: COMPONENT_TAB_BAR,
  'tabbar-ornament': COMPONENT_TAB_BAR,
  actions: COMPONENT_BUTTON,
  'actions-dialect': COMPONENT_BUTTON,
  cards: COMPONENT_CARD,
  'cards-tag': COMPONENT_CARD,
  'cards-badge': COMPONENT_CARD,
  profile: COMPONENT_HOME_BG,
  'profile-card': COMPONENT_HOME_BG,
  'profile-grid': COMPONENT_HOME_BG,
  'profile-voice': COMPONENT_HOME_BG,
  avatar: COMPONENT_AVATAR_FRAME,
  'avatar-float': COMPONENT_AVATAR_FRAME,
  'avatar-comment': COMPONENT_AVATAR_FRAME,
  'comment-bubble': COMPONENT_COMMENT_BUBBLE,
  'comment-tag': COMPONENT_COMMENT_BUBBLE,
  'topic-card': COMPONENT_TOPIC_CARD,
  'topic-challenge': COMPONENT_TOPIC_CARD,
  'dialog-sheet': COMPONENT_INPUT_BOX,
  'toast-style': COMPONENT_INPUT_BOX,
  'input-compose': COMPONENT_INPUT_BOX,
  'input-comment': COMPONENT_INPUT_BOX,
};

export const THEME_API_PATHS = {
  themes: '/themes/',
  decorations: '/decorations/',
  collects: '/users/theme/collects/',
  mixes: '/users/theme/mixes/',
  config: '/users/theme/config/',
  apply: '/users/theme/apply/',
  events: '/users/theme/events/',
  entitlement: '/users/theme/entitlement/',
};

export const THEME_DATA_KEYS = {
  theme_cache: 'theme_cache',
  decoration_cache: 'decoration_cache',
  local_current_config: 'local_current_config',
  local_collect_list: 'local_collect_list',
  local_saved_mix: 'local_saved_mix',
};

const CAMEL_TO_VAR = {
  borderColor: '--dress-border-color',
  borderWidth: '--dress-border-width',
  borderRadius: '--dress-border-radius',
  shadow: '--dress-shadow',
  background: '--dress-background',
  color: '--dress-color',
  fontFamily: '--dress-font-family',
  fontSize: '--dress-font-size',
  accent: '--dress-accent',
  pageColor: '--page-color',
  surfaceColor: '--surface-color',
};

function isSafeCssValue(value) {
  if (!value || /[;{}]/.test(value)) return false;
  return /^(var\(--|#|[0-9.]|none|solid|transparent|inset)/.test(value);
}
const TOKEN_KEY = /^--[a-z0-9-]+$/;
const APPEARANCE_KEYS = new Set(['accent', 'primaryLook', 'ghostLook', 'effect']);

let appliedVarKeys = [];

export function currentTerminal() {
  return isWechatMiniProgram() ? TERMINAL_MP : TERMINAL_H5;
}

export function toPrivilegeType(access) {
  if (access === 'event') return PRIVILEGE_ACTIVITY;
  return PRIVILEGE_TYPES.includes(access) ? access : PRIVILEGE_FREE;
}

export function fromPrivilegeType(privilege) {
  if (privilege === PRIVILEGE_ACTIVITY) return 'event';
  return PRIVILEGE_TYPES.includes(privilege) ? privilege : PRIVILEGE_FREE;
}

export function toItemStatus(item) {
  if (!item || item.removed || item.retired || item.eventStatus === 'ended') {
    return ITEM_STATUS_DEPRECATED;
  }
  if (!item.available) return ITEM_STATUS_COMING;
  return ITEM_STATUS_AVAILABLE;
}

export function componentTypeOf(groupId) {
  return GROUP_COMPONENT_TYPE[groupId] || COMPONENT_CARD;
}

export function isNativeComponent(componentType) {
  return MP_NATIVE_COMPONENTS.includes(componentType);
}

export function defaultSupportTerminal(mpBlocked = false) {
  return mpBlocked ? [TERMINAL_H5] : [...THEME_TERMINALS];
}

export function supportsTerminal(item, { group, isMiniProgram } = {}) {
  const terminals = item?.support_terminal
    || defaultSupportTerminal(Boolean(group?.mpBlocked));
  const current = isMiniProgram ? TERMINAL_MP : TERMINAL_H5;
  return terminals.includes(current);
}

export function dialectTagsOf(item) {
  if (Array.isArray(item?.dialect_tags) && item.dialect_tags.length) {
    return item.dialect_tags;
  }
  const label = DIALECT_TAG_VALUES[item?.region];
  return label ? [label] : [];
}

export function styleTagsOf(item, group) {
  if (Array.isArray(item?.style_tags) && item.style_tags.length) {
    return item.style_tags;
  }
  const tags = [];
  const category = STYLE_TAG_VALUES[item?.category || group?.category];
  if (category) tags.push(category);
  return tags;
}

export function toThemeItem(item) {
  if (!item) return null;
  return {
    theme_id: item.theme_id || item.id,
    name: item.name,
    desc: item.desc || item.description || '',
    cover_img: item.cover_img || item.preview || 'default',
    style_json: item.style_json && typeof item.style_json === 'object' ? item.style_json : {},
    style_tags: styleTagsOf(item),
    dialect_tags: dialectTagsOf(item),
    privilege_type: toPrivilegeType(item.privilege_type || item.access),
    get_condition: item.get_condition || item.blurb || '',
    status: item.status || toItemStatus(item),
    support_terminal: item.support_terminal || defaultSupportTerminal(false),
    create_time: item.create_time || 0,
    like_count: Number(item.like_count || 0),
    collect_count: Number(item.collect_count || 0),
    share_count: Number(item.share_count || 0),
  };
}

export function toDecorationItem(item, group) {
  if (!item) return null;
  const mpBlocked = Boolean(group?.mpBlocked);
  return {
    decoration_id: item.decoration_id || item.id,
    name: item.name,
    desc: item.desc || item.description || '',
    cover_img: item.cover_img || item.preview || 'default',
    style_json: item.style_json && typeof item.style_json === 'object' ? item.style_json : {},
    component_type: item.component_type || componentTypeOf(item.group || group?.id),
    style_tags: styleTagsOf(item, group),
    dialect_tags: dialectTagsOf(item),
    privilege_type: toPrivilegeType(item.privilege_type || item.access),
    get_condition: item.get_condition || item.blurb || '',
    status: item.status || toItemStatus(item),
    support_terminal: item.support_terminal || defaultSupportTerminal(mpBlocked),
    create_time: item.create_time || 0,
    like_count: Number(item.like_count || 0),
    collect_count: Number(item.collect_count || 0),
    share_count: Number(item.share_count || 0),
  };
}

export function fromThemeItem(dto) {
  if (!dto) return null;
  return {
    id: dto.theme_id || dto.id,
    name: dto.name,
    description: dto.desc || dto.description || '',
    blurb: dto.get_condition || dto.blurb || '',
    preview: dto.cover_img || dto.preview || 'default',
    style_json: dto.style_json || {},
    style_tags: dto.style_tags || [],
    dialect_tags: dto.dialect_tags || [],
    access: fromPrivilegeType(dto.privilege_type),
    available: (dto.status || ITEM_STATUS_AVAILABLE) === ITEM_STATUS_AVAILABLE,
    removed: dto.status === ITEM_STATUS_DEPRECATED,
    eventStatus: dto.status === ITEM_STATUS_DEPRECATED ? 'ended' : undefined,
    support_terminal: dto.support_terminal || [...THEME_TERMINALS],
    create_time: dto.create_time || 0,
  };
}

export function fromDecorationItem(dto) {
  if (!dto) return null;
  const themeLike = fromThemeItem({ ...dto, theme_id: dto.decoration_id });
  return {
    ...themeLike,
    id: dto.decoration_id || dto.id,
    group: dto.group,
    component_type: dto.component_type,
  };
}

export function toCollectList(favorites = { themes: [], dresses: [] }) {
  const collectList = [];
  (favorites.themes || []).forEach((id) => {
    collectList.push({
      item_id: id,
      item_type: ITEM_TYPE_THEME,
      collect_time: 0,
    });
  });
  (favorites.dresses || []).forEach((id) => {
    collectList.push({
      item_id: id,
      item_type: ITEM_TYPE_DECORATION,
      collect_time: 0,
    });
  });
  return { collect_list: collectList };
}

export function toSavedMix(outfit) {
  if (!outfit) return null;
  return {
    mix_id: outfit.mix_id || outfit.id,
    mix_name: outfit.mix_name || outfit.name,
    global_theme_id: outfit.global_theme_id || outfit.themeId,
    decoration_ids: outfit.decoration_ids
      || Object.values(outfit.localDress || {}),
    decoration_map: outfit.decoration_map || Object.fromEntries(
      Object.entries(outfit.localDress || {}).map(([groupId, itemId]) => (
        [componentTypeOf(groupId), itemId]
      )),
    ),
    create_time: outfit.create_time || outfit.savedAt || 0,
  };
}

export function fromSavedMix(mix) {
  if (!mix) return null;
  const decorationIds = mix.decoration_ids || [];
  const localDress = { ...(mix.localDress || {}) };
  if (!Object.keys(localDress).length) {
    decorationIds.forEach((id) => {
      localDress[id] = id;
    });
  }
  return {
    id: mix.mix_id || mix.id,
    name: mix.mix_name || mix.name,
    themeId: mix.global_theme_id || mix.themeId,
    localDress,
    savedAt: mix.create_time || mix.savedAt || 0,
  };
}

export function toCurrentConfig({
  themeId,
  localDress = {},
  overlay = true,
  recent = [],
} = {}) {
  const decorationMap = {};
  Object.entries(localDress).forEach(([groupId, itemId]) => {
    decorationMap[componentTypeOf(groupId)] = itemId;
  });
  return {
    global_theme_id: themeId,
    decoration_map: decorationMap,
    is_cover_local_decoration: Boolean(overlay),
    recent_use_list: (recent || []).slice(0, 8).map((row) => ({
      item_id: row.item_id || row.id,
      item_type: row.item_type || (row.kind === 'dress' ? ITEM_TYPE_DECORATION : ITEM_TYPE_THEME),
      use_time: row.use_time || row.usedAt || 0,
    })),
  };
}

export function fromCurrentConfig(dto, resolveDressGroup) {
  if (!dto) return null;
  const localDress = {};
  Object.entries(dto.decoration_map || {}).forEach(([componentType, itemId]) => {
    const group = typeof resolveDressGroup === 'function'
      ? resolveDressGroup(String(itemId), componentType)
      : '';
    if (group && itemId) localDress[group] = String(itemId);
  });
  return {
    themeId: dto.global_theme_id || dto.themeId || 'default',
    localDress,
    overlay: dto.is_cover_local_decoration !== false,
    recent: (dto.recent_use_list || []).map((row) => ({
      kind: row.item_type === ITEM_TYPE_DECORATION ? 'dress' : 'theme',
      id: row.item_id || row.id,
      group: typeof resolveDressGroup === 'function'
        ? (resolveDressGroup(String(row.item_id || row.id), '') || '')
        : '',
      usedAt: row.use_time || row.usedAt || 0,
    })),
  };
}

export function flattenStyleJson(style, componentType = '') {
  const parsed = parseThemeStyle(style);
  if (!parsed.ok) {
    return {
      ok: false,
      vars: {},
      appearance: {},
      reason: parsed.reason,
    };
  }
  const source = parsed.style && typeof parsed.style === 'object' ? parsed.style : {};
  const vars = {};
  const appearance = {};
  Object.entries(source).forEach(([key, raw]) => {
    const value = String(raw || '').trim();
    if (!value) return;
    if (APPEARANCE_KEYS.has(key)) {
      appearance[key] = value;
      return;
    }
    const cssKey = TOKEN_KEY.test(key) ? key : CAMEL_TO_VAR[key];
    if (!cssKey) return;
    if (!isSafeCssValue(value)) return;
    const scoped = componentType
      ? cssKey.replace('--dress-', `--dress-${componentType.replace(/_/g, '-')}-`)
      : cssKey;
    vars[scoped] = value;
  });
  return { ok: true, vars, appearance };
}

export function resolveOutfitStyle({
  theme,
  dressItems = [],
  overlay = false,
  isMiniProgram = false,
} = {}) {
  const layers = [];
  const skipped = [];
  const themeFlat = flattenStyleJson(theme?.style_json);
  if (!themeFlat.ok) {
    return {
      ok: false,
      reason: 'style',
      vars: {},
      appearance: {},
      skipped: [{ reason: 'style', item: theme }],
    };
  }
  layers.push({ source: 'theme', vars: themeFlat.vars, appearance: themeFlat.appearance });
  if (!overlay) {
    dressItems.forEach((entry) => {
      const item = entry.item || entry;
      const { group } = entry;
      const componentType = item.component_type || componentTypeOf(item.group || group?.id);
      if (isMiniProgram && isNativeComponent(componentType)) {
        skipped.push({ item, reason: 'native' });
        return;
      }
      if (!supportsTerminal(item, { group, isMiniProgram })) {
        skipped.push({ item, reason: 'terminal' });
        return;
      }
      const flat = flattenStyleJson(item.style_json, componentType);
      if (!flat.ok) {
        skipped.push({ item, reason: 'style' });
        return;
      }
      layers.push({ source: 'dress', vars: flat.vars, appearance: flat.appearance });
    });
  }
  const vars = {};
  const appearance = { ...themeFlat.appearance };
  layers.forEach((layer) => {
    Object.assign(vars, layer.vars);
    Object.assign(appearance, layer.appearance);
  });
  return {
    ok: true,
    vars,
    appearance,
    skipped,
    overlay,
  };
}

function writeDocumentVars(vars) {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;
  appliedVarKeys.forEach((key) => {
    root.style.removeProperty(key);
  });
  appliedVarKeys = Object.keys(vars);
  appliedVarKeys.forEach((key) => {
    root.style.setProperty(key, vars[key]);
  });
}

export function applyOutfitStyle(resolved) {
  if (!resolved?.ok) {
    writeDocumentVars({});
    applyTheme();
    return { ok: false, fallback: 'default', skipped: resolved?.skipped || [] };
  }
  writeDocumentVars(resolved.vars);
  if (resolved.appearance && Object.keys(resolved.appearance).length) {
    applyTheme(
      getThemePreference(),
      resolved.appearance.accent || getAccentPreference(),
      resolved.appearance.primaryLook || getPrimaryLookPreference(),
      resolved.appearance.ghostLook || getGhostLookPreference(),
      resolved.appearance.effect || getEffectPreference(),
    );
  }
  return { ok: true, skipped: resolved.skipped || [] };
}

export function clearOutfitStyleVars() {
  writeDocumentVars({});
  appliedVarKeys = [];
}
