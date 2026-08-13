import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/rawRequest', () => ({
  default: {
    post: vi.fn(),
  },
}));

import rawRequest from '@/utils/rawRequest';
import {
  resolveDemoDecisionRow,
  seedDemoUsers,
} from '@/services/demoUsers';

describe('demo users / decision board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('highlights guest when logged out', () => {
    expect(resolveDemoDecisionRow({ loggedIn: false })).toBe('guest');
  });

  it('highlights missing_dialect for old users without primary dialect', () => {
    expect(resolveDemoDecisionRow({
      loggedIn: true,
      user: { id: 2, primary_dialect: null },
    })).toBe('missing_dialect');
  });

  it('highlights ready for old users with primary dialect', () => {
    expect(resolveDemoDecisionRow({
      loggedIn: true,
      user: { id: 1, primary_dialect: { id: 3, name: '四川话' } },
    })).toBe('ready');
  });

  it('highlights new_user when onboarding reason is new_user', () => {
    expect(resolveDemoDecisionRow({
      loggedIn: true,
      user: { id: 9, primary_dialect: null },
      onboardingReason: 'new_user',
    })).toBe('new_user');
  });

  it('seeds demo users via demo-seed endpoint', async () => {
    rawRequest.post.mockResolvedValue({ created: 0, updated: 2, users: [] });
    await seedDemoUsers({ reset: true });
    expect(rawRequest.post).toHaveBeenCalledWith(
      '/users/demo-seed',
      { reset: true },
      { auth: false, loading: false },
    );
  });
});
