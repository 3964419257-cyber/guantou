import { mount } from '@vue/test-utils';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import confirmDialog from '@/components/ConfirmDialog';
import { notify, notifySuccess } from '@/services/feedback';
import {
  goThemeOutfit,
  goThemeSearch,
  ROUTES,
} from '@/services/navigation';
import { isWechatMiniProgram } from '@/services/platform';
import {
  getThemeAnalyticsQueue,
  resetThemeAnalyticsQueue,
} from '@/services/themeAnalytics';
import {
  applySavedOutfit,
  canLivePreview,
  claimSkin,
  composePreviewOutfit,
  describeAccess,
  getActiveTheme,
  getDressGroup,
  getDressItem,
  getLocalDressMap,
  getRecentRaw,
  getSavedOutfits,
  GLOBAL_THEMES,
  listAppliedDress,
  listDressGroupsByCategory,
  listRecentUses,
  listThemesByCategory,
  LOCAL_DRESS_GROUPS,
  persistActiveTheme,
  persistLocalDress,
  queryThemeCatalog,
  recordRecentUse,
  resetAllDress,
  resetThemeSessionState,
  saveCurrentOutfit,
  searchThemeCatalog,
  setActiveThemeId,
  setCreatorProgress,
  setMemberStatus,
  setOverlayLocalDress,
  THEME_CLOUD_QUEUE_KEY,
  THEME_OUTFIT_LIMIT,
  THEME_OUTFIT_STORAGE_KEY,
  THEME_OVERLAY_STORAGE_KEY,
  THEME_PACK_STORAGE_KEY,
  THEME_QUERY_STORAGE_KEY,
  THEME_RECENT_STORAGE_KEY,
} from '@/services/themeCenter';
import {
  resetThemeFaultAdapters,
  THEME_FAULT_TOAST,
} from '@/services/themeFault';
import ThemeCenterPage from '@/pages/users/theme-center.vue';

vi.mock('@/services/feedback', () => ({
  notify: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: vi.fn(async () => true),
}));

vi.mock('@/services/platform', () => ({
  isWechatMiniProgram: vi.fn(() => false),
  default: vi.fn(() => false),
}));

function memoryStore(initial = {}) {
  const store = { ...initial };
  uni.getStorageSync.mockImplementation((key) => store[key] ?? '');
  uni.setStorageSync.mockImplementation((key, value) => {
    store[key] = value;
  });
  uni.removeStorageSync = vi.fn((key) => {
    delete store[key];
  });
  return store;
}

