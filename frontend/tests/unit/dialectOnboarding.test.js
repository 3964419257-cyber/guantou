import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/guantou', () => ({
  listCans: vi.fn(),
}));

vi.mock('@/utils/request', () => ({
  default: {
    put: vi.fn(),
  },
}));

import { listCans } from '@/services/guantou';
import {
  ensureDialectOnboarding,
  exampleWordForDialect,
  loadDialectSample,
  needsDialectOnboarding,
  redirectIfNeedsDialectOnboarding,
  saveDialectProfile,
} from '@/services/dialectOnboarding';
import request from '@/utils/request';

describe('dialect onboarding service', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = { globalData: { userInfo: { primary_dialect: null }, id: null } };
    globalThis.getApp = vi.fn(() => app);
    globalThis.getCurrentPages = vi.fn(() => [{ route: 'pages/index' }]);
    globalThis.uni = {
      reLaunch: vi.fn(),
      redirectTo: vi.fn(),
      setStorageSync: vi.fn(),
      getStorageSync: vi.fn((key) => (key === 'token' ? 'token' : '')),
    };
  });

  it('uses isNew and primary_dialect as the shared gate', () => {
    expect(needsDialectOnboarding(null)).toBe(false);
    expect(needsDialectOnboarding({ primary_dialect: null })).toBe(false);
    expect(needsDialectOnboarding({ id: 7, primary_dialect: null })).toBe(true);
    expect(needsDialectOnboarding({ id: 7, primary_dialect: { id: 3 } })).toBe(false);
    expect(needsDialectOnboarding({ id: 7, primary_dialect: { id: 3 } }, true)).toBe(true);
  });

  it('forces incomplete profiles away from the home route', () => {
    expect(ensureDialectOnboarding({ id: 7, primary_dialect: null }, 'forced')).toBe(true);
    expect(uni.reLaunch).toHaveBeenCalledWith({
      url: '/pages/users/onboarding?reason=forced',
    });
  });

  it('redirects authenticated incomplete users trying to open home', () => {
    app.globalData.userInfo = { id: 7, primary_dialect: null };
    expect(redirectIfNeedsDialectOnboarding()).toBe(true);
    expect(uni.reLaunch).toHaveBeenCalledWith({
      url: '/pages/users/onboarding?reason=forced',
    });
  });

  it('does not flash onboarding for empty cold-start userInfo', () => {
    expect(ensureDialectOnboarding({ avatar: '', nickname: '' }, 'forced')).toBe(false);
    expect(uni.reLaunch).not.toHaveBeenCalled();
  });

  it('maps example words for known dialect names', () => {
    expect(exampleWordForDialect({ name: '四川话' })).toMatchObject({
      word: '巴适',
      meaning: '舒服、好、妥帖',
    });
  });

  it('loads one real public can from the selected dialect subtree', async () => {
    listCans.mockResolvedValue({ results: [{ id: 8, audio_url: 'can.mp3' }] });

    await expect(loadDialectSample(4)).resolves.toMatchObject({ id: 8 });
    expect(listCans).toHaveBeenCalledWith({
      dialect_id: 4,
      dialect_scope: 'subtree',
      page: 1,
      page_size: 1,
    });
  });

  it('persists nickname, primary dialect and secondary dialects once', async () => {
    request.put.mockResolvedValue({
      token: 'new-token',
      user: { id: 7, nickname: '川娃', primary_dialect: { id: 4 } },
    });

    const user = await saveDialectProfile(7, {
      nickname: ' 川娃 ',
      primaryDialectId: 4,
      dialectIds: [4, 9],
      region: '成都',
    });

    expect(request.put).toHaveBeenCalledWith('/users/7', {
      user: {
        nickname: '川娃',
        primary_dialect_id: 4,
        followed_dialect_ids: [4, 9],
        region: '成都',
      },
    });
    expect(uni.setStorageSync).toHaveBeenCalledWith('token', 'new-token');
    expect(app.globalData.userInfo).toEqual(user);
  });
});
