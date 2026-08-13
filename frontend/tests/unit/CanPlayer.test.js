import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/audio', () => ({
  getPlayingSrc: vi.fn(() => ''),
  isAudioPlaying: vi.fn(() => false),
  pauseAudio: vi.fn(),
  playAudio: vi.fn(),
  stopAudioChannel: vi.fn(),
}));

import CanPlayer from '@/components/CanPlayer.vue';
import {
  getPlayingSrc,
  pauseAudio,
  playAudio,
  stopAudioChannel,
} from '@/utils/audio';

describe('CanPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPlayingSrc.mockReturnValue('');
    globalThis.uni = { showToast: vi.fn() };
  });

  it('plays through the can channel and stops dictionary audio first', async () => {
    const wrapper = mount(CanPlayer, {
      props: {
        audioUrl: 'https://example.com/a.mp3',
        durationMs: 8000,
        subtitle: '巴适得很',
        dialectLabel: '四川话',
      },
    });

    await wrapper.find('.play-button').trigger('tap');

    expect(stopAudioChannel).toHaveBeenCalledWith('dictionary');
    expect(playAudio).toHaveBeenCalledWith(
      'https://example.com/a.mp3',
      false,
      expect.objectContaining({ channel: 'can' }),
    );
    expect(wrapper.text()).toContain('0:00 / 0:08');
    expect(wrapper.text()).toContain('巴适得很');
  });

  it('pauses when leaving the page while this clip is active', () => {
    getPlayingSrc.mockReturnValue('https://example.com/a.mp3');
    const wrapper = mount(CanPlayer, {
      props: {
        audioUrl: 'https://example.com/a.mp3',
      },
    });
    wrapper.vm.playing = true;
    wrapper.unmount();
    expect(pauseAudio).toHaveBeenCalled();
  });
});
