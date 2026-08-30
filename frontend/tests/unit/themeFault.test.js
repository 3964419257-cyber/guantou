import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  applySavedOutfit,
  persistActiveTheme,
  resetThemeSessionState,
  THEME_PACK_STORAGE_KEY,
} from '@/services/themeCenter';
import {
  beginThemeApply,
  flushThemeCloudQueue,
  guestThemeSnapshot,
  handleThemeAccountLogin,
  isQuotaError,
  loadThemeCatalog,
  parseThemeStyle,
  resetThemeFaultAdapters,
  setThemeCatalogFetcher,
  setThemeCloudFlusher,
  THEME_CATALOG_CACHE_KEY,
  THEME_FAULT_KIND,
  THEME_FAULT_TOAST,
  themeResourceHealth,
  writeThemeStorage,
} from '@/services/themeFault';

vi.mock('@/services/feedback', () => ({
  notify: vi.fn(),
  notifySuccess: vi.fn(),
}));

describe('themeFault', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetThemeFaultAdapters();
    resetThemeSessionState();
    const store = {};
    global.uni = {
      getStorageSync: vi.fn((key) => store[key] ?? ''),
      setStorageSync: vi.fn((key, value) => {
        store[key] = value;
      }),
      removeStorageSync: vi.fn((key) => {
        delete store[key];
      }),
      getSystemInfoSync: vi.fn(() => ({ SDKVersion: '2.10.0' })),
    };
  });

  it('classifies quota errors and style JSON failures', () => {
    expect(isQuotaError(new Error('quota exceeded'))).toBe(true);
    expect(parseThemeStyle('{bad').ok).toBe(false);
    expect(parseThemeStyle('{bad').kind).toBe(THEME_FAULT_KIND.DATA);
    expect(themeResourceHealth({ preview: '' }).reason).toBe('resource');
    expect(themeResourceHealth({ preview: 'home', removed: true }).reason).toBe('removed');
  });

  it('falls back to cached catalog ids after a network failure', async () => {
    writeThemeStorage(THEME_CATALOG_CACHE_KEY, {
      themes: ['default'],
      dresses: [],
    });
    setThemeCatalogFetcher(() => Promise.reject(new Error('network')));
    const stale = await loadThemeCatalog();
    expect(stale).toMatchObject({
      ok: false,
      source: 'cache',
      stale: true,
      kind: THEME_FAULT_KIND.NETWORK,
    });
    expect(stale.data.themes.length).toBeGreaterThan(0);
  });

  it('returns an empty catalog source when there is no cache', async () => {
    setThemeCatalogFetcher(() => Promise.reject(new Error('network')));
    const empty = await loadThemeCatalog();
    expect(empty).toMatchObject({
      ok: false,
      source: 'empty',
      stale: false,
      data: null,
    });
  });

  it('debounces apply clicks within 800ms', () => {
    expect(beginThemeApply('theme:default').ok).toBe(true);
    expect(beginThemeApply('theme:default')).toMatchObject({
      ok: false,
      reason: 'busy',
      kind: THEME_FAULT_KIND.USER,
    });
    expect(beginThemeApply('outfit:mix').ok).toBe(true);
  });

  it('keeps the session theme when storage quota is full', async () => {
    uni.setStorageSync.mockImplementation((key) => {
      if (key === THEME_PACK_STORAGE_KEY) {
        throw new Error('quota exceeded');
      }
    });
    const result = persistActiveTheme('default');
    await expect(result).resolves.toMatchObject({
      ok: true,
      persisted: false,
      reason: 'quota',
    });
  });

  it('asks to merge guest snapshots after login', async () => {
    uni.setStorageSync('ui_theme_guest_snap', {
      themeId: 'member-pine',
      localDress: { cards: 'cards-plain' },
      outfits: [],
    });
    const login = await handleThemeAccountLogin('user-1');
    expect(login.merge.themeId).toBe('member-pine');
    expect(guestThemeSnapshot().themeId).toBe('member-pine');
  });

  it('clears local theme keys when switching accounts', async () => {
    uni.setStorageSync('ui_theme_account', 'user-a');
    uni.setStorageSync(THEME_PACK_STORAGE_KEY, 'member-pine');
    const switched = await handleThemeAccountLogin('user-b');
    expect(switched.switched).toBe(true);
    expect(uni.removeStorageSync).toHaveBeenCalled();
  });

  it('reports a network kind when cloud flush fails', async () => {
    uni.setStorageSync('token', 'token');
    uni.setStorageSync('ui_theme_pack_cloud', { themeId: 'default' });
    setThemeCloudFlusher(() => Promise.reject(new Error('offline')));
    const result = await flushThemeCloudQueue();
    expect(result).toMatchObject({ ok: false, kind: THEME_FAULT_KIND.NETWORK });
  });

  it('skips missing dress ids when applying a saved mix', () => {
    const applied = applySavedOutfit({
      themeId: 'gone-theme',
      localDress: { cards: 'gone-id' },
    });
    expect(applied.skipped).toBe(true);
    expect(applied.themeId).toBe('default');
    expect(THEME_FAULT_TOAST.skippedRemoved).toBe('部分装扮已下架，已自动跳过');
  });
});
