import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn();

vi.mock('@/utils/httpClient', () => ({
  request: (...args) => request(...args),
}));

vi.mock('@/services/authGuard', () => ({
  isLoggedIn: () => true,
}));

vi.mock('@/services/platform', () => ({
  isWechatMiniProgram: () => false,
}));

import {
  fetchThemeCatalog,
  flushThemeConfig,
  pullThemeCloudState,
} from '@/services/themeApi';
import { THEME_API_PATHS } from '@/services/themeSchema';

describe('themeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.uni = {
      getStorageSync: vi.fn(() => 'token'),
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
    };
  });

  it('maps catalog pages onto theme and decoration items', async () => {
    request.mockImplementation((method, url) => {
      if (url === THEME_API_PATHS.themes) {
        return Promise.resolve({
          catalog_version: 3,
          next: null,
          results: [{
            theme_id: 'default',
            name: '默认方言主题',
            privilege_type: 'free',
            status: 'available',
            cover_img: 'default',
          }],
        });
      }
      if (url === THEME_API_PATHS.decorations) {
        return Promise.resolve({
          catalog_version: 3,
          next: null,
          results: [{
            decoration_id: 'cards-plain',
            name: '系统默认罐头卡',
            component_type: 'card',
            group: 'cards',
            privilege_type: 'free',
            status: 'available',
          }],
        });
      }
      return Promise.resolve({});
    });
    const catalog = await fetchThemeCatalog();
    expect(catalog.catalog_version).toBe(3);
    expect(catalog.themes[0]).toMatchObject({
      id: 'default',
      access: 'free',
      available: true,
    });
    expect(catalog.dresses[0]).toMatchObject({
      id: 'cards-plain',
      group: 'cards',
    });
  });

  it('puts current config ids and ignores a failed social sync', async () => {
    request.mockImplementation((method, url) => {
      if (method === 'PUT' && url === THEME_API_PATHS.config) {
        return Promise.resolve({ global_theme_id: 'default' });
      }
      if (url === THEME_API_PATHS.collects || url === THEME_API_PATHS.mixes) {
        return Promise.reject(new Error('offline'));
      }
      return Promise.resolve({});
    });
    const result = await flushThemeConfig({
      themeId: 'default',
      overlay: true,
      localDress: { cards: 'cards-plain' },
      favorites: { themes: ['default'], dresses: [] },
      outfits: [],
    });
    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledWith(
      'PUT',
      THEME_API_PATHS.config,
      expect.objectContaining({
        global_theme_id: 'default',
        is_cover_local_decoration: true,
        platform: 'h5',
      }),
      expect.objectContaining({ silent: true }),
    );
  });

  it('hydrates the local outfit from cloud config', async () => {
    const hydrateFromCloudConfig = vi.fn();
    vi.doMock('@/services/themeCenter', () => ({
      hydrateFromCloudConfig,
    }));
    request.mockResolvedValue({
      global_theme_id: 'default',
      decoration_map: {},
      is_cover_local_decoration: true,
    });
    const result = await pullThemeCloudState();
    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledWith(
      'GET',
      THEME_API_PATHS.config,
      {},
      expect.objectContaining({ silent: true }),
    );
  });
});
