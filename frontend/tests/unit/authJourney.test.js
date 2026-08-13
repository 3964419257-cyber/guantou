import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/routers/login', () => ({
  toLoginPage: vi.fn(),
}));

vi.mock('@/services/authGuard', () => ({
  clearInterceptIntent: vi.fn(),
  saveInterceptIntent: vi.fn(),
}));

vi.mock('@/services/canSocial', () => ({
  likeCan: vi.fn(),
}));

vi.mock('@/services/following', () => ({
  followUser: vi.fn(),
}));

vi.mock('@/services/feedback', () => ({
  notify: vi.fn(),
  notifySuccess: vi.fn(),
}));

import { toLoginPage } from '@/routers/login';
import { clearInterceptIntent, saveInterceptIntent } from '@/services/authGuard';
import { likeCan } from '@/services/canSocial';
import { notify, notifySuccess } from '@/services/feedback';
import { followUser } from '@/services/following';
import {
  cancelLoginToSearch,
  openLoginFromMine,
  resolveAuthDestination,
  tryResumeAction,
} from '@/services/authJourney';

describe('auth journey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = { reLaunch: vi.fn() };
  });

  it('records voluntary mine login before opening the shared login page', () => {
    openLoginFromMine();

    expect(saveInterceptIntent).toHaveBeenCalledWith({
      action: 'open_mine',
      context: { page: 'mine' },
      voluntary: true,
    });
    expect(toLoginPage).toHaveBeenCalledTimes(1);
  });

  it('clears a cancelled intent and relaunches public search', () => {
    cancelLoginToSearch();

    expect(clearInterceptIntent).toHaveBeenCalledTimes(1);
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/search' });
  });

  it('rejects incomplete nameplate context', () => {
    expect(resolveAuthDestination({
      action: 'nameplate_create',
      context: {},
    })).toEqual({ kind: 'fallback', toast: '无法回到原内容' });
  });

  it('returns publish tab intents to the can publisher', () => {
    expect(resolveAuthDestination({
      action: 'tab_publish',
      context: { page: 'home_publish' },
    })).toEqual({
      kind: 'url',
      route: 'pages/cans/create',
      url: '/pages/cans/create',
    });
  });

  it('returns a follow intent to the author page with auto-follow resume', () => {
    expect(resolveAuthDestination({
      action: 'follow',
      context: { page: 'user_detail', userId: 12 },
    })).toEqual({
      kind: 'url',
      route: 'pages/users/details',
      url: '/pages/users/details?id=12',
      resumeAction: 'follow',
    });
  });

  it('falls back when follow context is missing a user id', () => {
    expect(resolveAuthDestination({
      action: 'follow',
      context: { page: 'can_feed' },
    })).toEqual({
      kind: 'fallback',
      toast: '无法回到该用户',
    });
  });

  it.each(['like', 'tab_like'])('returns a %s intent to the can detail with like resume', (action) => {
    expect(resolveAuthDestination({
      action,
      context: { page: 'can_detail', canId: 19 },
    })).toEqual({
      kind: 'url',
      route: 'pages/cans/details',
      url: '/pages/cans/details?id=19',
      resumeAction: 'like',
    });
  });

  it('returns comment intents to detail with scrollTo=comments', () => {
    expect(resolveAuthDestination({
      action: 'comment',
      context: { page: 'can_detail', canId: 19 },
    })).toEqual({
      kind: 'url',
      route: 'pages/cans/details',
      url: '/pages/cans/details?id=19&scrollTo=comments',
    });
    expect(resolveAuthDestination({
      action: 'comment',
      context: { page: 'post_detail', postId: 8, canId: 19 },
    })).toEqual({
      kind: 'url',
      route: 'pages/posts/details',
      url: '/pages/posts/details?id=8&scrollTo=comments',
      resumeAction: '',
    });
  });

  it('returns a use-same intent directly to the locked composer', () => {
    expect(resolveAuthDestination({
      action: 'use_same',
      context: { page: 'post_detail', canId: 23, postId: 8 },
    })).toEqual({
      kind: 'url',
      route: 'pages/posts/compose',
      url: '/pages/posts/compose?can_id=23',
      resumeAction: 'use_same',
    });
  });

  it('returns circle membership and recording intents to their exact context', () => {
    expect(resolveAuthDestination({
      action: 'circle_join',
      context: { page: 'circle_detail', circleId: 6 },
    })).toEqual({
      kind: 'url',
      route: 'pages/circles/details',
      url: '/pages/circles/details?id=6',
    });
    expect(resolveAuthDestination({
      action: 'record_can',
      context: { page: 'circle_detail', dialectId: 8 },
    })).toEqual({
      kind: 'url',
      route: 'pages/cans/create',
      url: '/pages/cans/create?dialect=8',
    });
  });

  it('auto-resumes follow and like after login', async () => {
    followUser.mockResolvedValue({});
    likeCan.mockResolvedValue({ liked: true });

    await tryResumeAction(
      { resumeAction: 'follow' },
      { context: { userId: 12 } },
    );
    await tryResumeAction(
      { resumeAction: 'like' },
      { context: { canId: 19 } },
    );
    await tryResumeAction(
      { resumeAction: 'use_same' },
      { context: { canId: 23 } },
    );

    expect(followUser).toHaveBeenCalledWith(12);
    expect(likeCan).toHaveBeenCalledWith(19);
    expect(notifySuccess).toHaveBeenCalledWith('已关注');
    expect(notifySuccess).toHaveBeenCalledWith('已点赞');
    expect(notify).toHaveBeenCalledWith({ title: '已带入同款罐头' });
  });
});
