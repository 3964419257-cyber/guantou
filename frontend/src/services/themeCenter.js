/**
 * QQ-style theme store catalog. Default and paper packs are live free themes;
 * paid, event, creator and dialect packs stay gated or upcoming.
 */
import { isLoggedIn } from '@/services/authGuard';
import { isWechatMiniProgram } from '@/services/platform';
import {
  applyThemeRemote,
  claimThemeRemote,
  collectThemeRemote,
  createMixRemote,
  deleteMixRemote,
  renameMixRemote,
  uncollectThemeRemote,
} from '@/services/themeApi';
import {
  captureGuestThemeSnapshot,
  scheduleThemeCloudFlush,
  setThemeLogoutHandler,
  themeResourceHealth,
  writeThemeStorage,
} from '@/services/themeFault';
import {
  applyOutfitStyle,
  clearThemeStyleCache,
  componentTypeOf,
  defaultSupportTerminal,
  fromCurrentConfig,
  fromSavedMix,
  resolveOutfitStyle,
  supportsTerminal,
  THEME_DATA_KEYS,
  toCollectList,
  toCurrentConfig,
  toSavedMix,
} from '@/services/themeSchema';

export const THEME_PACK_STORAGE_KEY = 'ui_theme_pack';
export const THEME_OVERLAY_STORAGE_KEY = 'ui_theme_overlay_local';
export const LOCAL_DRESS_STORAGE_KEY = 'ui_local_dress';
export const THEME_CLOUD_QUEUE_KEY = 'ui_theme_pack_cloud';
export const THEME_MEMBER_STORAGE_KEY = 'ui_theme_member';
export const THEME_OWNED_STORAGE_KEY = 'ui_theme_owned';
export const THEME_CREATOR_STORAGE_KEY = 'ui_theme_creator';
export const THEME_CREATOR_UNLOCKED_KEY = 'ui_theme_creator_unlocked';
export const THEME_SHARDS_STORAGE_KEY = 'ui_theme_shards';

export const ACCESS_FREE = 'free';
export const ACCESS_MEMBER = 'member';
export const ACCESS_EVENT = 'event';
export const ACCESS_CREATOR = 'creator';

export const DEFAULT_THEME_ID = 'default';

export const THEME_CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'simple', label: '简约' },
  { value: 'dialect', label: '地域方言风' },
  { value: 'retro', label: '复古' },
  { value: 'cyber', label: '赛博' },
  { value: 'guofeng', label: '国风' },
  { value: 'street', label: '市井烟火' },
  { value: 'festival', label: '节日限定' },
  { value: 'anime', label: '二次元' },
  { value: 'dark', label: '极简暗色' },
];

export const DIALECT_REGIONS = [
  { value: 'all', label: '全部地域' },
  { value: 'chuankiang', label: '川渝' },
  { value: 'wuyu', label: '江南吴语' },
  { value: 'yue', label: '岭南粤韵' },
  { value: 'minnan', label: '闽台闽南' },
  { value: 'jinshan', label: '北方晋陕' },
  { value: 'xiangchu', label: '湘楚潇湘' },
  { value: 'yungui', label: '云贵滇黔' },
];

export const THEME_FEATURE_ITEMS = [
  '导航栏配色',
  '按钮样式',
  '卡片背景',
  '页面底色',
  '图标色调',
  '轻微地域纹理',
];

export const THEME_ACCESS_FOOTER = [
  '提示：部分限定装扮为限时活动产出，活动结束后将绝版；',
  '会员装扮权益在H5、小程序两端同步；',
  '部分装扮受小程序系统限制，即使拥有也无法生效。',
];

export const THEME_SOCIAL_FOOTER = [
  '提示：收藏仅为个人标记，不会自动解锁装扮；',
  '分享的装扮，好友需要满足对应权限才能使用。',
];

export const THEME_HISTORY_FOOTER = [
  '提示：最近使用记录仅记录你启用过的装扮；保存搭配可一键还原整套界面组合；',
  '已绝版、下架的装扮无法再次启用。',
];

export const THEME_FILTER_FOOTER = [
  '提示：可以通过方言地域标签快速筛选家乡风格装扮；筛选条件会临时保留。',
];

export const THEME_PREVIEW_FOOTER = [
  '提示：实时预览仅模拟展示效果；微信小程序部分系统原生组件不支持自定义装扮。',
];

export const THEME_GUEST_FOOTER = [
  '提示：未登录状态，装扮仅保存在本地，登录后可同步到云端。',
];

export const THEME_PREVIEW_HINT = '预览仅为模拟效果，不会修改你的界面';
export const THEME_PREVIEW_ZOOM_HINT = '双指缩放查看细节，点空白关闭';

export const THEME_PREVIEW_SAMPLE = {
  nickname: '乡音阿宁',
  dialectTag: '川渝',
  cans: [
    { title: '巷口夜市', caption: '示例罐头占位' },
    { title: '渡口晚风', caption: '示例罐头占位' },
  ],
  comments: [
    { name: '阿茶', text: '这罐乡音听着亲切' },
    { name: '阿宁', text: '方言标签也搭得上' },
  ],
  topics: ['市井烟火', '江南吴语'],
};

export const THEME_RECENT_STORAGE_KEY = 'ui_theme_recent';
export const THEME_OUTFIT_STORAGE_KEY = 'ui_theme_outfits';
export const THEME_QUERY_STORAGE_KEY = 'ui_theme_query';
export const THEME_SEARCH_CACHE_KEY = 'ui_theme_search_cache';
export const THEME_RECENT_LIMIT = 8;
export const THEME_OUTFIT_LIMIT = 10;
export const THEME_OUTFIT_NAME_MAX = 20;
export const THEME_SEARCH_KEYWORD_MAX = 64;

export const THEME_FAVORITE_STORAGE_KEY = 'ui_theme_favorites';
export const THEME_LIKE_STORAGE_KEY = 'ui_theme_likes';

export const THEME_SORTS = [
  { value: 'newest', label: '最新上架' },
  { value: 'heat', label: '热度最高' },
  { value: 'free', label: '免费优先' },
  { value: 'name', label: '名称A-Z' },
];

export const THEME_ACCESS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: ACCESS_FREE, label: '免费' },
  { value: ACCESS_MEMBER, label: '会员专属' },
  { value: ACCESS_EVENT, label: '活动限定' },
  { value: ACCESS_CREATOR, label: '方言创作者专属' },
];

export const THEME_STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'usable', label: '可直接使用' },
  { value: 'upcoming', label: '待上线' },
  { value: 'ended', label: '已绝版' },
];

export const THEME_SEARCH_TABS = [
  { value: 'all', label: '全部' },
  { value: 'theme', label: '全局主题' },
  { value: 'dress', label: '局部装扮' },
];

export const THEME_HOT_KEYWORDS = [
  '川渝烟火',
  '江南吴语',
  '方言头像框',
  '岭南粤韵',
  '复古国风',
];

export const FAVORITE_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'theme', label: '全局主题' },
  { value: 'dress', label: '局部装扮' },
];

