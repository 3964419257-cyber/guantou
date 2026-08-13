import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/following', () => ({
  batchFollowUsers: vi.fn(),
  listFollowRecommendations: vi.fn(),
  markRecommendFollowSeen: vi.fn(),
}));

vi.mock('@/routers', () => ({
  toIndexPage: vi.fn(),
}));

import { toIndexPage } from '@/routers';
import {
  batchFollowUsers,
  listFollowRecommendations,
  markRecommendFollowSeen,
} from '@/services/following';

const app = {
  globalData: {
    userInfo: {
      id: 7,
      primary_dialect: { id: 3, name: '四川话', qualified_code: '西南官话.四川' },
      followed_dialects: [{ id: 3, name: '四川话' }],
    },
  },
};
globalThis.getApp = vi.fn(() => app);

const { default: RecommendFollowPage } = await import('@/pages/users/recommend-follow.vue');

function mountPage() {
  return mount(RecommendFollowPage, {
    global: {
      stubs: {
        PageShell: { template: '<main><slot /></main>' },
        DialectBadge: { template: '<span class="badge" />' },
      },
    },
  });
}

describe('follow recommendations page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      reLaunch: vi.fn(),
      showToast: vi.fn(),
      setStorageSync: vi.fn(),
    };
    listFollowRecommendations.mockResolvedValue({
      results: [{
        id: 12,
        username: 'real-author',
        nickname: '真实作者',
        primary_dialect: { id: 3, name: '四川话', qualified_code: '西南官话.四川' },
        public_can_count: 2,
        role: 'creator',
        role_label: '同方言创作者',
        bio: '2 罐公开乡音',
      }],
    });
    batchFollowUsers.mockResolvedValue({ succeeded: [12], failed: [], total: 1 });
  });

  it('loads candidates and batch-follows selected authors', async () => {
    const wrapper = mountPage();
    await wrapper.vm.$options.onLoad.call(wrapper.vm);
    await flushPromises();

    expect(listFollowRecommendations).toHaveBeenCalledWith(3);
    expect(wrapper.text()).toContain('真实作者');
    expect(wrapper.text()).toContain('关注几位同方言的人，首页会更有意思');

    await wrapper.vm.save();

    expect(batchFollowUsers).toHaveBeenCalledWith([12]);
    expect(markRecommendFollowSeen).toHaveBeenCalled();
    expect(toIndexPage).toHaveBeenCalledWith(true);
  });

  it('allows skipping without following', async () => {
    const wrapper = mountPage();
    wrapper.vm.skip();
    expect(markRecommendFollowSeen).toHaveBeenCalled();
    expect(batchFollowUsers).not.toHaveBeenCalled();
    expect(toIndexPage).toHaveBeenCalledWith(true);
  });
});
