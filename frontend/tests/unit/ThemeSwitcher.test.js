import { mount } from '@vue/test-utils';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  setAccentPreference,
  setEffectPreference,
  setGhostLookPreference,
  setPrimaryLookPreference,
  setStylePack,
  setThemePreference,
} from '@/services/theme';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';

const mocks = vi.hoisted(() => {
  function appearance(overrides = {}) {
    return {
      preference: 'system',
      resolved: 'light',
      accent: 'pine',
      buttonStyle: 'fill',
      primaryLook: 'fill',
      ghostLook: 'line',
      effect: 'none',
      pack: 'pine',
      ...overrides,
    };
  }
  return {
    applyTheme: vi.fn(() => appearance()),
    setThemePreference: vi.fn((preference) => appearance({
      preference,
      resolved: preference === 'dark' ? 'dark' : 'light',
    })),
    setAccentPreference: vi.fn((accent) => appearance({
      preference: 'light',
      resolved: 'light',
      accent,
      pack: accent === 'pine' ? 'pine' : '',
    })),
    setStylePack: vi.fn((pack) => appearance({
      preference: 'light',
      resolved: 'light',
      pack,
      accent: pack === 'classic' ? 'osmanthus' : 'pine',
      buttonStyle: pack === 'classic' ? 'classic' : 'fill',
      primaryLook: pack === 'classic' ? 'classic' : 'fill',
      ghostLook: pack === 'classic' ? 'classic' : 'line',
      effect: pack === 'classic' ? 'gilt' : 'none',
    })),
    setPrimaryLookPreference: vi.fn((primaryLook) => appearance({
      preference: 'light',
      resolved: 'light',
      buttonStyle: primaryLook,
      primaryLook,
      pack: '',
    })),
    setGhostLookPreference: vi.fn((ghostLook) => appearance({
      preference: 'light',
      resolved: 'light',
      ghostLook,
      pack: '',
    })),
    setEffectPreference: vi.fn((effect) => appearance({
      preference: 'light',
      resolved: 'light',
      effect,
      pack: '',
    })),
    getThemePreference: vi.fn(() => 'system'),
    getAccentPreference: vi.fn(() => 'pine'),
    getPrimaryLookPreference: vi.fn(() => 'fill'),
    getButtonStylePreference: vi.fn(() => 'fill'),
    getGhostLookPreference: vi.fn(() => 'line'),
    getEffectPreference: vi.fn(() => 'none'),
    getMatchingStylePack: vi.fn(() => 'pine'),
  };
});

vi.mock('@/services/theme', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ...mocks,
  };
});

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.uni = {
      $emit: vi.fn(),
      $on: vi.fn(),
      $off: vi.fn(),
      getStorageSync: vi.fn(),
      setStorageSync: vi.fn(),
    };
  });

  it('lets the user mix a pack, palette, button looks and an effect', async () => {
    const wrapper = mount(ThemeSwitcher);
    expect(wrapper.text()).toContain('主题');
    expect(wrapper.text()).toContain('风格套装');
    expect(wrapper.text()).toContain('外观');
    expect(wrapper.text()).toContain('配色');
    expect(wrapper.text()).toContain('主按钮');
    expect(wrapper.text()).toContain('次按钮');
    expect(wrapper.text()).toContain('特效');
    expect(wrapper.text()).toContain('古风');
    expect(wrapper.text()).toContain('热烈');
    expect(wrapper.text()).toContain('深沉');
    expect(wrapper.text()).toContain('清新');
    expect(wrapper.findAll('.look-choice')).toHaveLength(24);

    await wrapper.findAll('.theme-option').at(2).trigger('tap');
    expect(setThemePreference).toHaveBeenCalledWith('dark');

    const classic = wrapper.findAll('.pack-choice').find((node) => node.text().includes('古风'));
    await classic.trigger('tap');
    expect(setStylePack).toHaveBeenCalledWith('classic');

    const tea = wrapper.findAll('.accent-choice').find((node) => node.text().includes('茶褐'));
    await tea.trigger('tap');
    expect(setAccentPreference).toHaveBeenCalledWith('tea');

    const soft = wrapper.findAll('.look-choice').find((node) => node.text().includes('浅底'));
    await soft.trigger('tap');
    expect(setPrimaryLookPreference).toHaveBeenCalledWith('soft');

    const gilt = wrapper.findAll('.look-choice').find((node) => node.text().includes('金框'));
    await gilt.trigger('tap');
    expect(setGhostLookPreference).toHaveBeenCalledWith('gilt');

    const glow = wrapper.findAll('.effect-options .theme-option')
      .find((node) => node.text().includes('光晕'));
    await glow.trigger('tap');
    expect(setEffectPreference).toHaveBeenCalledWith('glow');
  });
});