describe('themeCenter catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetThemeFaultAdapters();
    resetThemeSessionState();
    global.uni = {
      getStorageSync: vi.fn(() => ''),
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
      navigateTo: vi.fn(),
    };
  });

  it('keeps the default pack free and gates member, event, and creator skins', () => {
    const live = GLOBAL_THEMES.filter((item) => item.available);
    expect(live.map((item) => item.id)).toEqual(expect.arrayContaining([
      'default',
      'member-pine',
      'event-lantern',
      'event-spring',
      'creator-tile',
    ]));
    expect(GLOBAL_THEMES[0]).toMatchObject({
      id: 'default',
      name: '默认方言主题',
      tag: '免费',
    });
    expect(listThemesByCategory('cyber').every((item) => !item.available)).toBe(true);
    expect(LOCAL_DRESS_GROUPS.length).toBeGreaterThanOrEqual(20);
    expect(listDressGroupsByCategory('nav').map((item) => item.id)).toEqual([
      'navbar',
      'navbar-font',
    ]);
    expect(listDressGroupsByCategory('tabbar').every((item) => item.mpBlocked)).toBe(true);
    expect(GLOBAL_THEMES.some((item) => item.name === '江南吴语')).toBe(true);
    expect(GLOBAL_THEMES.some((item) => item.name === '岭南粤韵')).toBe(true);
    expect(listThemesByCategory('dialect', 'chuankiang').map((item) => item.id)).toEqual([
      'chuankiang',
    ]);

    memoryStore();
    expect(setActiveThemeId('member-pine')).toEqual({
      ok: false,
      reason: 'member',
    });
    setMemberStatus(true);
    expect(setActiveThemeId('member-pine').ok).toBe(true);

    expect(persistLocalDress('cards', 'cards-event')).toMatchObject({
      ok: false,
      reason: 'event',
    });
    claimSkin('dress', 'cards-event');
    expect(persistLocalDress('cards', 'cards-event').ok).toBe(true);

    expect(setActiveThemeId('event-spring').reason).toBe('event');
    expect(persistLocalDress('avatar', 'avatar-creator').reason).toBe('creator');
    setCreatorProgress({
      cans: 10,
      badge: true,
      challenge: true,
    });
    expect(describeAccess(getDressItem('avatar-creator'), 'dress').action).toBe('claim');
    claimSkin('dress', 'avatar-creator');
    expect(persistLocalDress('avatar', 'avatar-creator').ok).toBe(true);

    const navbar = getDressGroup('navbar');
    expect(describeAccess(getDressItem('navbar-member'), 'dress', {
      group: navbar,
      isMiniProgram: true,
    })).toMatchObject({
      owned: true,
      blocked: true,
      hint: '拥有权限，但小程序环境暂不支持该装扮',
    });
  });

  it('enables the default pack and rejects placeholders', () => {
    expect(setActiveThemeId('nightferry')).toEqual({ ok: false, reason: 'upcoming' });
    expect(setActiveThemeId('default')).toEqual({
      ok: true,
      theme: expect.objectContaining({ id: 'default' }),
      overlayCleared: true,
      overlaySuppressed: true,
      persisted: true,
    });
    expect(uni.setStorageSync).toHaveBeenCalledWith(THEME_PACK_STORAGE_KEY, 'default');
    expect(getActiveTheme().name).toBe('默认方言主题');
  });

  it('keeps local dress when overlay is toggled on, and clears it when a global pack is enabled', () => {
    memoryStore({ [THEME_OVERLAY_STORAGE_KEY]: '1' });
    expect(persistLocalDress('navbar', 'navbar-plain')).toMatchObject({
      ok: true,
      suppressed: true,
    });
    expect(persistLocalDress('actions', 'actions-plain').ok).toBe(true);
    expect(getLocalDressMap()).toEqual({
      navbar: 'navbar-plain',
      actions: 'actions-plain',
    });
    setOverlayLocalDress(true);
    expect(getLocalDressMap()).toEqual({
      navbar: 'navbar-plain',
      actions: 'actions-plain',
    });
    expect(listAppliedDress().every((entry) => entry.suppressed && !entry.effective)).toBe(true);
    expect(setActiveThemeId('default')).toMatchObject({ overlayCleared: true });
    expect(getLocalDressMap()).toEqual({});
  });

  it('does not overwrite other groups when applying one dress', () => {
    memoryStore({ [THEME_OVERLAY_STORAGE_KEY]: '0' });
    persistLocalDress('navbar', 'navbar-plain');
    persistLocalDress('cards', 'cards-plain');
    expect(persistLocalDress('navbar', 'navbar-glyph')).toEqual({
      ok: false,
      reason: 'upcoming',
    });
    expect(getLocalDressMap()).toEqual({
      navbar: 'navbar-plain',
      cards: 'cards-plain',
    });
  });

  it('resets the default pack and local dress, then queues cloud sync', async () => {
    memoryStore({
      token: 'token',
      [THEME_OVERLAY_STORAGE_KEY]: '0',
    });
    persistLocalDress('navbar', 'navbar-plain');
    persistLocalDress('actions', 'actions-plain');
    const result = await resetAllDress();
    expect(result).toMatchObject({ ok: true, queued: true });
    expect(getActiveTheme().id).toBe('default');
    expect(getLocalDressMap()).toEqual({});
    expect(uni.setStorageSync).toHaveBeenCalledWith(
      THEME_CLOUD_QUEUE_KEY,
      expect.objectContaining({
        themeId: 'default',
        localDress: {},
      }),
    );
  });

  it('queues a cloud payload when the user is signed in', async () => {
    memoryStore({
      token: 'token',
      [THEME_OVERLAY_STORAGE_KEY]: '0',
    });
    const result = await persistActiveTheme('default');
    expect(result).toMatchObject({ ok: true, queued: true, overlayCleared: false });
    expect(uni.setStorageSync).toHaveBeenCalledWith(
      THEME_CLOUD_QUEUE_KEY,
      expect.objectContaining({
        themeId: 'default',
        recent: expect.any(Array),
        outfits: expect.any(Array),
      }),
    );
  });

  it('records recent uses, dedupes, caps at 8, and skips upcoming packs', async () => {
    const store = memoryStore({ [THEME_OVERLAY_STORAGE_KEY]: '0' });
    await persistActiveTheme('default');
    persistLocalDress('navbar', 'navbar-plain');
    persistLocalDress('actions', 'actions-plain');
    persistLocalDress('navbar', 'navbar-plain');
    const recents = getRecentRaw();
    expect(recents[0]).toMatchObject({ kind: 'dress', id: 'navbar-plain' });
    expect(recents.filter((row) => row.id === 'navbar-plain')).toHaveLength(1);
    expect(persistLocalDress('navbar', 'navbar-glyph').ok).toBe(false);
    expect(getRecentRaw().some((row) => row.id === 'navbar-glyph')).toBe(false);
    expect(recordRecentUse('theme', GLOBAL_THEMES.find((item) => item.id === 'paper'))).toEqual(
      getRecentRaw(),
    );

    persistLocalDress('cards', 'cards-plain');
    persistLocalDress('profile', 'profile-plain');
    persistLocalDress('avatar', 'avatar-plain');
    persistLocalDress('tabbar', 'tabbar-plain');
    persistLocalDress('navbar-font', 'navbar-font-plain');
    persistLocalDress('tabbar-ornament', 'tabbar-ornament-plain');
    persistLocalDress('cards-tag', 'cards-tag-plain');
    expect(getRecentRaw()).toHaveLength(8);
    expect(getRecentRaw().map((row) => row.id)).not.toContain('default');

    store[THEME_RECENT_STORAGE_KEY] = [
      {
        kind: 'theme',
        id: 'event-spring',
        name: '开春乡音',
        preview: 'festival',
        usedAt: 3,
      },
      {
        kind: 'dress',
        id: 'navbar-member',
        group: 'navbar',
        name: '会员顶栏细纹',
        preview: 'navbar',
        usedAt: 2,
      },
      {
        kind: 'dress',
        id: 'gone-card',
        group: 'cards',
        name: '旧罐头卡',
        preview: 'cards',
        usedAt: 1,
      },
    ];
    const listed = listRecentUses({ isMiniProgram: true });
    expect(listed[0]).toMatchObject({
      status: 'ended',
      label: '⚠️已绝版',
      hint: '该装扮已绝版，无法再次使用',
      disabled: true,
    });
    expect(listed[1]).toMatchObject({
      status: 'blocked',
      label: '❌环境不支持',
      hint: '当前环境暂不支持该装扮',
      disabled: true,
    });
    expect(listed[2]).toMatchObject({
      status: 'retired',
      label: '📦已下架',
      hint: '装扮已下架',
      disabled: true,
    });
  });

  it('saves named outfits, caps at 10, and skips unavailable pieces on apply', () => {
    memoryStore({
      token: 'token',
      [THEME_OVERLAY_STORAGE_KEY]: '1',
      [THEME_PACK_STORAGE_KEY]: 'default',
      ui_local_dress: { cards: 'cards-plain' },
    });
    const saved = saveCurrentOutfit('川渝市井全套');
    expect(saved.ok).toBe(true);
    expect(getSavedOutfits()[0]).toMatchObject({
      name: '川渝市井全套',
      themeId: 'default',
      localDress: { cards: 'cards-plain' },
    });
    expect(uni.setStorageSync).toHaveBeenCalledWith(
      THEME_CLOUD_QUEUE_KEY,
      expect.objectContaining({ outfits: expect.any(Array) }),
    );

    const store = memoryStore({ [THEME_OVERLAY_STORAGE_KEY]: '1' });
    store[THEME_OUTFIT_STORAGE_KEY] = Array.from({ length: THEME_OUTFIT_LIMIT }, (_, index) => ({
      id: `outfit-${index}`,
      name: `方案${index}`,
      themeId: 'default',
      localDress: {},
      savedAt: index,
    }));
    expect(saveCurrentOutfit('江南吴语简约搭配')).toEqual({ ok: false, reason: 'limit' });

    const applied = applySavedOutfit({
      themeId: 'event-spring',
      localDress: {
        navbar: 'navbar-member',
        cards: 'cards-plain',
        avatar: 'gone-id',
      },
    }, { isMiniProgram: true });
    expect(applied).toMatchObject({
      ok: true,
      skipped: true,
      themeId: 'default',
      localDress: { cards: 'cards-plain' },
    });
    expect(getActiveTheme().id).toBe('default');
    expect(getLocalDressMap()).toEqual({ cards: 'cards-plain' });
  });

  it('searches across tabs, greys upcoming packs, and persists query to cloud cache', () => {
    const store = memoryStore({ token: 'token' });
    const result = searchThemeCatalog('川渝烟火', {}, { isMiniProgram: false });
    expect(result.all.map((row) => row.item.id)).toContain('chuankiang');
    expect(result.themes.every((row) => row.item.available) === false).toBe(true);
    expect(result.queued).toBe(true);
    expect(store[THEME_QUERY_STORAGE_KEY]).toMatchObject({
      keyword: '川渝烟火',
      searching: true,
      sort: 'newest',
    });
    expect(store[THEME_CLOUD_QUEUE_KEY]).toEqual(expect.objectContaining({
      query: expect.objectContaining({ keyword: '川渝烟火' }),
      searchCache: expect.objectContaining({ keyword: '川渝烟火' }),
    }));

    const avatar = searchThemeCatalog('方言头像框');
    expect(avatar.dresses.some((row) => row.item.name.includes('头像框'))).toBe(true);

    const mixed = queryThemeCatalog({ keyword: '复古国风', sort: 'name' });
    expect(mixed.themes.map((row) => row.item.category)).toEqual(
      expect.arrayContaining(['retro', 'guofeng']),
    );
    const names = mixed.themes.map((row) => row.item.name);
    expect([...names].sort((left, right) => left.localeCompare(right, 'zh'))).toEqual(names);

    const ended = queryThemeCatalog({ status: 'ended' });
    expect(ended.themes.map((row) => row.item.id)).toContain('event-spring');
    expect(ended.dresses.map((row) => row.item.id)).toContain('avatar-event-end');

    const blocked = queryThemeCatalog({
      keyword: '会员顶栏',
      dressCategory: 'nav',
    }, { isMiniProgram: true });
    expect(blocked.dresses[0]).toMatchObject({
      blocked: true,
      item: expect.objectContaining({ id: 'navbar-member' }),
    });

    const regions = queryThemeCatalog({
      regions: ['chuankiang', 'wuyu'],
    });
    expect(regions.themes.map((row) => row.item.id)).toEqual(
      expect.arrayContaining(['chuankiang', 'wuyu']),
    );
    expect(queryThemeCatalog({ keyword: '没有这个装扮xyz' }).all).toHaveLength(0);
  });

  it('blocks live preview for upcoming and ended packs', () => {
    expect(canLivePreview(GLOBAL_THEMES[0])).toBe(true);
    expect(canLivePreview(GLOBAL_THEMES.find((item) => item.id === 'paper'))).toBe(false);
    expect(canLivePreview(GLOBAL_THEMES.find((item) => item.id === 'event-spring'))).toBe(false);
    memoryStore({
      ui_local_dress: { navbar: 'navbar-plain' },
      ui_theme_overlay_local: '0',
    });
    const preview = composePreviewOutfit({ isMiniProgram: true });
    expect(preview.nativeLocked).toBe(true);
    expect(preview.skipped.some((row) => row.group?.id === 'navbar')).toBe(true);
    expect(preview.sample.cans[0].caption).toBe('示例罐头占位');
  });
});

