import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/routers/login', () => ({
  toLoginPage: vi.fn(),
}));

const { toLoginPage } = await import('@/routers/login');
const authGuard = await import('@/services/authGuard');

let storage;

function installUniMock(token = '') {
  storage = {};
  if (token) storage.token = token;
  global.uni = {
    getStorageSync: vi.fn((key) => storage[key] || ''),
    setStorageSync: vi.fn((key, value) => {
      storage[key] = value;
    }),
    removeStorageSync: vi.fn((key) => {
      delete storage[key];
    }),
    showToast: vi.fn(),
  };
}

describe('authGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installUniMock();
  });

  it('allows unprotected actions without login', () => {
    expect(authGuard.requireAuth('read_can')).toBe(true);
    expect(toLoginPage).not.toHaveBeenCalled();
  });

  it('stores intercept intent and redirects protected anonymous actions', () => {
    expect(authGuard.requireAuth('record_can', { page: 'test' })).toBe(false);

    expect(uni.showToast).toHaveBeenCalledWith(expect.objectContaining({
      title: '请先登录',
      icon: 'none',
    }));
    expect(toLoginPage).toHaveBeenCalledTimes(1);
    expect(authGuard.peekInterceptIntent()).toMatchObject({
      action: 'record_can',
      context: { page: 'test' },
    });
  });

  it('allows protected actions when logged in', () => {
    installUniMock('token-value');

    expect(authGuard.requireAuth('record_can')).toBe(true);
    expect(toLoginPage).not.toHaveBeenCalled();
  });

  it('clears expired intercept intents', () => {
    authGuard.saveInterceptIntent({
      action: 'record_can',
      context: {},
      createdAt: Date.now() - (25 * 60 * 60 * 1000),
    });

    expect(authGuard.peekInterceptIntent()).toBeNull();
    expect(uni.removeStorageSync).toHaveBeenCalledWith('auth_intercept_intent');
  });

  it('clears intent after clearInterceptIntent', () => {
    authGuard.saveInterceptIntent({ action: 'use_same', context: { canId: 1 } });
    authGuard.clearInterceptIntent();
    expect(authGuard.peekInterceptIntent()).toBeNull();
  });

  it('maps product labels for protected feed actions', () => {
    expect(authGuard.actionLabel('use_same')).toBe('用同款');
    expect(authGuard.actionLabel('record_can')).toBe('录一罐');
    expect(authGuard.actionLabel('tab_publish')).toBe('发布');
    expect(authGuard.actionLabel('follow')).toBe('关注');
    expect(authGuard.actionLabel('like')).toBe('点赞');
  });

  it('distinguishes like and use_same intents for resume', () => {
    authGuard.requireAuth('like', { page: 'can_feed', canId: 3 });
    expect(authGuard.peekInterceptIntent().action).toBe('like');

    authGuard.requireAuth('use_same', { page: 'can_feed', canId: 3, postId: 3 });
    expect(authGuard.peekInterceptIntent()).toMatchObject({
      action: 'use_same',
      context: { page: 'can_feed', canId: 3, postId: 3 },
    });
  });
});
