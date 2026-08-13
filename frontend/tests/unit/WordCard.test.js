import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/audio', () => ({
  playAudio: vi.fn(),
  stopAudioChannel: vi.fn(),
}));

import WordCard from '@/components/WordCard.vue';
import { playAudio, stopAudioChannel } from '@/utils/audio';

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
    expect(stopAudioChannel).toHaveBeenCalledWith('can');
    expect(playAudio).toHaveBeenCalledWith(
      'https://example.com/can.mp3',
      false,
      expect.objectContaining({ channel: 'dictionary' }),
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