export const GLOBAL_THEMES = [
  {
    id: DEFAULT_THEME_ID,
    name: '默认方言主题',
    description: '乡野松绿｜统一导航、按钮和卡片配色',
    blurb: '当前唯一可启用的整套视觉。会改导航栏、按钮、卡片、背景和文字色彩，带轻微纹理，不改罐头播放画面。',
    category: 'simple',
    preview: 'default',
    available: true,
    access: ACCESS_FREE,
    tag: '免费',
    support_terminal: ['h5', 'miniprogram'],
    style_json: {
      accent: 'pine',
      primaryLook: 'fill',
      ghostLook: 'line',
      effect: 'none',
    },
  },
  {
    id: 'paper',
    name: '素白纸本',
    description: '田野笔记｜浅底细线、留白克制',
    blurb: '像一本方言调查手册。一键换成浅底细线，不改罐头播放。',
    category: 'simple',
    preview: 'simple',
    available: true,
    access: ACCESS_FREE,
    tag: '免费',
    support_terminal: ['h5', 'miniprogram'],
    style_json: {
      accent: 'pine',
      primaryLook: 'line',
      ghostLook: 'line',
    },
  },
  {
    id: 'member-pine',
    name: '松风会员',
    description: '会员专属｜松绿细纹',
    blurb: '开通会员后可启用。解锁后改导航、按钮和卡片，不改罐头播放。',
    category: 'simple',
    preview: 'simple',
    available: true,
    access: ACCESS_MEMBER,
    tag: '会员专属',
    support_terminal: ['h5', 'miniprogram'],
    style_json: {
      accent: 'pine',
      primaryLook: 'fill',
    },
  },
  {
    id: 'event-lantern',
    name: '同乡灯会',
    description: '活动限定｜同乡灯火',
    blurb: '限时同乡灯会产出。完成后领取，活动结束会绝版。',
    category: 'street',
    preview: 'street',
    available: true,
    access: ACCESS_EVENT,
    eventStatus: 'active',
    tag: '活动限定',
    support_terminal: ['h5', 'miniprogram'],
    style_json: {
      accent: 'clay',
      effect: 'none',
    },
  },
  {
    id: 'event-spring',
    name: '开春乡音',
    description: '活动已结束｜已绝版',
    blurb: '开春乡音活动已结束，新用户无法再获取。',
    category: 'festival',
    preview: 'festival',
    available: true,
    access: ACCESS_EVENT,
    eventStatus: 'ended',
    tag: '已绝版',
    support_terminal: ['h5', 'miniprogram'],
    style_json: {
      accent: 'clay',
    },
  },
  {
    id: 'creator-tile',
    name: '方言达人青瓦',
    description: '创作者专属｜青瓦细纹',
    blurb: '完成方言创作任务后领取，永久可用。',
    category: 'guofeng',
    preview: 'guofeng',
    available: true,
    access: ACCESS_CREATOR,
    tag: '方言创作者专属',
    support_terminal: ['h5', 'miniprogram'],
    style_json: {
      accent: 'pine',
    },
  },
  {
    id: 'chuankiang',
    name: '川渝烟火',
    description: '巴蜀市井热辣风格',
    blurb: '巴蜀市井热辣。上线后换暖色灯火和浅辣椒纹，不改罐头播放。',
    category: 'dialect',
    region: 'chuankiang',
    preview: 'dialect',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'wuyu',
    name: '江南吴语',
    description: '水墨水乡柔和风格',
    blurb: '水墨水乡。上线后换青瓦冷色和浅波纹，不改罐头播放。',
    category: 'dialect',
    region: 'wuyu',
    preview: 'simple',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'yue',
    name: '岭南粤韵',
    description: '岭南复古暖调',
    blurb: '岭南骑楼暖调。上线后换砖红与浅满洲窗纹，不改罐头播放。',
    category: 'dialect',
    region: 'yue',
    preview: 'festival',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'minnan',
    name: '闽台闽南',
    description: '闽南海岛风情',
    blurb: '闽南海岛。上线后换红砖与浅盐田纹，不改罐头播放。',
    category: 'dialect',
    region: 'minnan',
    preview: 'dialect',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'jinshan',
    name: '北方晋陕',
    description: '黄土厚重质朴风格',
    blurb: '黄土质朴。上线后换土色与浅窑纹，不改罐头播放。',
    category: 'dialect',
    region: 'jinshan',
    preview: 'retro',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'xiangchu',
    name: '湘楚潇湘',
    description: '湘楚热烈氛围感',
    blurb: '湘楚热烈。上线后换朱红与浅辣纹，不改罐头播放。',
    category: 'dialect',
    region: 'xiangchu',
    preview: 'festival',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'yungui',
    name: '云贵滇黔',
    description: '云贵高原民族风',
    blurb: '云贵高原。上线后换靛蓝与浅织纹，不改罐头播放。',
    category: 'dialect',
    region: 'yungui',
    preview: 'guofeng',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'mimeograph',
    name: '油印乡刊',
    description: '旧刊栏线｜油墨字迹和纸边',
    blurb: '像一份油印乡刊。上线后可整套换成复古油墨色。',
    category: 'retro',
    preview: 'retro',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'teaslip',
    name: '茶褐笺',
    description: '书房茶渍｜竖排栏与纸边',
    blurb: '偏书房气。上线后可整套换成茶褐笺色。',
    category: 'retro',
    preview: 'retro',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'nightferry',
    name: '夜航电台',
    description: '夜航网格｜赛博播音室',
    blurb: '偏赛博播音室。上线后可整套换成夜航指示灯色。',
    category: 'cyber',
    preview: 'cyber',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'qingshan',
    name: '青绿山水',
    description: '青绿层峦｜国风留白',
    blurb: '国风青绿。上线后换浅山纹底，不改罐头播放。',
    category: 'guofeng',
    preview: 'guofeng',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'sealpaper',
    name: '朱印宣纸',
    description: '朱印方章｜宣纸栏',
    blurb: '宣纸朱印。上线后换浅纸纹，不改罐头播放。',
    category: 'guofeng',
    preview: 'guofeng',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'nightstall',
    name: '夜市灯牌',
    description: '街沿灯火｜市井招牌',
    blurb: '夜市灯牌。上线后换暖灯色和浅招牌纹，不改罐头播放。',
    category: 'street',
    preview: 'street',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'teahouse',
    name: '茶馆木栏',
    description: '木栏茶座｜市井闲谈',
    blurb: '茶馆木栏。上线后换木色浅纹，不改罐头播放。',
    category: 'street',
    preview: 'street',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'duanwu',
    name: '端午蒲艾',
    description: '蒲艾时节｜节日窗口限定',
    blurb: '只在端午窗口出现。上线后可整套换成蒲叶艾草色。',
    category: 'festival',
    preview: 'festival',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'midautumn',
    name: '中秋桂影',
    description: '桂金圆窗｜中秋听罐头',
    blurb: '适合中秋。上线后可整套换成桂金夜色。',
    category: 'festival',
    preview: 'festival',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'pixelbooth',
    name: '像素广播亭',
    description: '像素格子｜二次元播音',
    blurb: '像素格子。上线后换浅网格，不改罐头播放。',
    category: 'anime',
    preview: 'anime',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'starglyph',
    name: '星符乡音',
    description: '星符边框｜二次元乡音',
    blurb: '星符边框。上线后换浅星点，不改罐头播放。',
    category: 'anime',
    preview: 'anime',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'inknight',
    name: '墨夜极简',
    description: '深底细线｜极简暗色',
    blurb: '深底细线。上线后换暗色界面，不改罐头播放。',
    category: 'dark',
    preview: 'dark',
    available: false,
    tag: '敬请期待',
  },
  {
    id: 'voidgrid',
    name: '空格暗网',
    description: '暗网细格｜极简夜航',
    blurb: '暗网细格。上线后换极简暗底，不改罐头播放。',
    category: 'dark',
    preview: 'dark',
    available: false,
    tag: '敬请期待',
  },
];

const DRESS_GROUP_DEFS = [
  {
    id: 'navbar',
    name: '导航栏底色与图标',
    hint: '自定义导航栏底色、图标颜色。小程序原生导航栏无法改。',
    feature: '修改顶部导航栏底色和图标颜色。',
    preview: 'navbar',
    category: 'nav',
    mpBlocked: true,
    defaultName: '系统默认顶栏',
    defaultHint: '跟随当前全局主题的顶栏。',
    upcoming: [
      ['navbar-glyph', '方言符号顶栏', '顶栏加一枚方言小符号。'],
      ['navbar-pattern', '地域纹样顶栏', '顶栏衬一层地域纹样。'],
    ],
  },
  {
    id: 'navbar-font',
    name: '导航栏标题字体',
    hint: '自定义顶栏标题字体。小程序原生导航栏无法改。',
    feature: '修改顶部导航栏标题字体样式。',
    preview: 'navbar',
    category: 'nav',
    mpBlocked: true,
    defaultName: '系统默认标题字',
    defaultHint: '跟随当前全局主题的标题字。',
    upcoming: [
      ['navbar-font-kai', '乡刊楷体', '标题换成乡刊楷体。'],
    ],
  },
  {
    id: 'tabbar',
    name: '底部Tab栏样式',
    hint: '自定义 Tab 图标、选中色和底栏背景。小程序原生 tabBar 无法改。',
    feature: '修改底部导航栏图标、选中态和背景。',
    preview: 'tabbar',
    category: 'tabbar',
    mpBlocked: true,
    defaultName: '系统默认底栏',
    defaultHint: '跟随当前全局主题的底栏。',
    upcoming: [
      ['tabbar-pill', '胶囊底栏', '底栏收成一条胶囊。'],
      ['tabbar-dock', '码头灯标', '选中项像码头灯标。'],
    ],
  },
  {
    id: 'tabbar-ornament',
    name: 'Tab栏小装饰',
    hint: '底栏选中态小点缀。小程序原生 tabBar 无法改。',
    feature: '给底部 Tab 加上小装饰点缀。',
    preview: 'tabbar',
    category: 'tabbar',
    mpBlocked: true,
    defaultName: '系统默认点缀',
    defaultHint: '底栏不加额外点缀。',
    upcoming: [
      ['tabbar-dot', '方言圆点', '选中项旁一枚方言小圆点。'],
    ],
  },
  {
    id: 'actions',
    name: '交互按钮样式',
    hint: '点赞、评论、装一罐、转发、收藏的形状、配色和图标。',
    feature: '修改点赞、评论、装一罐、转发、收藏按钮。',
    preview: 'actions',
    category: 'buttons',
    mpBlocked: false,
    defaultName: '系统默认按钮',
    defaultHint: '点赞、评论、装一罐用当前主题色。',
    upcoming: [
      ['actions-seal', '朱印按键', '操作键收成朱印方块。'],
      ['actions-wave', '水纹轻按', '按下去有一圈水纹。'],
    ],
  },
  {
    id: 'actions-dialect',
    name: '方言趣味按钮',
    hint: '方言趣味图标、地域纹样按钮。',
    feature: '把操作键换成方言趣味图标或地域纹样。',
    preview: 'actions',
    category: 'buttons',
    mpBlocked: false,
    defaultName: '系统默认趣味键',
    defaultHint: '操作键不加方言图标。',
    upcoming: [
      ['actions-pepper', '川渝辣标', '点赞键换成一枚小辣椒。'],
      ['actions-tile', '青瓦按键', '操作键带青瓦纹。'],
    ],
  },
  {
    id: 'cards',
    name: '罐头卡片背景',
    hint: '罐头卡片的背景纹理、圆角和阴影。',
    feature: '修改罐头卡片背景、圆角和阴影。',
    preview: 'cards',
    category: 'cards',
    mpBlocked: false,
    defaultName: '系统默认卡片',
    defaultHint: '罐头卡片跟随全局圆角和底色。',
    upcoming: [
      ['cards-paper', '宣纸折边', '卡片带宣纸折边。'],
      ['cards-brick', '红砖压纹', '卡片底带浅砖纹。'],
    ],
  },
  {
    id: 'cards-tag',
    name: '方言标签样式',
    hint: '罐头卡片里的方言标签、家乡标签样式。',
    feature: '修改罐头卡片上的方言标签和家乡标签。',
    preview: 'cards',
    category: 'cards',
    mpBlocked: false,
    defaultName: '系统默认标签',
    defaultHint: '标签跟随当前主题色。',
    upcoming: [
      ['cards-tag-chip', '乡音胶囊', '方言标签收成一粒胶囊。'],
    ],
  },
  {
    id: 'cards-badge',
    name: '卡片角标装饰',
    hint: '方言达人、本地土著等角标装饰。',
    feature: '给罐头卡片加上方言达人或本地土著角标。',
    preview: 'cards',
    category: 'cards',
    mpBlocked: false,
    defaultName: '系统默认角标',
    defaultHint: '卡片不加额外角标。',
    upcoming: [
      ['cards-badge-local', '本地土著章', '卡片角上一枚本地土著章。'],
      ['cards-badge-voice', '方言达人章', '卡片角上一枚方言达人章。'],
    ],
  },
  {
    id: 'profile',
    name: '个人主页背景',
    hint: '个人中心底图和纹理，不改罐头播放画面。',
    feature: '修改个人中心页面背景和纹理。',
    preview: 'profile',
    category: 'profile',
    mpBlocked: false,
    defaultName: '系统默认主页底',
    defaultHint: '个人中心用当前页面底色。',
    upcoming: [
      ['profile-mist', '江雾纹理', '主页衬一层淡雾。'],
      ['profile-night', '夜航网格', '主页底换成夜航网格。'],
    ],
  },
  {
    id: 'profile-card',
    name: '资料卡片样式',
    hint: '头像区域、方言标签展示卡片。',
    feature: '修改个人主页资料卡片和方言标签展示。',
    preview: 'profile',
    category: 'profile',
    mpBlocked: false,
    defaultName: '系统默认资料卡',
    defaultHint: '资料卡跟随当前主题。',
    upcoming: [
      ['profile-card-lane', '巷口资料卡', '资料卡带巷口栏线。'],
    ],
  },
  {
    id: 'profile-grid',
    name: '主页罐头网格',
    hint: '个人主页罐头网格卡片样式。',
    feature: '修改个人主页罐头网格的卡片样式。',
    preview: 'cards',
    category: 'profile',
    mpBlocked: false,
    defaultName: '系统默认网格',
    defaultHint: '网格卡片跟随全局圆角。',
    upcoming: [
      ['profile-grid-tile', '青瓦网格', '网格卡片带青瓦折边。'],
    ],
  },
  {
    id: 'profile-voice',
    name: '语音签名播放器',
    hint: '方言语音签名的播放按钮装扮。',
    feature: '修改方言语音签名播放按钮的外观。',
    preview: 'actions',
    category: 'profile',
    mpBlocked: false,
    defaultName: '系统默认播放键',
    defaultHint: '语音签名播放键跟随主题色。',
    upcoming: [
      ['profile-voice-wave', '水纹播放键', '播放键带一圈水纹。'],
    ],
  },
  {
    id: 'avatar',
    name: '头像框&装饰挂件',
    hint: '地域纹样、方言文字头像框。',
    feature: '修改头像边框。',
    preview: 'avatar',
    category: 'avatar',
    mpBlocked: false,
    defaultName: '系统默认头像',
    defaultHint: '圆形头像，无额外边框。',
    upcoming: [
      ['avatar-frame', '青瓦圆框', '头像外加一圈青瓦框。'],
      ['avatar-glyph', '方言文字框', '头像框带一圈方言字。'],
    ],
  },
  {
    id: 'avatar-float',
    name: '主页悬浮挂件',
    hint: '方言小符号、家乡小图标，停在页面角落。',
    feature: '在个人主页角落放一枚方言或家乡小挂件。',
    preview: 'avatar',
    category: 'avatar',
    mpBlocked: false,
    defaultName: '系统默认挂件',
    defaultHint: '主页角落不加挂件。',
    upcoming: [
      ['avatar-charm', '乡音挂件', '角落一枚乡音小挂件。'],
    ],
  },
  {
    id: 'avatar-comment',
    name: '评论区头像装饰',
    hint: '评论区头像旁的小装饰。',
    feature: '给评论区头像加上小装饰。',
    preview: 'avatar',
    category: 'avatar',
    mpBlocked: false,
    defaultName: '系统默认评区头像',
    defaultHint: '评论区头像不加装饰。',
    upcoming: [
      ['avatar-comment-dot', '乡音小点', '头像旁一枚乡音小点。'],
    ],
  },
  {
    id: 'comment-bubble',
    name: '评论气泡样式',
    hint: '评论气泡、评论卡片背景。',
    feature: '修改评论气泡和评论卡片背景。',
    preview: 'comment',
    category: 'comment',
    mpBlocked: false,
    defaultName: '系统默认评论气泡',
    defaultHint: '评论气泡跟随当前主题。',
    upcoming: [
      ['comment-paper', '宣纸气泡', '评论气泡像一小张宣纸。'],
    ],
  },
  {
    id: 'comment-tag',
    name: '评论区方言标签',
    hint: '评论区 @ 和方言标签气泡。',
    feature: '修改评论区 @ 与方言标签气泡样式。',
    preview: 'comment',
    category: 'comment',
    mpBlocked: false,
    defaultName: '系统默认评区标签',
    defaultHint: '评论区标签跟随主题色。',
    upcoming: [
      ['comment-tag-chip', '方言标签泡', '方言标签收成一粒小气泡。'],
    ],
  },
  {
    id: 'topic-card',
    name: '方言话题卡片',
    hint: '方言话题卡片、话题标签样式。',
    feature: '修改方言话题卡片和话题标签。',
    preview: 'topic',
    category: 'topic',
    mpBlocked: false,
    defaultName: '系统默认话题卡',
    defaultHint: '话题卡片跟随当前主题。',
    upcoming: [
      ['topic-lane', '巷口话题卡', '话题卡带巷口栏线。'],
    ],
  },
  {
    id: 'topic-challenge',
    name: '方言挑战赛卡片',
    hint: '方言挑战赛卡片装饰。',
    feature: '给方言挑战赛卡片加上装饰。',
    preview: 'topic',
    category: 'topic',
    mpBlocked: false,
    defaultName: '系统默认挑战卡',
    defaultHint: '挑战赛卡片不加额外装饰。',
    upcoming: [
      ['topic-banner', '乡音挑战旗', '挑战卡顶上一面小旗。'],
    ],
  },
  {
    id: 'dialog-sheet',
    name: '弹窗边框背景',
    hint: '弹窗边框、弹窗背景。',
    feature: '修改弹窗边框和背景。',
    preview: 'chrome',
    category: 'chrome',
    mpBlocked: false,
    defaultName: '系统默认弹窗',
    defaultHint: '弹窗跟随当前主题。',
    upcoming: [
      ['dialog-paper', '宣纸弹窗', '弹窗底换成宣纸纹。'],
    ],
  },
  {
    id: 'toast-style',
    name: 'Toast提示框',
    hint: '轻提示框的底色和边框。',
    feature: '修改 Toast 提示框样式。',
    preview: 'chrome',
    category: 'chrome',
    mpBlocked: false,
    defaultName: '系统默认提示',
    defaultHint: '轻提示跟随当前主题。',
    upcoming: [
      ['toast-seal', '朱印提示', '提示框收成一枚小朱印。'],
    ],
  },
  {
    id: 'input-compose',
    name: '装一罐输入框',
    hint: '装一罐输入框，可带方言小装饰。',
    feature: '修改装一罐输入框样式。',
    preview: 'chrome',
    category: 'chrome',
    mpBlocked: false,
    defaultName: '系统默认输入框',
    defaultHint: '装一罐输入框跟随主题。',
    upcoming: [
      ['input-compose-lane', '乡刊输入栏', '输入框带乡刊栏线。'],
    ],
  },
  {
    id: 'input-comment',
    name: '评论输入框',
    hint: '评论输入框，可带方言小装饰。',
    feature: '修改评论输入框样式。',
    preview: 'chrome',
    category: 'chrome',
    mpBlocked: false,
    defaultName: '系统默认评论框',
    defaultHint: '评论输入框跟随主题。',
    upcoming: [
      ['input-comment-chip', '方言边饰框', '评论框角上一枚方言小饰。'],
    ],
  },
];

