import { mount } from '@vue/test-utils';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import PageShell from '@/components/PageShell.vue';
import BaseButton from '@/components/BaseButton.vue';
import FeedbackHost from '@/components/FeedbackHost.vue';

describe('PageShell', () => {
  beforeEach(() => {
    global.uni = {
      $emit: vi.fn(),
      $off: vi.fn(),
      $on: vi.fn(),
      getStorageSync: vi.fn(() => 'light'),
      setStorageSync: vi.fn(),
      getSystemInfoSync: vi.fn(() => ({ theme: 'light' })),
      navigateBack: vi.fn(),
    };
  });

  it('keeps the title in the center grid column when back is hidden', () => {
    const wrapper = mount(PageShell, {
      props: {
        title: '乡声集盒',
        showBack: false,
      },
      global: {
        stubs: { 'scroll-view': { template: '<div><slot /></div>' } },
      },
      slots: { default: '<div>content</div>' },
    });

    const topbar = wrapper.find('.shell-topbar');
    expect(topbar.find('.shell-back').exists()).toBe(false);
    expect(topbar.find('.shell-back-placeholder').exists()).toBe(true);
    expect(topbar.find('.shell-title').text()).toBe('乡声集盒');
    expect(wrapper.findComponent(FeedbackHost).exists()).toBe(true);
    wrapper.unmount();
  });

  it('uses the shared button contract for topbar actions', () => {
    const wrapper = mount(PageShell, {
      props: { title: '编辑', actionText: '保存' },
      global: {
        stubs: { 'scroll-view': { template: '<div><slot /></div>' } },
      },
    });
    const action = wrapper.getComponent(BaseButton);
    expect(action.props('text')).toBe('保存');
    action.vm.$emit('click');
    expect(wrapper.emitted('action')).toHaveLength(1);
    wrapper.unmount();
  });

  it('applies a theme update without browser-only globals', async () => {
    uni.getStorageSync.mockReturnValue('light');
    uni.getSystemInfoSync.mockReturnValue({ theme: 'light' });
    const wrapper = mount(PageShell, {
      props: { title: '主题' },
      global: {
        stubs: { 'scroll-view': { template: '<div><slot /></div>' } },
      },
    });

    wrapper.vm.handleThemeChange({ preference: 'dark', resolved: 'dark', accent: 'tea' });
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).toContain('theme-dark');
    expect(wrapper.classes()).toContain('accent-tea');
    wrapper.unmount();
    expect(uni.$off).toHaveBeenCalled();
  });

  it('skips stack back when interceptBack is set', async () => {
    global.getCurrentPages = () => [
      { route: 'pages/users/me' },
      { route: 'pages/users/theme-center' },
    ];
    uni.reLaunch = vi.fn();
    const wrapper = mount(PageShell, {
      props: {
        title: '主题中心',
        interceptBack: true,
      },
      global: {
        stubs: { 'scroll-view': { template: '<div><slot /></div>' } },
      },
    });
    await wrapper.find('.shell-back').trigger('tap');
    expect(wrapper.emitted('back')).toHaveLength(1);
    expect(uni.navigateBack).not.toHaveBeenCalled();
    expect(uni.reLaunch).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
