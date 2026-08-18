import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/audio', () => ({
  playManaged: vi.fn(),
  stopAudio: vi.fn(),
}));

import WordCard from '@/components/WordCard.vue';
import { playManaged, stopAudio } from '@/utils/audio';

describe('WordCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      navigateTo: vi.fn(),
      showToast: vi.fn(),
    };
  });

  it('renders word summary and listens via dictionary channel', async () => {
    const wrapper = mount(WordCard, {
      props: {
        word: {
          id: 3,
          text: '巴适',
          dialect: '四川话',
          gloss: '舒服、惬意',
        },
        audioUrl: 'https://example.com/can.mp3',
      },
    });

    expect(wrapper.text()).toContain('巴适');
    expect(wrapper.text()).toContain('舒服、惬意');
    await wrapper.findAll('.action')[0].trigger('tap');
    expect(stopAudio).toHaveBeenCalled();
    expect(playManaged).toHaveBeenCalledWith(
      'https://example.com/can.mp3',
      expect.objectContaining({ onEnded: expect.any(Function) }),
    );
  });

  it('opens flavor detail when entering the word', async () => {
    const wrapper = mount(WordCard, {
      props: {
        word: { id: 8, text: '巴适' },
        audioUrl: '',
      },
    });

    await wrapper.findAll('.action')[1].trigger('tap');
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/flavors/details?id=8',
    });
  });
});