export function accessLabel(access, extra = {}) {
  if (access === ACCESS_EVENT && extra.eventStatus === 'ended') return '已绝版';
  if (access === ACCESS_MEMBER) return '会员专属';
  if (access === ACCESS_EVENT) return '活动限定';
  if (access === ACCESS_CREATOR) return '方言创作者专属';
  return '免费';
}

export function accessTagClass(item) {
  if (item?.removed || item?.retired) return 'tag-ended';
  if (!item?.preview) return 'tag-soon';
  if (!item?.available) return 'tag-soon';
  if (item.access === ACCESS_EVENT && item.eventStatus === 'ended') return 'tag-ended';
  if (item.access === ACCESS_MEMBER) return 'tag-member';
  if (item.access === ACCESS_EVENT) return 'tag-event';
  if (item.access === ACCESS_CREATOR) return 'tag-creator';
  return 'tag-free';
}

function makeDressItem(
  id,
  group,
  name,
  description,
  available,
  preview,
  access = ACCESS_FREE,
  extra = {},
) {
  return {
    id,
    group,
    name,
    description,
    available,
    access,
    tag: available ? accessLabel(access, extra) : '敬请期待',
    preview,
    ...extra,
  };
}

export const LOCAL_DRESS_GROUPS = DRESS_GROUP_DEFS.map((def) => ({
  id: def.id,
  name: def.name,
  hint: def.hint,
  feature: def.feature,
  preview: def.preview,
  category: def.category,
  mpBlocked: def.mpBlocked,
  component_type: componentTypeOf(def.id),
}));

/** Phase-1 live groups that both H5 and mini program can render. */
export const P1_DRESS_GROUP_IDS = ['cards', 'profile', 'avatar', 'comment-bubble'];

const BUILTIN_DRESS_STYLES = {
  'cards-plain': { borderRadius: '12px' },
  'profile-plain': { background: 'var(--page-color)' },
  'avatar-plain': { borderWidth: '0px' },
  'comment-bubble-plain': { borderRadius: '12px' },
  'navbar-plain': { color: 'var(--text-color)' },
  'tabbar-plain': { background: 'var(--surface-color)' },
  'cards-member': { borderColor: 'var(--accent-color)' },
  'avatar-creator': { borderWidth: '4px' },
};

export const DRESS_CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'nav', label: '导航栏' },
  { value: 'tabbar', label: '底部Tab' },
  { value: 'buttons', label: '交互按钮' },
  { value: 'cards', label: '罐头卡片' },
  { value: 'profile', label: '个人主页' },
  { value: 'avatar', label: '头像挂件' },
  { value: 'comment', label: '评论区' },
  { value: 'topic', label: '话题卡片' },
  { value: 'chrome', label: '弹窗输入框' },
];

export const LOCAL_DRESS_ITEMS = DRESS_GROUP_DEFS.flatMap((def) => [
  makeDressItem(
    `${def.id}-plain`,
    def.id,
    def.defaultName,
    def.defaultHint,
    true,
    def.preview,
  ),
  ...def.upcoming.map(([id, name, description]) => makeDressItem(
    id,
    def.id,
    name,
    description,
    false,
    def.preview,
  )),
]);

LOCAL_DRESS_ITEMS.push(
  makeDressItem(
    'cards-member',
    'cards',
    '会员宣纸卡',
    '会员专属罐头卡片纹理。',
    true,
    'cards',
    ACCESS_MEMBER,
  ),
  makeDressItem(
    'cards-event',
    'cards',
    '灯会罐头卡',
    '同乡灯会限定卡片。',
    true,
    'cards',
    ACCESS_EVENT,
    { eventStatus: 'active' },
  ),
  makeDressItem(
    'avatar-event-end',
    'avatar',
    '开春头像框',
    '开春乡音头像框，活动已结束。',
    true,
    'avatar',
    ACCESS_EVENT,
    { eventStatus: 'ended' },
  ),
  makeDressItem(
    'avatar-creator',
    'avatar',
    '方言达人头像框',
    '完成创作任务后领取。',
    true,
    'avatar',
    ACCESS_CREATOR,
  ),
  makeDressItem(
    'navbar-member',
    'navbar',
    '会员顶栏细纹',
    '会员专属顶栏细纹。',
    true,
    'navbar',
    ACCESS_MEMBER,
  ),
);

LOCAL_DRESS_ITEMS.forEach((item, index) => {
  const def = DRESS_GROUP_DEFS.find((row) => row.id === item.group);
  const builtinStyle = BUILTIN_DRESS_STYLES[item.id] || {};
  LOCAL_DRESS_ITEMS[index] = {
    ...item,
    support_terminal: item.support_terminal || defaultSupportTerminal(Boolean(def?.mpBlocked)),
    component_type: item.component_type || componentTypeOf(item.group),
    style_json: (item.style_json && Object.keys(item.style_json).length)
      ? item.style_json
      : builtinStyle,
  };
});

GLOBAL_THEMES.forEach((item, index) => {
  GLOBAL_THEMES[index] = {
    ...item,
    support_terminal: item.support_terminal || defaultSupportTerminal(false),
    style_json: item.style_json || {},
  };
});

const sessionState = {
  themeId: null,
  localDress: null,
};

let hydratingCloud = false;
let overlayFlushTimer = 0;

function readStorage(key) {
  if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') {
    return '';
  }
  try {
    return uni.getStorageSync(key);
  } catch {
    return '';
  }
}