describe('Theme center page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetThemeAnalyticsQueue();
    resetThemeFaultAdapters();
    resetThemeSessionState();
    isWechatMiniProgram.mockReturnValue(false);
    global.uni = {
      $emit: vi.fn(),
      $on: vi.fn(),
      $off: vi.fn(),
      getStorageSync: vi.fn(() => ''),
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
      getSystemInfoSync: vi.fn(() => ({ theme: 'light' })),
      navigateTo: vi.fn(),
      setClipboardData: vi.fn(({ success }) => success && success()),
      saveImageToPhotosAlbum: vi.fn(({ complete }) => complete && complete()),
      onNetworkStatusChange: vi.fn(),
      report: vi.fn(),
    };
  });

  function mountPage() {
    return mount(ThemeCenterPage, {
      global: {
        stubs: {
          PageShell: {
            name: 'PageShell',
            props: ['title', 'actionText'],
            template: '<main><slot /><button class="search" @click="$emit(\'action\')">搜索</button></main>',
          },
          TSwitch: {
            name: 'TSwitch',
            props: ['value'],
            template: '<button class="switch" @click="$emit(\'change\', { value: !value })" />',
          },
          EmptyState: {
            name: 'EmptyState',
            props: ['title', 'actionText'],
            template: '<div class="empty">{{ title }}</div>',
          },
          BaseForm: {
            props: ['data', 'rules'],
            template: '<form><slot /></form>',
          },
          BaseField: {
            props: ['modelValue', 'name', 'label', 'placeholder', 'error', 'maxlength'],
            template: '<input class="outfit-name" :value="modelValue" />',
          },
          'scroll-view': { template: '<div><slot /></div>' },
        },
      },
    });
  }

  it('shows the live default pack and placeholder storefront', async () => {
    const wrapper = mountPage();
    expect(wrapper.text()).toContain('全局主题');
    expect(wrapper.text()).toContain('局部装扮');
    expect(wrapper.text()).toContain('默认方言主题');
    expect(wrapper.text()).toContain('当前使用');
    expect(wrapper.vm.themeActionLabel(GLOBAL_THEMES[0])).toBe('已启用');
    expect(wrapper.vm.themeActionLabel(GLOBAL_THEMES[1])).toBe('敬请期待');
    expect(wrapper.text()).toContain('敬请期待');
    expect(wrapper.text()).toContain('免费');
    expect(wrapper.text()).toContain('会员专属');
    expect(wrapper.text()).toContain('活动限定');
    expect(wrapper.text()).toContain('方言创作者专属');
    expect(wrapper.text()).toContain('已绝版');
    expect(wrapper.text()).toContain('我的收藏');
    expect(wrapper.text()).toContain('最新上架');
    expect(wrapper.text()).toContain('热度最高');
    expect(wrapper.text()).toContain('免费优先');
    expect(wrapper.text()).toContain('名称A-Z');
    expect(wrapper.text()).toContain('热门搜索词');
    expect(wrapper.text()).toContain('筛选');
    expect(wrapper.text()).toContain('方言头像框');
    expect(wrapper.text()).toContain('可以通过方言地域标签快速筛选家乡风格装扮');
    expect(wrapper.text()).toContain('实时预览仅模拟展示效果');
    expect(wrapper.text()).toContain('收藏仅为个人标记');
    expect(wrapper.text()).toContain('部分限定装扮为限时活动产出');
    expect(wrapper.text()).toContain('会员装扮权益在H5、小程序两端同步');
    expect(wrapper.text()).toContain('最近使用');
    expect(wrapper.text()).toContain('暂无最近使用记录，快去挑选装扮吧');
    expect(wrapper.text()).toContain('最近使用记录仅记录你启用过的装扮');
    expect(wrapper.text()).toContain('已绝版、下架的装扮无法再次启用');
    expect(wrapper.text()).toContain('川渝烟火');
    expect(wrapper.text()).toContain('国风');
    expect(wrapper.text()).toContain('市井烟火');
    expect(wrapper.text()).toContain('二次元');
    expect(wrapper.text()).toContain('极简暗色');
    expect(wrapper.text()).toContain('节日限定');
    expect(wrapper.text()).toContain('全局主题将统一改变导航栏、按钮、卡片、背景、文字色彩');
    expect(wrapper.text()).toContain('全局主题会带轻微地域纹理，不会改变罐头播放内容');
    expect(wrapper.text()).not.toContain('短视频');
    expect(wrapper.text()).not.toContain('作品卡片');
    expect(wrapper.text()).not.toContain('作品');

    await wrapper.vm.onCardEnable({ id: 'paper', name: '素白纸本', available: false });
    expect(notify).toHaveBeenCalledWith({ title: '该主题暂未开放，敬请期待' });

    wrapper.vm.openDetail(GLOBAL_THEMES[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('H5网页版：该主题全部样式完整生效');
    expect(wrapper.text()).toContain('微信小程序：原生导航栏、底部Tab栏受微信限制，部分样式无法生效');
    expect(wrapper.text()).toContain('会修改的元素');
    expect(wrapper.text()).toContain('导航栏配色');
    expect(wrapper.text()).toContain('实时预览');
    expect(wrapper.text()).toContain('预览仅为模拟效果，不会修改你的界面');
    expect(wrapper.text()).toContain('首页罐头流');
    expect(wrapper.text()).toContain('个人中心');
    expect(wrapper.vm.detailTheme.name).toBe('默认方言主题');
    expect(wrapper.vm.canLivePreviewItem(GLOBAL_THEMES[0])).toBe(true);
    expect(wrapper.vm.canLivePreviewItem(GLOBAL_THEMES[1])).toBe(false);

    wrapper.vm.openLivePreview('theme', GLOBAL_THEMES.find((item) => item.id === 'chuankiang'));
    expect(wrapper.vm.previewOpen).toBe(false);
    expect(notify).toHaveBeenCalledWith({ title: '该主题暂未开放，敬请期待' });
    wrapper.vm.openLivePreview('theme', GLOBAL_THEMES[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.previewOpen).toBe(true);
    expect(wrapper.text()).toContain('立即应用');
    expect(wrapper.text()).toContain('示例罐头占位');
    expect(wrapper.text()).not.toContain('短视频');
    wrapper.vm.closePreview();
    expect(wrapper.vm.previewOpen).toBe(false);

    await wrapper.vm.onCardEnable(GLOBAL_THEMES[0]);
    expect(confirmDialog).not.toHaveBeenCalled();

    wrapper.vm.category = 'missing';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('暂无可用主题，更多方言主题正在制作中');
  });

  it('routes member, event, and creator actions without exposing gated skins', async () => {
    const wrapper = mountPage();
    const member = GLOBAL_THEMES.find((item) => item.id === 'member-pine');
    await wrapper.vm.onCardEnable(member);
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      confirmText: '开通会员',
      cancelText: '取消',
      content: expect.stringContaining('解锁全部会员全局主题、会员局部装扮'),
    }));
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/users/theme-member',
    });

    const ended = GLOBAL_THEMES.find((item) => item.id === 'event-spring');
    await wrapper.vm.onCardEnable(ended);
    expect(notify).toHaveBeenCalledWith({ title: '该限定装扮活动已结束，无法获取' });

    const creator = GLOBAL_THEMES.find((item) => item.id === 'creator-tile');
    await wrapper.vm.onCardEnable(creator);
    expect(notify).toHaveBeenCalledWith({ title: '暂未满足解锁条件，请完成方言创作任务' });
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/users/theme-acquire?focus=creator',
    });

    const event = GLOBAL_THEMES.find((item) => item.id === 'event-lantern');
    await wrapper.vm.onCardEnable(event);
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/users/theme-event?id=event-lantern&kind=theme',
    });

    await wrapper.vm.onAcquire();
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/users/theme-acquire',
    });
  });

  it('lists local dress groups and opens the dress page', async () => {
    const wrapper = mountPage();
    await wrapper.findAll('.tab').at(1).trigger('tap');
    expect(wrapper.text()).toContain('局部装扮可单独修改界面组件，不会强制替换整套全局主题');
    expect(wrapper.text()).toContain('小程序部分原生组件暂不支持自定义装扮');
    expect(wrapper.text()).toContain('最近使用');
    expect(wrapper.text()).toContain('暂无最近使用记录，快去挑选装扮吧');
    expect(wrapper.text()).toContain('导航栏底色与图标');
    expect(wrapper.text()).toContain('底部Tab栏样式');
    expect(wrapper.text()).toContain('交互按钮样式');
    expect(wrapper.text()).toContain('罐头卡片背景');
    expect(wrapper.text()).toContain('个人主页背景');
    expect(wrapper.text()).toContain('头像框&装饰挂件');
    expect(wrapper.text()).toContain('评论气泡样式');
    expect(wrapper.text()).toContain('方言话题卡片');
    expect(wrapper.text()).toContain('装扮素材即将上线');
    expect(wrapper.text()).toContain('我的装扮');
    expect(wrapper.text()).toContain('导航栏');
    expect(wrapper.text()).toContain('交互按钮');
    expect(wrapper.text()).toContain('罐头卡片');
    expect(wrapper.text()).toContain('评论区');
    expect(wrapper.text()).toContain('头像挂件');
    expect(wrapper.text()).toContain('江南吴语头像框');
    expect(wrapper.text()).not.toContain('作品卡片');
    expect(wrapper.text()).not.toContain('短视频');

    wrapper.vm.dressCategory = 'avatar';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('头像框&装饰挂件');
    expect(wrapper.text()).not.toContain('导航栏底色与图标');

    wrapper.vm.dressCategory = 'missing';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('该分类装扮素材即将上线，敬请期待');

    await wrapper.vm.onOpenDress({ id: 'navbar', blocked: false });
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/users/theme-dress?group=navbar',
    });
  });

  it('greys native dress groups on the mini program', async () => {
    isWechatMiniProgram.mockReturnValue(true);
    const wrapper = mountPage();
    await wrapper.findAll('.tab').at(1).trigger('tap');
    const navbar = wrapper.vm.dressGroups.find((group) => group.id === 'navbar');
    const actions = wrapper.vm.dressGroups.find((group) => group.id === 'actions');
    expect(navbar.blocked).toBe(true);
    expect(actions.blocked).toBe(false);
    expect(wrapper.text()).toContain('小程序暂不支持该装扮');

    await wrapper.vm.onOpenDress(navbar);
    expect(notify).toHaveBeenCalledWith({ title: '当前小程序环境暂不支持该装扮' });
    expect(uni.navigateTo).not.toHaveBeenCalled();
  });

  it('summarizes the live outfit, preview, and reset on the mine tab', async () => {
    const store = {
      ui_local_dress: { navbar: 'navbar-plain', actions: 'actions-plain' },
      ui_theme_overlay_local: '0',
    };
    uni.getStorageSync.mockImplementation((key) => store[key] ?? '');
    uni.setStorageSync.mockImplementation((key, value) => {
      store[key] = value;
    });
    const wrapper = mountPage();
    wrapper.vm.refreshOutfit();
    await wrapper.findAll('.tab').at(3).trigger('tap');
    expect(wrapper.text()).toContain('当前正在使用：默认方言主题');
    expect(wrapper.text()).toContain('全局主题会统一修改整套界面风格');
    expect(wrapper.text()).toContain('还没有保存任何搭配方案，可将当前装扮保存为专属搭配');
    expect(wrapper.text()).toContain('系统默认顶栏');
    expect(wrapper.text()).toContain('系统默认按钮');
    expect(wrapper.text()).toContain('当前生效');
    expect(wrapper.text()).toContain('装扮冲突设置');
    expect(wrapper.text()).toContain('全局主题覆盖局部装扮');
    expect(wrapper.find('.action-stack').exists()).toBe(true);
    expect(wrapper.text()).toContain('未登录状态，装扮仅保存在本地，登录后可同步到云端');

    wrapper.vm.openPreview();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('装扮效果预览');
    expect(wrapper.text()).toContain('预览仅为模拟效果，不会修改你的界面');
    expect(wrapper.text()).toContain('评论区');
    expect(wrapper.text()).toContain('话题卡片');
    expect(wrapper.text()).toContain('示例罐头占位');
    expect(wrapper.find('.preview-sheet').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('短视频');
    expect(wrapper.text()).not.toContain('作品');
    await wrapper.vm.onConfirmPreview();
    expect(wrapper.vm.previewOpen).toBe(false);
    expect(notifySuccess).toHaveBeenCalledWith('装扮已生效');

    wrapper.vm.onChangeTheme();
    expect(wrapper.vm.tab).toBe('global');

    await wrapper.vm.onResetDress();
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      content: '确定要清空所有全局主题与局部装扮，恢复到系统默认样式吗？',
    }));
    expect(notifySuccess).toHaveBeenCalledWith('已恢复为默认样式');

    wrapper.vm.onOpenSaveOutfit();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.outfitSheet).toBe(true);
    expect(wrapper.text()).toContain('将当前全局主题与局部装扮保存为一套方案');
    wrapper.vm.outfitForm.name = '川渝市井全套';
    wrapper.vm.onConfirmOutfitSheet();
    expect(notifySuccess).toHaveBeenCalledWith('已保存这套装扮搭配');
    expect(wrapper.vm.savedOutfits[0].name).toBe('川渝市井全套');

    await wrapper.vm.onApplyOutfit(wrapper.vm.savedOutfits[0]);
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: '是否一键应用这套历史搭配？',
      content: '注意：将会覆盖当前全局主题与局部装扮配置。',
    }));
    expect(notifySuccess).toHaveBeenCalledWith('已应用历史搭配方案');
  });

  it('marks native dress as inactive on the mini program mine tab', async () => {
    isWechatMiniProgram.mockReturnValue(true);
    uni.getStorageSync.mockImplementation((key) => {
      if (key === 'ui_local_dress') return { navbar: 'navbar-plain' };
      if (key === 'ui_theme_overlay_local') return '0';
      return '';
    });
    const wrapper = mountPage();
    wrapper.vm.refreshOutfit();
    await wrapper.findAll('.tab').at(3).trigger('tap');
    expect(wrapper.vm.dressStatus(wrapper.vm.appliedDress[0])).toBe('当前环境不生效');
    expect(wrapper.text()).toContain('当前环境不生效');
    wrapper.vm.openPreview();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('⚠️微信小程序原生组件无法自定义，该部分样式不会生效');
    expect(wrapper.text()).toContain('该装扮当前环境不生效');
    wrapper.vm.openDetail(GLOBAL_THEMES[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('⚠️小程序部分原生组件为系统默认样式');
    await wrapper.vm.onConfirmPreview();
    expect(notifySuccess).toHaveBeenCalledWith('装扮已生效');
    expect(notify).toHaveBeenCalledWith({ title: '部分装扮当前环境无法生效，已跳过' });
  });

  it('searches hot keywords, greys upcoming hits, and keeps filter state', async () => {
    const store = {};
    uni.getStorageSync.mockImplementation((key) => store[key] ?? '');
    uni.setStorageSync.mockImplementation((key, value) => {
      store[key] = value;
    });
    const wrapper = mountPage();
    await wrapper.vm.onHotKeyword('川渝烟火');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.searching).toBe(true);
    expect(wrapper.vm.searchRows.map((row) => row.item.id)).toContain('chuankiang');
    expect(wrapper.vm.searchActionDisabled(
      wrapper.vm.searchRows.find((row) => row.item.id === 'chuankiang'),
    )).toBe(true);
    expect(wrapper.text()).toContain('敬请期待');

    wrapper.vm.searchForm.keyword = 'xyz-not-a-skin';
    wrapper.vm.submitThemeSearch();
    await wrapper.vm.$nextTick();
    expect(notify).toHaveBeenCalledWith({ title: '没有匹配的主题装扮，请更换关键词' });
    expect(wrapper.text()).toContain('没有找到相关主题或装扮，换个关键词试试');

    wrapper.vm.exitSearch();
    wrapper.vm.openFilterSheet();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('权限筛选');
    expect(wrapper.text()).toContain('地域方言标签');
    expect(wrapper.text()).toContain('可多选家乡风格');
    expect(wrapper.text()).toContain('罐头卡片');
    expect(wrapper.text()).not.toContain('作品卡片');
    expect(wrapper.text()).not.toContain('短视频');
    wrapper.vm.filterDraft.status = 'ended';
    wrapper.vm.onConfirmFilter();
    expect(wrapper.vm.statusFilter).toBe('ended');
    expect(wrapper.vm.visibleThemes.map((item) => item.id)).toContain('event-spring');
    expect(wrapper.vm.hasExtraFilters).toBe(true);
  });

  it('favorites, likes, and shares live packs but blocks upcoming placeholders', async () => {
    const store = {};
    uni.getStorageSync.mockImplementation((key) => store[key] ?? '');
    uni.setStorageSync.mockImplementation((key, value) => {
      store[key] = value;
    });
    const wrapper = mountPage();
    expect(wrapper.text()).toContain('我的收藏');
    wrapper.vm.tab = 'favorites';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('你还没有收藏任何主题装扮，快去挑选喜欢的吧');

    await wrapper.vm.onToggleFavorite('theme', GLOBAL_THEMES[0]);
    expect(notifySuccess).toHaveBeenCalledWith('已收藏该主题');
    wrapper.vm.tab = 'favorites';
    wrapper.vm.refreshOutfit();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('默认方言主题');

    await wrapper.vm.onToggleLike('theme', GLOBAL_THEMES[0]);
    expect(wrapper.vm.statsOf('theme', GLOBAL_THEMES[0]).liked).toBe(true);

    await wrapper.vm.onShare('theme', GLOBAL_THEMES[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('分享这个主题');
    expect(wrapper.text()).toContain('快来看看这个【默认方言主题】方言主题，太有家乡味道了！');
    expect(wrapper.text()).toContain('分享给好友');
    expect(wrapper.text()).toContain('复制链接');

    await wrapper.vm.onToggleFavorite('theme', GLOBAL_THEMES[1]);
    expect(notify).toHaveBeenCalledWith({ title: '待上线装扮暂不支持收藏' });
    await wrapper.vm.onShare('theme', GLOBAL_THEMES[1]);
    expect(notify).toHaveBeenCalledWith({ title: '待上线装扮暂不支持分享' });
    expect(wrapper.text()).not.toContain('短视频');
    expect(wrapper.text()).not.toContain('作品');
  });

  it('reports enter, tab, detail, search and apply analytics', async () => {
    const wrapper = mountPage();
    wrapper.vm.reportThemeCenterEnter();
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_center_enter'
      && row.params.theme_id === 'default'
      && row.params.logged_in === 'guest'
    ))).toBe(true);

    wrapper.vm.onTabSwitch('local');
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_tab_switch' && row.params.tab === '局部装扮'
    ))).toBe(true);

    const upcoming = GLOBAL_THEMES.find((item) => item.id === 'chuankiang');
    wrapper.vm.openDetail(upcoming);
    await wrapper.vm.$nextTick();
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_item_enter_detail'
      && row.params.item_id === 'chuankiang'
      && row.params.catalog_status === 'upcoming'
    ))).toBe(true);
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_preview_click' && row.params.preview_type === '大图预览'
    ))).toBe(true);

    await wrapper.vm.onCardEnable(upcoming);
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_apply_invalid_item'
      && row.params.item_status === '已下架'
    ))).toBe(true);

    await wrapper.vm.onHotKeyword('川渝烟火');
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_hot_search_click' && row.params.keyword === '川渝烟火'
    ))).toBe(true);
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_search' && Number(row.params.result_count) > 0
    ))).toBe(true);

    wrapper.vm.filterDraft = {
      ...wrapper.vm.catalogQuery,
      access: 'member',
      regions: ['chuankiang'],
      sort: 'heat',
    };
    wrapper.vm.onConfirmFilter();
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_filter_click'
      && row.params.access_filter === '会员专属'
      && row.params.region_tags === '川渝'
    ))).toBe(true);

    await wrapper.vm.onToggleFavorite('theme', GLOBAL_THEMES[0]);
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_collect_click' && row.params.collect_state === '收藏'
    ))).toBe(true);

    wrapper.vm.onOverlayChange(false);
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_switch_conflict' && row.params.overlay === '关闭'
    ))).toBe(true);

    await wrapper.vm.onResetDress();
    expect(getThemeAnalyticsQueue().some((row) => row.event === 'theme_reset_all')).toBe(true);

    wrapper.vm.reportThemeListScroll(88);
    expect(getThemeAnalyticsQueue().some((row) => (
      row.event === 'theme_list_scroll' && row.params.scroll_top === '88'
    ))).toBe(true);
  });

  it('shows a retry empty state when the catalog request fails', async () => {
    const wrapper = mountPage();
    wrapper.vm.catalogFail = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('装扮列表加载失败，请检查网络后重试');
  });

  it('asks before turning overlay on when local dress exists', async () => {
    memoryStore({
      [THEME_OVERLAY_STORAGE_KEY]: '0',
      ui_local_dress: { cards: 'cards-plain' },
    });
    const wrapper = mountPage();
    wrapper.vm.refreshOutfit();
    confirmDialog.mockResolvedValueOnce(false);
    await wrapper.vm.onOverlayChange(true);
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      content: '开启全局主题覆盖局部装扮后，自定义局部装扮将不会生效，是否继续？',
    }));
    expect(wrapper.vm.overlay).toBe(false);
  });

  it('opens a dialog when saved outfits hit the cap', async () => {
    const store = memoryStore({ [THEME_OVERLAY_STORAGE_KEY]: '0' });
    store[THEME_OUTFIT_STORAGE_KEY] = Array.from({ length: THEME_OUTFIT_LIMIT }, (_, index) => ({
      id: `outfit-${index}`,
      name: `方案${index}`,
      themeId: 'default',
      localDress: {},
      savedAt: index,
    }));
    const wrapper = mountPage();
    wrapper.vm.refreshOutfit();
    wrapper.vm.onOpenSaveOutfit();
    wrapper.vm.outfitForm.name = '新搭配';
    await wrapper.vm.onConfirmOutfitSheet();
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      content: '已达到最大保存数量，请删除旧搭配方案后再保存',
    }));
  });

  it('skips removed dresses when applying a saved mix', async () => {
    memoryStore({ [THEME_OVERLAY_STORAGE_KEY]: '0' });
    const wrapper = mountPage();
    await wrapper.vm.onApplyOutfit({
      themeId: 'event-spring',
      localDress: { avatar: 'gone-id' },
    });
    expect(notify).toHaveBeenCalledWith({ title: THEME_FAULT_TOAST.skippedRemoved });
  });

  it('shows the login merge sheet', async () => {
    const wrapper = mountPage();
    wrapper.vm.mergeSheet = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('检测到本地存在装扮配置，是否合并到账号？');
    expect(wrapper.text()).toContain('使用云端配置');
    expect(wrapper.text()).toContain('使用本地配置');
    expect(wrapper.text()).toContain('合并两者');
  });

  it('treats outfit tab and search as in-page subpages on back', async () => {
    const wrapper = mountPage();
    wrapper.vm.tab = 'mine';
    wrapper.vm.onThemeNavBack();
    expect(wrapper.vm.tab).toBe('global');

    wrapper.vm.searching = true;
    wrapper.vm.searchForm.keyword = '川渝';
    wrapper.vm.onThemeNavBack();
    expect(wrapper.vm.searching).toBe(false);
  });

  it('maps outfit and search helpers onto theme-center query', () => {
    goThemeOutfit();
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: `${ROUTES.themeCenter}?tab=mine`,
    });
    goThemeSearch('川渝');
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: `${ROUTES.themeCenter}?searching=1&q=${encodeURIComponent('川渝')}`,
    });
  });
});
