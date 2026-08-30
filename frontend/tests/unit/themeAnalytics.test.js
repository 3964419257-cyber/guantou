import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { isLoggedIn } from '@/services/authGuard';
import { isWechatMiniProgram } from '@/services/platform';
import {
  flattenThemeAnalyticsParams,
  getThemeAnalyticsQueue,
  reportThemeEvent,
  resetThemeAnalyticsQueue,
  THEME_ANALYTICS_EVENTS,
  trackThemeApply,
  trackThemeApplyInvalid,
  trackThemeApplyMix,
  trackThemeCenterEnter,
  trackThemeCollect,
  trackThemeFilterClick,
  trackThemeGet,
  trackThemeHotSearch,
  trackThemeItemDetail,
  trackThemeListScroll,
  trackThemePreview,
  trackThemeResetAll,
  trackThemeSaveMix,
  trackThemeSearch,
  trackThemeShare,
  trackThemeSwitchConflict,
  trackThemeTabSwitch,
  trackThemeUnsupportedEnv,
} from '@/services/themeAnalytics';
import { GLOBAL_THEMES } from '@/services/themeCenter';

vi.mock('@/services/platform', () => ({
  isWechatMiniProgram: vi.fn(() => false),
  default: vi.fn(() => false),
}));

vi.mock('@/services/authGuard', () => ({
  isLoggedIn: vi.fn(() => false),
}));