function writeStorage(key, value) {
  const result = writeThemeStorage(key, value);
  if (!result.ok && result.reason === 'quota') {
    if (key === THEME_PACK_STORAGE_KEY) sessionState.themeId = value;
    if (key === LOCAL_DRESS_STORAGE_KEY) sessionState.localDress = value;
  } else if (result.ok) {
    if (key === THEME_PACK_STORAGE_KEY) sessionState.themeId = null;
    if (key === LOCAL_DRESS_STORAGE_KEY) sessionState.localDress = null;
  }
  return result;
}

export function getMemberStatus() {
  const saved = readStorage(THEME_MEMBER_STORAGE_KEY);
  return saved === '1' || saved === true;
}

export function getOwnedMap() {
  const saved = readStorage(THEME_OWNED_STORAGE_KEY);
  const empty = { themes: [], dresses: [] };
  if (!saved) return empty;
  if (typeof saved === 'string') {
    try {
      const parsed = JSON.parse(saved);
      return {
        themes: [...(parsed.themes || [])],
        dresses: [...(parsed.dresses || [])],
      };
    } catch {
      return empty;
    }
  }
  if (typeof saved === 'object') {
    return {
      themes: [...(saved.themes || [])],
      dresses: [...(saved.dresses || [])],
    };
  }
  return empty;
}

export function isOwned(kind, id) {
  const owned = getOwnedMap();
  const list = kind === 'theme' ? owned.themes : owned.dresses;
  return list.includes(id);
}

function readPairMap(key) {
  const empty = { themes: [], dresses: [] };
  const saved = readStorage(key);
  if (!saved) return empty;
  if (typeof saved === 'string') {
    try {
      const parsed = JSON.parse(saved);
      return {
        themes: [...(parsed.themes || [])],
        dresses: [...(parsed.dresses || [])],
      };
    } catch {
      return empty;
    }
  }
  if (typeof saved === 'object') {
    return {
      themes: [...(saved.themes || [])],
      dresses: [...(saved.dresses || [])],
    };
  }
  return empty;
}

function pairKey(kind) {
  return kind === 'theme' ? 'themes' : 'dresses';
}

export function getFavoriteMap() {
  return readPairMap(THEME_FAVORITE_STORAGE_KEY);
}

export function getLikeMap() {
  return readPairMap(THEME_LIKE_STORAGE_KEY);
}

export function isFavorited(kind, id) {
  return getFavoriteMap()[pairKey(kind)].includes(id);
}

export function isLiked(kind, id) {
  return getLikeMap()[pairKey(kind)].includes(id);
}

export function seedHeat(item) {
  if (Number.isFinite(item?.heat)) return item.heat;
  let total = 36;
  String(item?.id || '').split('').forEach((ch) => {
    total += ch.charCodeAt(0);
  });
  return 24 + (total % 160);
}

export function seedFavoriteCount(item) {
  if (Number.isFinite(item?.favSeed)) return item.favSeed;
  return Math.max(3, Math.floor(seedHeat(item) / 4));
}

function catalogSocialHeat(item) {
  if (!item) return null;
  const hasCatalog = ['collect_count', 'share_count', 'like_count']
    .some((key) => Object.prototype.hasOwnProperty.call(item, key));
  if (!hasCatalog) return null;
  return Number(item.collect_count || 0)
    + Number(item.share_count || 0)
    + Number(item.like_count || 0);
}

export function socialStats(kind, item) {
  const liked = isLiked(kind, item?.id);
  const favorited = isFavorited(kind, item?.id);
  const catalogHeat = catalogSocialHeat(item);
  if (catalogHeat != null) {
    return {
      liked,
      favorited,
      likes: catalogHeat + (liked ? 1 : 0) + (favorited ? 1 : 0),
      favorites: Number(item.collect_count || 0) + (favorited ? 1 : 0),
      shares: Number(item.share_count || 0),
    };
  }
  return {
    liked,
    favorited,
    likes: seedHeat(item) + (liked ? 1 : 0),
    favorites: seedFavoriteCount(item) + (favorited ? 1 : 0),
    shares: 0,
  };
}

export function canShareOrFavorite(item, { favorited = false } = {}) {
  if (!item?.id) return false;
  if (favorited) return true;
  return Boolean(item.available);
}

export function sortCatalog(list, kind, sort = 'newest') {
  const rows = list.map((item, index) => ({ item, index }));
  if (sort === 'heat') {
    rows.sort((left, right) => {
      const leftHeat = socialStats(kind, left.item).likes;
      const rightHeat = socialStats(kind, right.item).likes;
      return rightHeat - leftHeat;
    });
  } else if (sort === 'free') {
    rows.sort((left, right) => {
      const leftFree = (left.item.access || ACCESS_FREE) === ACCESS_FREE ? 0 : 1;
      const rightFree = (right.item.access || ACCESS_FREE) === ACCESS_FREE ? 0 : 1;
      if (leftFree !== rightFree) return leftFree - rightFree;
      return socialStats(kind, right.item).likes - socialStats(kind, left.item).likes;
    });
  } else if (sort === 'name') {
    rows.sort((left, right) => String(left.item.name || '').localeCompare(
      String(right.item.name || ''),
      'zh',
    ));
  } else {
    rows.sort((left, right) => {
      const leftTime = Number(left.item.create_time) || 0;
      const rightTime = Number(right.item.create_time) || 0;
      if (leftTime !== rightTime) return rightTime - leftTime;
      return right.index - left.index;
    });
  }
  return rows.map((row) => row.item);
}

export function getCreatorProgress() {
  const saved = readStorage(THEME_CREATOR_STORAGE_KEY);
  const fallback = {
    cans: 0,
    badge: false,
    challenge: false,
    hometown: false,
  };
  if (!saved || typeof saved !== 'object') return fallback;
  return { ...fallback, ...saved };
}

export function creatorUnlocked() {
  if (isLoggedIn()) {
    const cloud = readStorage(THEME_CREATOR_UNLOCKED_KEY);
    if (cloud === '1' || cloud === true) return true;
    if (cloud === '0' || cloud === false) return false;
  }
  const progress = getCreatorProgress();
  return progress.cans >= 10 && progress.badge && progress.challenge;
}

export function getShards() {
  const saved = readStorage(THEME_SHARDS_STORAGE_KEY);
  const count = Number(saved);
  return Number.isFinite(count) ? count : 0;
}

export function hasPermission(kind, item) {
  if (!item?.available) return false;
  if (item.eventStatus === 'ended') return false;
  const access = item.access || ACCESS_FREE;
  if (access === ACCESS_FREE) return true;
  if (access === ACCESS_MEMBER) return getMemberStatus();
  if (access === ACCESS_CREATOR) return creatorUnlocked() && isOwned(kind, item.id);
  if (access === ACCESS_EVENT) return isOwned(kind, item.id);
  return false;
}

export function isDressBlocked(item, group, isMiniProgram = false) {
  return Boolean(group?.mpBlocked && isMiniProgram)
    || !supportsTerminal(item, { group, isMiniProgram });
}

export function describeAccess(item, kind, { group, isMiniProgram } = {}) {
  const access = item?.access || ACCESS_FREE;
  const blocked = isDressBlocked(item, group, isMiniProgram);
  const health = themeResourceHealth(item);
  if (!item || item.removed || item.retired || health.reason === 'removed') {
    return {
      label: '装扮已下架',
      action: 'removed',
      disabled: true,
      owned: false,
      blocked,
      hint: '装扮已下架',
    };
  }
  if (!item?.available) {
    return {
      label: '敬请期待',
      action: 'soon',
      disabled: true,
      owned: false,
      blocked,
      hint: kind === 'theme' ? '该主题暂未开放，敬请期待' : '装扮素材即将上线',
    };
  }
  if (health.reason === 'resource' || health.reason === 'style') {
    return {
      label: '装扮资源加载异常',
      action: 'broken',
      disabled: true,
      owned: false,
      blocked,
      hint: '装扮资源加载异常',
    };
  }
  const owned = hasPermission(kind, item);
  if (access === ACCESS_EVENT && item.eventStatus === 'ended') {
    return {
      label: '已绝版',
      action: 'ended',
      disabled: true,
      owned,
      blocked,
      hint: '该装扮活动已结束，暂无法获取',
    };
  }
  if (access === ACCESS_MEMBER && !owned) {
    return {
      label: '会员专属',
      action: 'member',
      disabled: false,
      owned: false,
      blocked,
      hint: '该装扮为会员专属，开通会员即可解锁全部会员主题与装扮',
    };
  }
  if (access === ACCESS_EVENT && item.eventStatus === 'active' && !owned) {
    return {
      label: '活动限定',
      action: 'event',
      disabled: false,
      owned: false,
      blocked,
      hint: '限时活动获取，完成后可领取。',
    };
  }
  if (access === ACCESS_CREATOR && !owned) {
    if (!creatorUnlocked()) {
      return {
        label: '方言创作者专属',
        action: 'creator-lock',
        disabled: false,
        owned: false,
        blocked,
        hint: '完成方言创作任务即可解锁，装一罐积累创作成就。',
      };
    }
    return {
      label: '方言创作者专属',
      action: 'claim',
      disabled: false,
      owned: false,
      blocked,
      hint: '已达成创作条件，领取后永久可用。',
    };
  }
  return {
    label: accessLabel(access, item),
    action: blocked ? 'mp-block' : 'enable',
    disabled: blocked,
    owned: true,
    blocked,
    hint: blocked ? '拥有权限，但小程序环境暂不支持该装扮' : '',
  };
}

export function listAcquireOffers() {
  const themes = GLOBAL_THEMES.filter((item) => {
    if (!item.available) return false;
    if (hasPermission('theme', item)) return false;
    return (item.access || ACCESS_FREE) !== ACCESS_FREE;
  });
  const dresses = LOCAL_DRESS_ITEMS.filter((item) => {
    if (!item.available) return false;
    if (hasPermission('dress', item)) return false;
    return (item.access || ACCESS_FREE) !== ACCESS_FREE;
  });
  return { themes, dresses };
}

export function accessActionLabel(accessInfo, { applied = false, kind = 'theme' } = {}) {
  if (applied) return kind === 'theme' ? '已启用' : '已应用';
  if (accessInfo?.action === 'soon') return '敬请期待';
  if (accessInfo?.action === 'ended') return '已绝版';
  if (accessInfo?.action === 'removed') return '装扮已下架';
  if (accessInfo?.action === 'broken') return '无法启用';
  if (accessInfo?.action === 'member') return '去开通会员';
  if (accessInfo?.action === 'event') return '去参与活动';
  if (accessInfo?.action === 'creator-lock') return '去完成创作任务';
  if (accessInfo?.action === 'claim') return '领取';
  if (accessInfo?.action === 'mp-block') return '应用';
  return kind === 'theme' ? '立即启用' : '应用';
}

export function getThemeById(id) {
  return GLOBAL_THEMES.find((item) => item.id === id) || null;
}

