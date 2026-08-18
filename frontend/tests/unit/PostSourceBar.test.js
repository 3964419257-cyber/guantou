import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/audio', () => ({
  playManaged: vi.fn(),
  stopAudio: vi.fn(),
}));

import PostSourceBar from '@/components/PostSourceBar.vue';

describe('PostSourceBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      navigateTo: vi.fn(),
      showToast: vi.fn(),
    };
  });

  it('shows use-same copy and opens source can detail', async () => {
    const wrapper = mount(PostSourceBar, {
      props: {
        useSameFrom: {
          canId: 12,
          authorName: '川娃子',
          subtitle: '巴适得很',
          durationMs: 5000,
        },
      },
    });

    expect(wrapper.text()).toContain('使用了 @川娃子 的罐头');
    expect(wrapper.classes()).toContain('use-same');
    await wrapper.find('.source-main').trigger('tap');
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/cans/details?id=12',
    });
  });

  it('shows forward copy and opens original post detail', async () => {
    const wrapper = mount(PostSourceBar, {
      props: {
        forwardFrom: {
          postId: 44,
          authorName: '原作者',
          snippet: '转发摘要',
        },
      },
    });

    expect(wrapper.text()).toContain('转发了 @原作者 的博文');
    expect(wrapper.classes()).toContain('forward');
    await wrapper.find('.source-main').trigger('tap');
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/posts/details?id=44',
    });
  });
});
