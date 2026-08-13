import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/authGuard', () => ({
  clearInterceptIntent: vi.fn(),
  peekInterceptIntent: vi.fn(),
}));

vi.mock('@/services/canDrafts', () => ({
  claimAnonymousCanDrafts: vi.fn(),
  getCanDraftOwnerScope: vi.fn(() => 'anonymous:session-1'),
}));

vi.mock('@/services/authJourney', async () => {
  const actual = await vi.importActual('@/services/authJourney');
  return {
    ...actual,
    tryResumeAction: vi.fn(),
  };
});

vi.mock('@/services/feedback', () => ({
  notify: vi.fn(),
}));

import { clearInterceptIntent, peekInterceptIntent } from '@/services/authGuard';
import { tryResumeAction } from '@/services/authJourney';
import { notify } from '@/services/feedback';
import { resumeInterruptedPageAfterLogin } from '@/services/login';

describe('login draft resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      getStorageSync: vi.fn((key) => (key === 'id' ? '7' : '')),
      navigateBack: vi.fn(),
      redirectTo: vi.fn(),
      reLaunch: vi.fn(),
      showToast: vi.fn(),
    };
    globalThis.getCurrentPages = vi.fn(() => [
      { route: 'pages/cans/create' },
      { route: 'pages/login/login' },
    ]);
    peekInterceptIntent.mockReturnValue({
      action: 'record_can',
      context: {
        page: 'can_create',
        returnRoute: '/pages/cans/create',
        ownerScope: 'anonymous:session-1',
      },
    });
  });

  it('returns only to the adjacent can form for a matching intent', async () => {
    await expect(resumeInterruptedPageAfterLogin('7')).resolves.toBe(true);
    expect(clearInterceptIntent).toHaveBeenCalledTimes(1);
    expect(uni.navigateBack).toHaveBeenCalledWith({ delta: 1 });
  });

  it('safely falls back for a like intent without a content id', async () => {
    peekInterceptIntent.mockReturnValue({
      action: 'like',
      context: { page: 'flavor_details' },
    });

    await expect(resumeInterruptedPageAfterLogin('7')).resolves.toBe(true);
    expect(clearInterceptIntent).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({ title: '无法回到原内容' });
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/index' });
    expect(uni.navigateBack).not.toHaveBeenCalled();
  });

  it('discards a stale can-create intent and returns home', async () => {
    getCurrentPages.mockReturnValue([
      { route: 'pages/flavors/details' },
      { route: 'pages/login/login' },
    ]);

    await expect(resumeInterruptedPageAfterLogin('7')).resolves.toBe(true);
    expect(clearInterceptIntent).toHaveBeenCalledTimes(1);
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/index' });
    expect(uni.navigateBack).not.toHaveBeenCalled();
  });

  it('opens a flavor-scoped can form without replaying submission', async () => {
    getCurrentPages.mockReturnValue([
      { route: 'pages/flavors/details' },
      { route: 'pages/login/login' },
    ]);
    peekInterceptIntent.mockReturnValue({
      action: 'record_can',
      context: { page: 'flavor_detail', flavorId: 12, flavorName: '月亮' },
    });

    await expect(resumeInterruptedPageAfterLogin('7')).resolves.toBe(true);
    expect(clearInterceptIntent).toHaveBeenCalledTimes(1);
    expect(uni.redirectTo).toHaveBeenCalledWith({
      url: '/pages/cans/create?flavor=12&flavor_name=%E6%9C%88%E4%BA%AE',
    });
  });

  it('returns to a can detail after an interrupted nameplate action', async () => {
    getCurrentPages.mockReturnValue([
      { route: 'pages/index' },
      { route: 'pages/login/login' },
    ]);
    peekInterceptIntent.mockReturnValue({
      action: 'nameplate_support',
      context: { page: 'can_detail', canId: 18, nameplateId: 4 },
    });

    await expect(resumeInterruptedPageAfterLogin('7')).resolves.toBe(true);
    expect(uni.redirectTo).toHaveBeenCalledWith({
      url: '/pages/cans/details?id=18',
    });
  });

  it('returns voluntary login to the adjacent mine page', async () => {
    getCurrentPages.mockReturnValue([
      { route: 'pages/users/me' },
      { route: 'pages/login/login' },
    ]);
    peekInterceptIntent.mockReturnValue({
      action: 'open_mine',
      context: { page: 'mine' },
      voluntary: true,
    });

    await expect(resumeInterruptedPageAfterLogin('7')).resolves.toBe(true);
    expect(clearInterceptIntent).toHaveBeenCalledTimes(1);
    expect(uni.navigateBack).toHaveBeenCalledWith({ delta: 1 });
  });

  it('blocks a draft that belongs to a different signed-in account', async () => {
    peekInterceptIntent.mockReturnValue({
      action: 'record_can',
      context: {
        page: 'can_create',
        returnRoute: '/pages/cans/create',
        ownerScope: 'user:6',
      },
    });

    await expect(resumeInterruptedPageAfterLogin('7')).resolves.toBe(true);
    expect(clearInterceptIntent).toHaveBeenCalledTimes(1);
    expect(uni.navigateBack).not.toHaveBeenCalled();
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/index?status=me' });
    expect(notify).toHaveBeenCalledWith({ title: '该草稿属于其他账号' });
  });

  it('uses the normal post-login destination without an interrupted action', async () => {
    peekInterceptIntent.mockReturnValue(null);

    await expect(resumeInterruptedPageAfterLogin('7')).resolves.toBe(false);
    expect(clearInterceptIntent).not.toHaveBeenCalled();
    expect(uni.navigateBack).not.toHaveBeenCalled();
  });

  it('resumes follow after returning to the author profile', async () => {
    getCurrentPages.mockReturnValue([
      { route: 'pages/index' },
      { route: 'pages/login/login' },
    ]);
    const intent = {
      action: 'follow',
      context: { page: 'can_feed', userId: 12 },
    };
    peekInterceptIntent.mockReturnValue(intent);

    await expect(resumeInterruptedPageAfterLogin('7')).resolves.toBe(true);
    expect(uni.redirectTo).toHaveBeenCalledWith({
      url: '/pages/users/details?id=12',
    });
    expect(tryResumeAction).toHaveBeenCalledWith(
      expect.objectContaining({
        resumeAction: 'follow',
        url: '/pages/users/details?id=12',
      }),
      intent,
    );
  });
});
