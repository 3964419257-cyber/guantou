import { mount } from '@vue/test-utils';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { peekInterceptIntent } from '@/services/authGuard';
import { cancelLoginToSearch } from '@/services/authJourney';
import { notifySuccess } from '@/services/feedback';
import { requestPhoneCode } from '@/services/phoneAuth';

vi.mock('@/services/authGuard', () => ({
  actionLabel: vi.fn((action) => ({ record_can: '录一罐' }[action] || action)),
  peekInterceptIntent: vi.fn(),
}));

vi.mock('@/services/authJourney', () => ({
  cancelLoginToSearch: vi.fn(),
}));

vi.mock('@/services/login', () => ({
  mpLogin: vi.fn(),
  normalLogin: vi.fn(),
}));

vi.mock('@/services/phoneAuth', () => ({
  loginWithPhone: vi.fn(),
  requestPhoneCode: vi.fn(),
}));

vi.mock('@/services/feedback', () => ({
  notify: vi.fn(),
  notifySuccess: vi.fn(),
}));

globalThis.getApp = vi.fn(() => ({
  globalData: {
    CustomBar: 64,
    StatusBar: 24,
  },
}));

const { default: LoginPage } = await import('@/pages/login/login.vue');

function mountLogin() {
  const wrapper = mount(LoginPage, {
    global: {
      stubs: {
        PageShell: {
          template: '<div><slot /></div>',
        },
      },
    },
  });
  wrapper.vm.$options.onLoad.call(wrapper.vm);
  return wrapper;
}

describe('login page intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      getStorageSync: vi.fn(() => ''),
      onThemeChange: vi.fn(),
      offThemeChange: vi.fn(),
    };
  });

  it('explains the intercepted action and lets the guest return to search', async () => {
    peekInterceptIntent.mockReturnValue({
      action: 'record_can',
      context: { page: 'can_create' },
    });
    const wrapper = mountLogin();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('你刚才想录一罐');
    await wrapper.find('.browse-first').trigger('tap');
    expect(cancelLoginToSearch).toHaveBeenCalledTimes(1);
  });

  it('uses distinct copy for voluntary login', async () => {
    peekInterceptIntent.mockReturnValue({
      action: 'open_mine',
      voluntary: true,
    });
    const wrapper = mountLogin();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('验证身份后返回「我的」');
  });

  it('shows only the selected login form', async () => {
    peekInterceptIntent.mockReturnValue(null);
    const wrapper = mountLogin();

    expect(wrapper.find('.phone-form').exists()).toBe(true);
    expect(wrapper.find('.password-form').exists()).toBe(false);
    wrapper.vm.changeMode({ detail: { value: 'password' } });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.phone-form').exists()).toBe(false);
    expect(wrapper.find('.password-form').exists()).toBe(true);
  });

  it('auto-fills the demo verification code', async () => {
    peekInterceptIntent.mockReturnValue(null);
    requestPhoneCode.mockResolvedValue({ demo_code: '654321', retry_after: 60 });
    const wrapper = mountLogin();
    wrapper.vm.phone = '13800138000';
    await wrapper.vm.sendPhoneCode();
    expect(wrapper.vm.code).toBe('654321');
    expect(wrapper.vm.demoCode).toBe('654321');
    expect(notifySuccess).toHaveBeenCalledWith('验证码 654321');
  });
});