export function getActiveThemeId() {
  const saved = sessionState.themeId ?? readStorage(THEME_PACK_STORAGE_KEY);
  const match = GLOBAL_THEMES.find((item) => item.id === saved && item.available && !item.removed);
  return match?.id || DEFAULT_THEME_ID;
}

export function getActiveTheme() {
  return GLOBAL_THEMES.find((item) => item.id === getActiveThemeId()) || GLOBAL_THEMES[0];
}

export function getRenderableTheme() {
  const theme = getActiveTheme();
  if (hasPermission('theme', theme)) return theme;
  return GLOBAL_THEMES.find((item) => item.id === DEFAULT_THEME_ID) || GLOBAL_THEMES[0];
}

export function listThemesByCategory(category = 'all', region = 'all', sort = 'newest') {
  const source = !category || category === 'all'
    ? GLOBAL_THEMES
    : GLOBAL_THEMES.filter((item) => item.category === category);
  const list = category !== 'dialect' || !region || region === 'all'
    ? source
    : source.filter((item) => item.region === region);
  return sortCatalog(list, 'theme', sort);
}

export function listDressGroupsByCategory(category = 'all', { isMiniProgram = false } = {}) {
  const source = !category || category === 'all'
    ? LOCAL_DRESS_GROUPS
    : LOCAL_DRESS_GROUPS.filter((item) => item.category === category);
  if (!isMiniProgram) return source;
  return source.filter((item) => !item.mpBlocked);
}

export function getDressGroup(groupId) {
  return LOCAL_DRESS_GROUPS.find((item) => item.id === groupId) || null;
}

export function listDressItems(groupId, sort = 'newest') {
  return sortCatalog(
    LOCAL_DRESS_ITEMS.filter((item) => item.group === groupId),
    'dress',
    sort,
  );
}

export function getDressItem(itemId) {
  return LOCAL_DRESS_ITEMS.find((item) => item.id === itemId) || null;
}

function readJsonObject(key, fallback) {
  const saved = readStorage(key);
  if (!saved) return { ...fallback };
  if (typeof saved === 'string') {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...fallback, ...parsed };
      }
    } catch {
      return { ...fallback };
    }
    return { ...fallback };
  }
  if (typeof saved === 'object' && !Array.isArray(saved)) {
    return { ...fallback, ...saved };
  }
  return { ...fallback };
}

export function defaultThemeQuery() {
  return {
    keyword: '',
    access: 'all',
    category: 'all',
    dressCategory: 'all',
    regions: [],
    status: 'all',
    sort: 'newest',
    resultTab: 'all',
    searching: false,
  };
}

export function catalogStatus(item) {
  const health = themeResourceHealth(item);
  if (!item || health.reason === 'removed') return 'removed';
  if (health.reason === 'resource' || health.reason === 'style') return 'broken';
  if (!item?.available) return 'upcoming';
  if (item.eventStatus === 'ended') return 'ended';
  return 'usable';
}

export function canLivePreview(item) {
  const status = catalogStatus(item);
  return status === 'usable' || status === 'ended';
}

export function isRemotePreviewSrc(value) {
  const text = String(value || '').trim();
  return /^https?:\/\//i.test(text) || text.startsWith('//') || text.startsWith('/');
}

export function previewCoverOf(item) {
  return item?.cover_img || item?.preview || '';
}

export function previewDetailOf(item) {
  return item?.detail_img || item?.cover_img || item?.preview || '';
}

export function dressDisplayTags(item, group, { applied = false } = {}) {
  const tags = [];
  const category = DRESS_CATEGORIES.find((row) => row.value === group?.category);
  if (category && category.value !== 'all') {
    tags.push({ kind: 'style', label: category.label, className: 'tag-style' });
  }
  const region = DIALECT_REGIONS.find((row) => row.value === item?.region);
  if (region && region.value !== 'all') {
    tags.push({ kind: 'dialect', label: region.label, className: 'tag-dialect' });
  }
  if (item) {
    const ended = item.eventStatus === 'ended' || item.removed;
    if (!ended) {
      tags.push({
        kind: 'access',
        label: accessLabel(item.access || ACCESS_FREE, item),
        className: accessTagClass(item),
      });
    }
    if (applied) {
      tags.push({ kind: 'status', label: '已启用', className: 'tag-active' });
    } else if (!item.available) {
      tags.push({ kind: 'status', label: '待上线', className: 'tag-soon' });
    } else if (ended) {
      tags.push({ kind: 'status', label: '已绝版', className: 'tag-ended' });
    }
  }
  return tags;
}

export function themeDisplayTags(theme, { applied = false } = {}) {
  const tags = [];
  const category = THEME_CATEGORIES.find((row) => row.value === theme?.category);
  if (category && category.value !== 'all') {
    tags.push({ kind: 'style', label: category.label, className: 'tag-style' });
  }
  const region = DIALECT_REGIONS.find((row) => row.value === theme?.region);
  if (region && region.value !== 'all') {
    tags.push({ kind: 'dialect', label: region.label, className: 'tag-dialect' });
  }
  const ended = theme?.eventStatus === 'ended' || theme?.removed;
  if (!ended) {
    tags.push({
      kind: 'access',
      label: accessLabel(theme?.access || ACCESS_FREE, theme || {}),
      className: accessTagClass(theme || {}),
    });
  }
  if (applied) {
    tags.push({ kind: 'status', label: '已启用', className: 'tag-active' });
  } else if (!theme?.available) {
    tags.push({ kind: 'status', label: '待上线', className: 'tag-soon' });
  } else if (ended) {
    tags.push({ kind: 'status', label: '已绝版', className: 'tag-ended' });
  }
  return tags;
}

export function catalogHaystack(kind, item, group) {
  const categoryLabel = kind === 'theme'
    ? THEME_CATEGORIES.find((row) => row.value === item?.category)?.label
    : DRESS_CATEGORIES.find((row) => row.value === group?.category)?.label;
  const regionLabel = DIALECT_REGIONS.find((row) => row.value === item?.region)?.label;
  return [
    item?.name,
    item?.description,
    item?.blurb,
    item?.tag,
    categoryLabel,
    regionLabel,
    group?.name,
    group?.hint,
    accessLabel(item?.access || ACCESS_FREE, item || {}),
    kind === 'theme' ? '全局主题' : '局部装扮',
    ...(Array.isArray(item?.style_tags) ? item.style_tags : []),
    ...(Array.isArray(item?.dialect_tags) ? item.dialect_tags : []),
  ].filter(Boolean).join(' ').toLowerCase();
}