describe('theme analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetThemeAnalyticsQueue();
    isWechatMiniProgram.mockReturnValue(false);
    isLoggedIn.mockReturnValue(false);
    global.uni = {
      getStorageSync: vi.fn(() => ''),
      setStorageSync: vi.fn(),
      report: vi.fn(),
    };
    globalThis.wx = undefined;
    window.gtag = undefined;
    window.themeAnalyticsReport = undefined;
    window.themeAnalyticsEndpoint = undefined;
  });

  it('uses one event catalog and strips privacy fields', () => {
    expect(Object.values(THEME_ANALYTICS_EVENTS)).toEqual(expect.arrayContaining([
      'theme_center_enter',
      'theme_tab_switch',
      'theme_item_enter_detail',
      'theme_list_scroll',
      'theme_filter_click',
      'theme_search',
      'theme_hot_search_click',
      'theme_collect_click',
      'theme_share_click',
      'theme_preview_click',
      'theme_apply_click',
      'theme_get_click',
      'theme_save_mix',
      'theme_apply_mix',
      'theme_reset_all',
      'theme_switch_conflict',
      'theme_unsupported_env',
      'theme_apply_invalid_item',
    ]));
    const flat = flattenThemeAnalyticsParams({
      item_id: 'paper',
      nickname: '乡音阿宁',
      token: 'secret',
      phone: '13900000001',
    });
    expect(flat.item_id).toBe('paper');
    const record = reportThemeEvent('theme_center_enter', {
      item_id: 'paper',
      nickname: '乡音阿宁',
      token: 'secret',
    });
    expect(record.params.nickname).toBeUndefined();
    expect(record.params.token).toBeUndefined();
    expect(record.params.platform).toBe('h5');
    expect(record.transport).toBe('web');
  });

  it('reports enter, tab, upcoming detail, search and filter on H5', () => {
    isLoggedIn.mockReturnValue(true);
    uni.getStorageSync.mockImplementation((key) => (key === 'ui_theme_pack' ? 'default' : ''));
    trackThemeCenterEnter();
    trackThemeTabSwitch('favorites');
    const upcoming = GLOBAL_THEMES.find((item) => item.id === 'chuankiang');
    trackThemeItemDetail('theme', upcoming);
    trackThemeListScroll({
      itemIds: ['default', 'chuankiang'],
      scrollTop: 120,
      query: {
        access: 'member',
        category: 'dialect',
        dressCategory: 'avatar',
        regions: ['chuankiang'],
        sort: 'heat',
      },
    });
    trackThemeFilterClick({
      access: 'free',
      category: 'simple',
      sort: 'name',
    });
    trackThemeHotSearch('川渝烟火');
    trackThemeSearch('川渝烟火', 2);

    const events = getThemeAnalyticsQueue().map((row) => row.event);
    expect(events).toEqual([
      'theme_center_enter',
      'theme_tab_switch',
      'theme_item_enter_detail',
      'theme_list_scroll',
      'theme_filter_click',
      'theme_hot_search_click',
      'theme_search',
    ]);
    const enter = getThemeAnalyticsQueue()[0].params;
    expect(enter.logged_in).toBe('logged');
    expect(enter.theme_id).toBe('default');
    expect(enter.platform).toBe('h5');
    const detail = getThemeAnalyticsQueue()[2].params;
    expect(detail.item_id).toBe('chuankiang');
    expect(detail.item_type).toBe('全局主题');
    expect(detail.region_tag).toBe('川渝');
    expect(detail.catalog_status).toBe('upcoming');
    const scroll = getThemeAnalyticsQueue()[3].params;
    expect(scroll.item_ids).toBe('default,chuankiang');
    expect(scroll.region_tags).toBe('川渝');
    expect(scroll.dress_category).toBe('头像挂件');
    expect(scroll.sort).toBe('热度最高');
    expect(getThemeAnalyticsQueue()[6].params.result_count).toBe('2');
  });

  it('records collect, preview, apply outcomes and mix actions', () => {
    const live = GLOBAL_THEMES[0];
    trackThemeCollect('theme', live, true);
    trackThemePreview('theme', live, 'detail');
    trackThemePreview('theme', live, 'live');
    trackThemeApply({ kind: 'theme', item: live, result: 'success' });
    trackThemeApply({
      kind: 'theme',
      item: GLOBAL_THEMES.find((item) => item.id === 'member-pine'),
      result: 'no_permission',
      permission: 'member',
    });
    trackThemeGet('theme', GLOBAL_THEMES.find((item) => item.id === 'member-pine'), 'member');
    trackThemeApplyInvalid('theme', GLOBAL_THEMES.find((item) => item.id === 'event-spring'), '已绝版');
    trackThemeUnsupportedEnv('dress', { id: 'navbar-plain' });
    trackThemeSaveMix({
      id: 'outfit-1',
      themeId: 'default',
      localDress: { navbar: 'navbar-plain' },
    });
    trackThemeApplyMix({ id: 'outfit-1' }, { hasUnavailable: true });
    trackThemeResetAll({ themeId: 'default', dressCount: 2 });
    trackThemeSwitchConflict(true);

    const byEvent = Object.fromEntries(
      getThemeAnalyticsQueue().map((row) => [row.event, row.params]),
    );
    expect(byEvent.theme_collect_click.collect_state).toBe('收藏');
    expect(byEvent.theme_preview_click.preview_type).toBe('实时模拟预览');
    expect(getThemeAnalyticsQueue().filter((row) => row.event === 'theme_preview_click')[0]
      .params.preview_type).toBe('大图预览');
    expect(byEvent.theme_apply_click.apply_result).toBe('权限不足');
    expect(byEvent.theme_apply_click.permission_type).toBe('会员');
    expect(byEvent.theme_get_click.get_method).toBe('会员');
    expect(byEvent.theme_apply_invalid_item.item_status).toBe('已绝版');
    expect(byEvent.theme_unsupported_env.item_id).toBe('navbar-plain');
    expect(byEvent.theme_save_mix.dress_ids).toBe('navbar-plain');
    expect(byEvent.theme_apply_mix.has_unavailable).toBe('1');
    expect(byEvent.theme_reset_all.dress_count).toBe('2');
    expect(byEvent.theme_switch_conflict.overlay).toBe('开启');
  });

  it('keeps H5 share channels and maps mini program share to 小程序转发', () => {
    const live = GLOBAL_THEMES[0];
    trackThemeShare('theme', live, 'copy_link');
    trackThemeShare('theme', live, 'save_poster');
    expect(getThemeAnalyticsQueue().map((row) => row.params.share_channel)).toEqual([
      '复制链接',
      '保存海报',
    ]);

    resetThemeAnalyticsQueue();
    isWechatMiniProgram.mockReturnValue(true);
    globalThis.wx = { reportEvent: vi.fn() };
    trackThemeShare('theme', live, 'wechat');
    trackThemeShare('theme', live, 'copy_link');
    trackThemeShare('theme', live, 'save_poster');
    expect(getThemeAnalyticsQueue().map((row) => row.params.share_channel)).toEqual([
      '小程序转发',
      '保存海报',
    ]);
    expect(globalThis.wx.reportEvent).toHaveBeenCalledWith(
      'theme_share_click',
      expect.objectContaining({
        platform: 'miniprogram',
        share_channel: '小程序转发',
      }),
    );
  });
});