export function cleanSearchKeyword(keyword) {
  const text = String(keyword || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
  return text.slice(0, THEME_SEARCH_KEYWORD_MAX);
}

export function matchKeyword(haystack, keyword) {
  const query = cleanSearchKeyword(keyword).toLowerCase();
  if (!query) return true;
  const text = String(haystack || '');
  if (text.includes(query)) return true;
  const parts = query.split(/[\s,，、]+/).filter(Boolean);
  if (parts.length > 1 && parts.every((part) => text.includes(part))) return true;
  if (/^[\u4e00-\u9fff]{4,}$/.test(query)) {
    const chunks = [];
    for (let index = 0; index < query.length - 1; index += 2) {
      chunks.push(query.slice(index, index + 2));
    }
    if (chunks.some((chunk) => text.includes(chunk))) return true;
  }
  return false;
}

export function matchRegions(item, haystack, regions) {
  if (!regions?.length || regions.includes('all')) return true;
  const text = String(haystack || '');
  return regions.some((value) => {
    if (item?.region === value) return true;
    const label = DIALECT_REGIONS.find((row) => row.value === value)?.label;
    return Boolean(label && text.includes(String(label).toLowerCase()));
  });
}

export function getThemeQuery() {
  return readJsonObject(THEME_QUERY_STORAGE_KEY, defaultThemeQuery());
}

export function getSearchCache() {
  return readJsonObject(THEME_SEARCH_CACHE_KEY, {
    keyword: '',
    ids: [],
    at: 0,
  });
}

export function queryThemeCatalog(query = {}, { isMiniProgram = false } = {}) {
  const next = { ...defaultThemeQuery(), ...query };
  const keyword = cleanSearchKeyword(next.keyword);
  const themes = GLOBAL_THEMES.filter((item) => {
    if (next.access !== 'all' && (item.access || ACCESS_FREE) !== next.access) return false;
    if (next.category !== 'all' && item.category !== next.category) return false;
    if (next.status !== 'all' && catalogStatus(item) !== next.status) return false;
    const haystack = catalogHaystack('theme', item, null);
    if (!matchKeyword(haystack, keyword)) return false;
    return matchRegions(item, haystack, next.regions);
  });
  const dresses = LOCAL_DRESS_ITEMS.filter((item) => {
    const group = getDressGroup(item.group);
    if (next.access !== 'all' && (item.access || ACCESS_FREE) !== next.access) return false;
    if (next.dressCategory !== 'all' && group?.category !== next.dressCategory) return false;
    if (next.status !== 'all' && catalogStatus(item) !== next.status) return false;
    const haystack = catalogHaystack('dress', item, group);
    if (!matchKeyword(haystack, keyword)) return false;
    return matchRegions(item, haystack, next.regions);
  });
  const themeRows = sortCatalog(themes, 'theme', next.sort).map((item) => ({
    kind: 'theme',
    item,
    group: null,
    blocked: false,
  }));
  const dressRows = sortCatalog(dresses, 'dress', next.sort).map((item) => {
    const group = getDressGroup(item.group);
    return {
      kind: 'dress',
      item,
      group,
      blocked: isDressBlocked(item, group, isMiniProgram),
    };
  });
  return {
    themes: themeRows,
    dresses: dressRows,
    all: [...themeRows, ...dressRows],
  };
}

export function getOverlayLocalDress() {
  const saved = readStorage(THEME_OVERLAY_STORAGE_KEY);
  if (saved === '0' || saved === false) return false;
  return true;
}

export function getLocalDressMap() {
  if (sessionState.localDress && typeof sessionState.localDress === 'object') {
    return { ...sessionState.localDress };
  }
  const saved = readStorage(LOCAL_DRESS_STORAGE_KEY);
  if (!saved) return {};
  if (typeof saved === 'string') {
    try {
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === 'object' ? { ...parsed } : {};
    } catch {
      return {};
    }
  }
  if (typeof saved === 'object') return { ...saved };
  return {};
}

function readJsonList(key) {
  const saved = readStorage(key);
  if (!saved) return [];
  if (typeof saved === 'string') {
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(saved) ? [...saved] : [];
}

export function getRecentRaw() {
  return readJsonList(THEME_RECENT_STORAGE_KEY);
}

export function getSavedOutfits() {
  return readJsonList(THEME_OUTFIT_STORAGE_KEY);
}

export function recentUseStatus(kind, item, group, isMiniProgram = false) {
  const health = themeResourceHealth(item);
  if (!item || item.retired || item.removed || health.reason === 'removed') return 'retired';
  if (health.reason === 'resource' || health.reason === 'style') return 'retired';
  if (!item.available) return 'retired';
  if (item.eventStatus === 'ended') return 'ended';
  if (isDressBlocked(item, group, isMiniProgram)) return 'blocked';
  if (!hasPermission(kind, item)) return 'gated';
  return 'ok';
}

export function recentStatusMeta(status, item) {
  if (status === 'ended') {
    return {
      label: '⚠️已绝版',
      hint: '该装扮已绝版，无法再次使用',
      disabled: true,
    };
  }
  if (status === 'blocked') {
    return {
      label: '❌环境不支持',
      hint: '当前环境暂不支持该装扮',
      disabled: true,
    };
  }
  if (status === 'gated') {
    return {
      label: accessLabel(item?.access || ACCESS_MEMBER, item || {}),
      hint: '',
      disabled: true,
    };
  }
  if (status === 'retired') {
    return {
      label: '📦已下架',
      hint: '装扮已下架',
      disabled: true,
    };
  }
  return {
    label: '✅可用',
    hint: '',
    disabled: false,
  };
}

export function recordRecentUse(kind, item) {
  if (!item?.available || item.retired || item.removed) return getRecentRaw();
  if (item.eventStatus === 'ended') return getRecentRaw();
  const group = kind === 'dress' ? item.group : '';
  const next = getRecentRaw().filter((row) => !(row.kind === kind && row.id === item.id));
  next.unshift({
    kind,
    id: item.id,
    group,
    name: item.name,
    preview: item.preview,
    usedAt: Date.now(),
  });
  const trimmed = next.slice(0, THEME_RECENT_LIMIT);
  writeStorage(THEME_RECENT_STORAGE_KEY, trimmed);
  return trimmed;
}

export function listRecentUses({ isMiniProgram = false, kind = 'all' } = {}) {
  return getRecentRaw()
    .filter((row) => (
      row
      && row.id
      && (row.kind === 'theme' || row.kind === 'dress')
      && (kind === 'all' || row.kind === kind)
    ))
    .slice(0, THEME_RECENT_LIMIT)
    .map((row) => {
      const found = row.kind === 'theme' ? getThemeById(row.id) : getDressItem(row.id);
      const item = found || {
        id: row.id,
        name: row.name || '装扮已下架',
        available: false,
        removed: true,
        retired: true,
        preview: row.preview || 'default',
        group: row.group,
      };
      const group = row.kind === 'dress' ? getDressGroup(row.group || item?.group) : null;
      const status = recentUseStatus(row.kind, item, group, isMiniProgram);
      return {
        ...row,
        item,
        group,
        access: item.access,
        region: item.region,
        status,
        ...recentStatusMeta(status, item),
      };
    });
}

export function listOwnedUnused({ isMiniProgram = false } = {}) {
  const applied = getLocalDressMap();
  const themes = GLOBAL_THEMES.filter((item) => (
    hasPermission('theme', item)
    && item.id !== getActiveThemeId()
    && (item.access || ACCESS_FREE) !== ACCESS_FREE
  ));
  const dresses = LOCAL_DRESS_ITEMS.filter((item) => {
    if (!hasPermission('dress', item)) return false;
    if ((item.access || ACCESS_FREE) === ACCESS_FREE) return false;
    return applied[item.group] !== item.id;
  }).map((item) => {
    const group = getDressGroup(item.group);
    const blocked = isDressBlocked(item, group, isMiniProgram);
    return { group, item, blocked };
  });
  return { themes, dresses };
}

export function listAppliedDress({ isMiniProgram = false } = {}) {
  const selected = getLocalDressMap();
  const overlay = getOverlayLocalDress();
  return LOCAL_DRESS_GROUPS.flatMap((group) => {
    const item = getDressItem(selected[group.id]);
    if (!item) return [];
    const blocked = isDressBlocked(item, group, isMiniProgram);
    return [{
      group,
      item,
      empty: false,
      suppressed: overlay,
      blocked,
      effective: !overlay && !blocked && hasPermission('dress', item),
    }];
  });
}

export function listOutfitHubDress({ isMiniProgram = false } = {}) {
  const applied = listAppliedDress({ isMiniProgram });
  const byGroup = Object.fromEntries(applied.map((entry) => [entry.group.id, entry]));
  const overlay = getOverlayLocalDress();
  const seen = new Set();
  const rows = [];
  const pushGroup = (group) => {
    if (!group || seen.has(group.id)) return;
    if (isMiniProgram && group.mpBlocked && !byGroup[group.id]) return;
    seen.add(group.id);
    if (byGroup[group.id]) {
      rows.push(byGroup[group.id]);
      return;
    }
    rows.push({
      group,
      item: null,
      empty: true,
      suppressed: overlay,
      blocked: Boolean(group.mpBlocked && isMiniProgram),
      effective: false,
    });
  };
  P1_DRESS_GROUP_IDS.forEach((id) => pushGroup(getDressGroup(id)));
  applied.forEach((entry) => pushGroup(entry.group));
  return rows;
}

export function listSelectedLocalDress() {
  return listAppliedDress().map((entry) => entry.item.name);
}

export function buildLivePreview({
  theme,
  dressItems = [],
  isMiniProgram = false,
  overlay = false,
} = {}) {
  const skipped = [];
  const effective = [];
  dressItems.forEach((entry) => {
    const group = entry.group || getDressGroup(entry.item?.group);
    const blocked = isDressBlocked(entry.item, group, isMiniProgram);
    const live = canLivePreview(entry.item);
    const inactive = overlay || blocked || !live;
    if (inactive) {
      let hint = '该装扮当前环境不生效';
      if (!live) {
        hint = catalogStatus(entry.item) === 'ended'
          ? '该装扮已绝版，无法再次使用'
          : '装扮素材即将上线';
      } else if (overlay) {
        hint = '已被全局主题覆盖';
      }
      skipped.push({
        item: entry.item,
        group,
        blocked,
        hint,
      });
      return;
    }
    effective.push({
      item: entry.item,
      group,
      blocked: false,
    });
  });
  const shotClass = [`shot-${theme?.preview || 'default'}`];
  effective.forEach((row) => {
    if (row.group?.id) shotClass.push(`dress-${row.group.id}`);
  });
  return {
    theme,
    shotClass,
    skipped,
    nativeLocked: Boolean(isMiniProgram),
    sample: THEME_PREVIEW_SAMPLE,
  };
}

export function composePreviewOutfit({
  themeId,
  localDress,
  overlay,
  extraDress = null,
  isMiniProgram = false,
} = {}) {
  const theme = getThemeById(themeId) || getActiveTheme();
  const overlayFlag = overlay === undefined ? getOverlayLocalDress() : Boolean(overlay);
  const selected = { ...(localDress || getLocalDressMap()) };
  if (extraDress?.group) {
    selected[extraDress.group] = extraDress.id;
  }
  const dressItems = Object.entries(selected).flatMap(([groupId, itemId]) => {
    const item = getDressItem(itemId);
    const group = getDressGroup(groupId);
    if (!item || !group) return [];
    return [{ item, group }];
  });
  return buildLivePreview({
    theme,
    dressItems,
    isMiniProgram,
    overlay: overlayFlag,
  });
}

export function resetThemeSessionState() {
  sessionState.themeId = null;
  sessionState.localDress = null;
  if (overlayFlushTimer) {
    clearTimeout(overlayFlushTimer);
    overlayFlushTimer = 0;
  }
}

export function setActiveThemeId(themeId) {
  const pack = GLOBAL_THEMES.find((item) => item.id === themeId);
  if (!pack?.available) {
    return { ok: false, reason: 'upcoming' };
  }
  const health = themeResourceHealth(pack);
  if (!health.ok) {
    writeStorage(THEME_PACK_STORAGE_KEY, DEFAULT_THEME_ID);
    return {
      ok: false,
      reason: health.reason,
      fallback: DEFAULT_THEME_ID,
    };
  }
  if (!hasPermission('theme', pack)) {
    return { ok: false, reason: pack.access || 'locked' };
  }
  if (pack.eventStatus === 'ended') {
    return { ok: false, reason: 'ended' };
  }
  const written = writeStorage(THEME_PACK_STORAGE_KEY, pack.id);
  const overlay = getOverlayLocalDress();
  const result = {
    ok: true,
    theme: pack,
    overlayCleared: false,
    overlaySuppressed: overlay,
    persisted: written.ok,
  };
  if (!written.ok) result.reason = written.reason;
  return result;
}

function rememberGuestSnapshot() {
  if (isLoggedIn()) return;
  captureGuestThemeSnapshot({
    themeId: getActiveThemeId(),
    overlay: getOverlayLocalDress(),
    localDress: getLocalDressMap(),
    outfits: getSavedOutfits(),
  });
}

function writeContractSnapshots() {
  writeThemeStorage(THEME_DATA_KEYS.local_current_config, toCurrentConfig({
    themeId: getActiveThemeId(),
    localDress: getLocalDressMap(),
    overlay: getOverlayLocalDress(),
    recent: getRecentRaw(),
  }));
  writeThemeStorage(THEME_DATA_KEYS.local_collect_list, toCollectList(getFavoriteMap()));
  writeThemeStorage(
    THEME_DATA_KEYS.local_saved_mix,
    getSavedOutfits().map((outfit) => toSavedMix(outfit)),
  );
}

let lastHydratePerfAt = 0;

function reportHydratePerf({ hydrateMs, layerCount, ok }) {
  const now = Date.now();
  if (now - lastHydratePerfAt < 2000 && ok) return;
  lastHydratePerfAt = now;
  import('@/services/themeAnalytics').then((mod) => {
    mod.trackThemePerfStyle?.({ hydrateMs, layerCount });
    if (!ok) mod.trackThemePerfError?.('style_json');
  }).catch(() => {});
}

export function hydrateOutfitStyle() {
  const started = Date.now();
  const isMiniProgram = isWechatMiniProgram();
  const overlay = getOverlayLocalDress();
  const applied = listAppliedDress({ isMiniProgram });
  const dressItems = overlay ? [] : applied.filter((row) => row.effective);
  const resolved = resolveOutfitStyle({
    theme: getRenderableTheme(),
    dressItems,
    overlay,
    isMiniProgram,
  });
  const result = applyOutfitStyle(resolved);
  reportHydratePerf({
    hydrateMs: Date.now() - started,
    layerCount: 1 + dressItems.length,
    ok: resolved.ok,
  });
  return result;
}

setThemeLogoutHandler(() => {
  resetThemeSessionState();
  clearThemeStyleCache();
  hydrateOutfitStyle();
});

export function mergeRemoteCatalog({ themes = [], dresses = [] } = {}) {
  themes.forEach((remote) => {
    const current = GLOBAL_THEMES.find((item) => item.id === remote.id);
    if (!current) return;
    current.available = remote.available;
    current.removed = Boolean(remote.removed);
    current.eventStatus = remote.eventStatus;
    current.blurb = remote.blurb || current.blurb;
    current.description = remote.description || current.description;
    if (remote.style_json && Object.keys(remote.style_json).length) {
      current.style_json = remote.style_json;
    }
    if ('collect_count' in remote) current.collect_count = Number(remote.collect_count || 0);
    if ('share_count' in remote) current.share_count = Number(remote.share_count || 0);
    if ('like_count' in remote) current.like_count = Number(remote.like_count || 0);
    if (remote.poster_img) current.poster_img = remote.poster_img;
    if (remote.detail_img) current.detail_img = remote.detail_img;
    if (remote.cover_img) current.cover_img = remote.cover_img;
  });
  dresses.forEach((remote) => {
    const current = LOCAL_DRESS_ITEMS.find((item) => item.id === remote.id);
    if (!current) return;
    current.available = remote.available;
    current.removed = Boolean(remote.removed);
    current.eventStatus = remote.eventStatus;
    if (remote.group) current.group = remote.group;
    if (remote.style_json && Object.keys(remote.style_json).length) {
      current.style_json = remote.style_json;
    }
    if ('collect_count' in remote) current.collect_count = Number(remote.collect_count || 0);
    if ('share_count' in remote) current.share_count = Number(remote.share_count || 0);
    if ('like_count' in remote) current.like_count = Number(remote.like_count || 0);
    if (remote.poster_img) current.poster_img = remote.poster_img;
  });
}

export function hydrateFromCloudConfig(dto) {
  if (!dto || typeof dto !== 'object') return { ok: false, reason: 'empty' };
  hydratingCloud = true;
  try {
    const mapped = fromCurrentConfig(dto, (itemId) => getDressItem(itemId)?.group);
    if (!mapped) return { ok: false, reason: 'empty' };
    writeStorage(THEME_PACK_STORAGE_KEY, mapped.themeId || DEFAULT_THEME_ID);
    writeStorage(LOCAL_DRESS_STORAGE_KEY, mapped.localDress || {});
    writeStorage(THEME_OVERLAY_STORAGE_KEY, mapped.overlay ? '1' : '0');
    if (mapped.recent?.length) {
      writeStorage(THEME_RECENT_STORAGE_KEY, mapped.recent);
    }
    writeContractSnapshots();
    hydrateOutfitStyle();
    return { ok: true, ...mapped };
  } catch {
    return { ok: false, reason: 'corrupt' };
  } finally {
    hydratingCloud = false;
  }
}

function queueCloudSync({ social = false } = {}) {
  rememberGuestSnapshot();
  writeContractSnapshots();
  hydrateOutfitStyle();
  if (hydratingCloud || !isLoggedIn()) return false;
  writeStorage(THEME_CLOUD_QUEUE_KEY, {
    themeId: getActiveThemeId(),
    overlay: getOverlayLocalDress(),
    localDress: getLocalDressMap(),
    member: getMemberStatus(),
    owned: getOwnedMap(),
    creator: getCreatorProgress(),
    shards: getShards(),
    favorites: getFavoriteMap(),
    likes: getLikeMap(),
    recent: getRecentRaw(),
    outfits: getSavedOutfits(),
    query: getThemeQuery(),
    searchCache: getSearchCache(),
  });
  scheduleThemeCloudFlush({ social });
  return true;
}

export function setMemberStatus(enabled) {
  writeStorage(THEME_MEMBER_STORAGE_KEY, enabled ? '1' : '0');
  queueCloudSync();
  return getMemberStatus();
}

export function applyRemoteEntitlement(dto = {}) {
  if (typeof dto.is_member === 'boolean') {
    writeStorage(THEME_MEMBER_STORAGE_KEY, dto.is_member ? '1' : '0');
  }
  if (typeof dto.creator_unlocked === 'boolean') {
    writeStorage(THEME_CREATOR_UNLOCKED_KEY, dto.creator_unlocked ? '1' : '0');
  }
  if (Array.isArray(dto.activity_ids)) {
    const owned = getOwnedMap();
    dto.activity_ids.forEach((id) => {
      if (getThemeById(id) && !owned.themes.includes(id)) owned.themes.push(id);
      else if (getDressItem(id) && !owned.dresses.includes(id)) owned.dresses.push(id);
    });
    writeStorage(THEME_OWNED_STORAGE_KEY, owned);
  }
  hydrateOutfitStyle();
  return {
    member: getMemberStatus(),
    creator: creatorUnlocked(),
    owned: getOwnedMap(),
  };
}

function isRemoteApplyRejected(error) {
  const reason = error?.data?.reason || '';
  return ['coming', 'deprecated', 'privilege', 'terminal'].includes(reason)
    || error?.statusCode === 403
    || error?.statusCode === 409;
}

function isRemoteRateLimited(error) {
  return error?.data?.reason === 'rate' || error?.statusCode === 429;
}

function remoteApplyFail(error) {
  const reason = error?.data?.reason || '';
  return {
    ok: false,
    reason: reason || (error?.statusCode === 409 ? 'upcoming' : 'privilege'),
    queued: false,
  };
}

export function claimSkin(kind, id) {
  const item = kind === 'theme' ? getThemeById(id) : getDressItem(id);
  if (!item) return { ok: false, reason: 'missing' };
  const access = item.access || ACCESS_FREE;
  if (access === ACCESS_FREE || access === ACCESS_MEMBER) {
    return { ok: false, reason: access };
  }
  if (access === ACCESS_EVENT && item.eventStatus === 'ended') {
    return { ok: false, reason: 'ended' };
  }
  if (access === ACCESS_CREATOR && !creatorUnlocked()) {
    return { ok: false, reason: 'creator' };
  }
  const owned = getOwnedMap();
  const key = kind === 'theme' ? 'themes' : 'dresses';
  const added = !owned[key].includes(id);
  if (added) owned[key].push(id);
  writeStorage(THEME_OWNED_STORAGE_KEY, owned);
  if (!isLoggedIn()) {
    queueCloudSync();
    return { ok: true, owned };
  }
  const itemType = kind === 'theme' ? 'theme' : 'decoration';
  return claimThemeRemote(itemType, id)
    .then(() => {
      queueCloudSync();
      return { ok: true, owned: getOwnedMap() };
    })
    .catch((error) => {
      if (added) {
        const next = getOwnedMap();
        next[key] = next[key].filter((itemId) => itemId !== id);
        writeStorage(THEME_OWNED_STORAGE_KEY, next);
      }
      return remoteApplyFail(error);
    });
}

export function setCreatorProgress(next) {
  writeStorage(THEME_CREATOR_STORAGE_KEY, { ...getCreatorProgress(), ...next });
  queueCloudSync();
  return getCreatorProgress();
}

export function addShards(amount) {
  const next = getShards() + amount;
  writeStorage(THEME_SHARDS_STORAGE_KEY, next);
  queueCloudSync();
  return next;
}

export function persistThemeQuery(query) {
  const next = { ...defaultThemeQuery(), ...query };
  next.keyword = cleanSearchKeyword(next.keyword);
  writeStorage(THEME_QUERY_STORAGE_KEY, next);
  return next;
}

export function searchThemeCatalog(keyword, query = {}, { isMiniProgram = false } = {}) {
  const next = persistThemeQuery({
    ...getThemeQuery(),
    ...query,
    keyword: cleanSearchKeyword(keyword),
    searching: true,
  });
  const result = queryThemeCatalog(next, { isMiniProgram });
  writeStorage(THEME_SEARCH_CACHE_KEY, {
    keyword: next.keyword,
    ids: result.all.map((row) => `${row.kind}:${row.item.id}`),
    at: Date.now(),
  });
  return {
    ...result,
    query: next,
    queued: false,
  };
}

export function cleanOutfitName(name) {
  const text = String(name || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
  return text.slice(0, THEME_OUTFIT_NAME_MAX);
}

function mixSavedAt(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function outfitFingerprint(outfit = {}) {
  const themeId = outfit.themeId || outfit.global_theme_id || DEFAULT_THEME_ID;
  const overlay = outfit.overlay === undefined && outfit.is_cover_local_decoration === undefined
    ? true
    : Boolean(outfit.overlay ?? outfit.is_cover_local_decoration);
  const dress = outfit.localDress || {};
  const pairs = Object.keys(dress)
    .sort()
    .map((groupId) => `${groupId}:${dress[groupId]}`)
    .join('|');
  return `${themeId}#${overlay ? '1' : '0'}#${pairs}`;
}

function currentOutfitSnapshot() {
  return {
    themeId: getActiveThemeId(),
    localDress: getLocalDressMap(),
    overlay: getOverlayLocalDress(),
  };
}

function remapOutfitDress(localDress = {}) {
  const next = {};
  Object.entries(localDress).forEach(([groupId, itemId]) => {
    const item = getDressItem(itemId);
    next[item?.group || groupId] = itemId;
  });
  return next;
}

export function hydrateSavedOutfits(rows = []) {
  const list = (Array.isArray(rows) ? rows : [])
    .map((row) => fromSavedMix(row))
    .filter(Boolean)
    .map((outfit) => ({
      ...outfit,
      localDress: remapOutfitDress(outfit.localDress),
      overlay: outfit.overlay !== false,
      savedAt: mixSavedAt(outfit.savedAt),
    }))
    .sort((left, right) => right.savedAt - left.savedAt);
  writeStorage(THEME_OUTFIT_STORAGE_KEY, list);
  return list;
}

export function saveCurrentOutfit(name) {
  const trimmed = cleanOutfitName(name);
  if (!trimmed) return { ok: false, reason: 'name' };
  const list = getSavedOutfits();
  if (list.length >= THEME_OUTFIT_LIMIT) return { ok: false, reason: 'limit' };
  const snapshot = currentOutfitSnapshot();
  if (list.some((item) => outfitFingerprint(item) === outfitFingerprint(snapshot))) {
    return { ok: false, reason: 'duplicate' };
  }
  const outfit = {
    id: `outfit-${Date.now()}`,
    name: trimmed,
    themeId: snapshot.themeId,
    localDress: snapshot.localDress,
    overlay: snapshot.overlay,
    savedAt: Date.now(),
  };
  const next = [outfit, ...list];
  const written = writeStorage(THEME_OUTFIT_STORAGE_KEY, next);
  if (!written.ok) {
    return { ok: false, reason: written.reason, persisted: false };
  }
  if (isLoggedIn()) {
    Promise.resolve(createMixRemote(toSavedMix(outfit))).catch(() => {});
  }
  queueCloudSync({ social: true });
  return {
    ok: true,
    outfit,
    outfits: next,
    queued: true,
  };
}

export function renameSavedOutfit(id, name) {
  const trimmed = cleanOutfitName(name);
  if (!trimmed) return { ok: false, reason: 'name' };
  const next = getSavedOutfits().map((item) => (
    item.id === id ? { ...item, name: trimmed } : item
  ));
  writeStorage(THEME_OUTFIT_STORAGE_KEY, next);
  if (isLoggedIn()) {
    Promise.resolve(renameMixRemote(id, trimmed)).catch(() => {});
  }
  queueCloudSync();
  return { ok: true, outfits: next };
}

export function deleteSavedOutfit(id) {
  const next = getSavedOutfits().filter((item) => item.id !== id);
  writeStorage(THEME_OUTFIT_STORAGE_KEY, next);
  if (isLoggedIn()) {
    Promise.resolve(deleteMixRemote(id)).catch(() => {});
  }
  queueCloudSync();
  return { ok: true, outfits: next };
}

export function applySavedOutfit(outfit, {
  isMiniProgram = false,
} = {}) {
  if (!outfit || typeof outfit !== 'object' || Array.isArray(outfit)) {
    return {
      ok: false,
      reason: 'broken',
      skipped: false,
      empty: false,
    };
  }
  const dressMap = outfit.localDress && typeof outfit.localDress === 'object' && !Array.isArray(outfit.localDress)
    ? outfit.localDress
    : {};
  if (!outfit.themeId && !Object.keys(dressMap).length) {
    return {
      ok: false,
      reason: 'broken',
      skipped: false,
      empty: false,
    };
  }
  let skipped = false;
  const theme = getThemeById(outfit.themeId);
  let themeId = outfit.themeId || DEFAULT_THEME_ID;
  if (recentUseStatus('theme', theme, null, isMiniProgram) !== 'ok') {
    themeId = DEFAULT_THEME_ID;
    skipped = true;
  }
  const nextDress = {};
  Object.entries(dressMap).forEach(([groupId, itemId]) => {
    const item = getDressItem(itemId);
    const group = getDressGroup(groupId);
    if (recentUseStatus('dress', item, group, isMiniProgram) === 'ok') {
      nextDress[groupId] = itemId;
    } else {
      skipped = true;
    }
  });
  writeStorage(
    THEME_OVERLAY_STORAGE_KEY,
    (outfit.overlay === undefined ? getOverlayLocalDress() : Boolean(outfit.overlay))
      ? '1'
      : '0',
  );
  writeStorage(THEME_PACK_STORAGE_KEY, themeId);
  writeStorage(LOCAL_DRESS_STORAGE_KEY, nextDress);
  const appliedTheme = getThemeById(themeId);
  if (appliedTheme) recordRecentUse('theme', appliedTheme);
  Object.values(nextDress).forEach((itemId) => {
    const item = getDressItem(itemId);
    if (item) recordRecentUse('dress', item);
  });
  queueCloudSync();
  const mixHadContent = Boolean(outfit.themeId && outfit.themeId !== DEFAULT_THEME_ID)
    || Object.keys(dressMap).length > 0;
  const appliedNothing = themeId === DEFAULT_THEME_ID && Object.keys(nextDress).length === 0;
  return {
    ok: true,
    skipped,
    empty: Boolean(skipped && mixHadContent && appliedNothing),
    themeId,
    localDress: nextDress,
  };
}

function togglePair(key, kind, id) {
  const map = readPairMap(key);
  const listKey = pairKey(kind);
  const exists = map[listKey].includes(id);
  map[listKey] = exists
    ? map[listKey].filter((item) => item !== id)
    : [...map[listKey], id];
  writeStorage(key, map);
  queueCloudSync();
  return !exists;
}

export function hydrateFavoriteMap(collectList = []) {
  const next = { themes: [], dresses: [] };
  (Array.isArray(collectList) ? collectList : []).forEach((row) => {
    const id = String(row?.item_id || '').trim();
    if (!id) return;
    if (row.item_type === 'theme' && !next.themes.includes(id)) next.themes.push(id);
    if (row.item_type === 'decoration' && !next.dresses.includes(id)) next.dresses.push(id);
  });
  writeStorage(THEME_FAVORITE_STORAGE_KEY, next);
  return next;
}

export function toggleFavorite(kind, item) {
  if (!item?.id) return { ok: false, reason: 'missing', favorited: false };
  const already = isFavorited(kind, item.id);
  if (!canShareOrFavorite(item, { favorited: already })) {
    return { ok: false, reason: 'upcoming', favorited: false };
  }
  const favorited = togglePair(THEME_FAVORITE_STORAGE_KEY, kind, item.id);
  if (!isLoggedIn()) {
    queueCloudSync({ social: true });
    return { ok: true, favorited };
  }
  const itemType = kind === 'theme' ? 'theme' : 'decoration';
  const remote = favorited
    ? collectThemeRemote(itemType, item.id)
    : uncollectThemeRemote(itemType, item.id);
  return remote
    .then(() => {
      queueCloudSync({ social: true });
      return { ok: true, favorited };
    })
    .catch((error) => {
      const coming = error?.data?.reason === 'coming';
      const rate = error?.data?.reason === 'rate' || error?.statusCode === 429;
      if (coming || rate) {
        togglePair(THEME_FAVORITE_STORAGE_KEY, kind, item.id);
        return {
          ok: false,
          reason: coming ? 'upcoming' : 'rate',
          favorited: already,
        };
      }
      queueCloudSync({ social: true });
      return { ok: true, favorited, queued: true };
    });
}

export function toggleLike(kind, item) {
  if (!item?.available) return { ok: false, reason: 'upcoming', liked: false };
  const liked = togglePair(THEME_LIKE_STORAGE_KEY, kind, item.id);
  return { ok: true, liked };
}

function retiredFavoriteItem(kind, id) {
  return {
    id,
    name: '装扮已下架',
    available: false,
    removed: true,
    preview: 'default',
    tag: '已下架',
    group: kind === 'dress' ? '' : undefined,
  };
}

export function listFavorites(filter = 'all') {
  const fav = getFavoriteMap();
  const themes = fav.themes.map((id) => {
    const item = getThemeById(id) || retiredFavoriteItem('theme', id);
    return { kind: 'theme', item };
  });
  const dresses = fav.dresses.map((id) => {
    const item = getDressItem(id) || retiredFavoriteItem('dress', id);
    return {
      kind: 'dress',
      item,
      group: getDressGroup(item.group),
    };
  });
  if (filter === 'theme') return themes;
  if (filter === 'dress') return dresses;
  return [...themes, ...dresses];
}

/**
 * Persist to uni storage (H5 localStorage / 小程序 storage).
 * Logged-in sessions also POST /users/theme/apply/ then queue a cloud snapshot.
 */
export async function persistActiveTheme(themeId) {
  const previous = getActiveThemeId();
  const result = setActiveThemeId(themeId);
  if (!result.ok) return result;
  if (isLoggedIn()) {
    try {
      await applyThemeRemote('theme', themeId);
    } catch (error) {
      if (isRemoteApplyRejected(error)) {
        writeStorage(THEME_PACK_STORAGE_KEY, previous);
        hydrateOutfitStyle();
        return remoteApplyFail(error);
      }
      if (isRemoteRateLimited(error)) {
        recordRecentUse('theme', result.theme);
        return { ...result, queued: queueCloudSync(), reason: 'rate' };
      }
    }
  }
  recordRecentUse('theme', result.theme);
  return { ...result, queued: queueCloudSync() };
}

export async function persistCurrentOutfit() {
  return { ok: true, queued: queueCloudSync() };
}

export function setOverlayLocalDress(enabled) {
  writeStorage(THEME_OVERLAY_STORAGE_KEY, enabled ? '1' : '0');
  if (overlayFlushTimer) clearTimeout(overlayFlushTimer);
  overlayFlushTimer = setTimeout(() => {
    overlayFlushTimer = 0;
    queueCloudSync();
  }, 80);
  return getOverlayLocalDress();
}

export async function persistLocalDress(groupId, itemId) {
  const group = getDressGroup(groupId);
  const item = getDressItem(itemId);
  if (!group || !item || item.group !== groupId) {
    return { ok: false, reason: 'missing' };
  }
  const health = themeResourceHealth(item);
  if (!health.ok) {
    return { ok: false, reason: health.reason };
  }
  if (!item.available) {
    return { ok: false, reason: 'upcoming' };
  }
  if (!hasPermission('dress', item)) {
    return { ok: false, reason: item.access || 'locked' };
  }
  if (item.eventStatus === 'ended') {
    return { ok: false, reason: 'ended' };
  }
  const previous = getLocalDressMap();
  const next = { ...previous, [groupId]: item.id };
  const written = writeStorage(LOCAL_DRESS_STORAGE_KEY, next);
  if (isLoggedIn()) {
    try {
      await applyThemeRemote('decoration', item.id);
    } catch (error) {
      if (isRemoteApplyRejected(error)) {
        writeStorage(LOCAL_DRESS_STORAGE_KEY, previous);
        hydrateOutfitStyle();
        return remoteApplyFail(error);
      }
      if (isRemoteRateLimited(error)) {
        if (written.ok) recordRecentUse('dress', item);
        return {
          ok: true,
          item,
          group,
          suppressed: getOverlayLocalDress(),
          queued: queueCloudSync(),
          persisted: written.ok,
          reason: 'rate',
        };
      }
    }
  }
  if (written.ok) recordRecentUse('dress', item);
  const result = {
    ok: true,
    item,
    group,
    suppressed: getOverlayLocalDress(),
    queued: queueCloudSync(),
    persisted: written.ok,
  };
  if (!written.ok) result.reason = written.reason;
  return result;
}

export function clearLocalDress(groupId) {
  const previous = getLocalDressMap();
  if (!previous[groupId]) {
    return { ok: true, cleared: false, queued: false };
  }
  const next = { ...previous };
  delete next[groupId];
  const written = writeStorage(LOCAL_DRESS_STORAGE_KEY, next);
  const result = {
    ok: true,
    cleared: true,
    queued: queueCloudSync(),
    persisted: written.ok,
  };
  if (!written.ok) result.reason = written.reason;
  return result;
}

export async function applyRecent(row, { isMiniProgram = false } = {}) {
  const item = row.kind === 'theme' ? getThemeById(row.id) : getDressItem(row.id);
  const group = row.kind === 'dress' ? getDressGroup(row.group || item?.group) : null;
  const status = recentUseStatus(row.kind, item, group, isMiniProgram);
  if (status !== 'ok') {
    return { ok: false, status, ...recentStatusMeta(status, item) };
  }
  if (row.kind === 'theme') return persistActiveTheme(item.id);
  return persistLocalDress(item.group, item.id);
}

export function setLocalDress(groupId, itemId) {
  return persistLocalDress(groupId, itemId);
}

export async function resetAllDress() {
  // Only live config. Keep saved mixes, favorites, recents, and likes.
  writeStorage(THEME_PACK_STORAGE_KEY, DEFAULT_THEME_ID);
  writeStorage(LOCAL_DRESS_STORAGE_KEY, {});
  writeStorage(THEME_OVERLAY_STORAGE_KEY, '1');
  return {
    ok: true,
    theme: getActiveTheme(),
    overlay: true,
    queued: queueCloudSync(),
  };
}
