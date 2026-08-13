import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { cancelLoginToSearch } from '@/services/authJourney';
import { peekInterceptIntent } from '@/services/authGuard';
import { loginWithPhone, requestPhoneCode } from '@/services/phoneAuth';

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
        CuCustom: {
          template: '<view>{{ title }}</view>',
          props: ['title'],
        },
        'cu-custom': {
          template: '<view>{{ title }}</view>',
          props: ['title'],
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
  });

  it('explains the intercepted action and lets the guest return to search', async () => {
    peekInterceptIntent.mockReturnValue({
      action: 'record_can',
      context: { page: 'can_create' },
    });
    const wrapper = mountLogin();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('手机号登录');
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

  it('shows phone auth failures beside the form instead of only toasting', async () => {
    requestPhoneCode.mockRejectedValue(new Error('请输入合法的11位手机号'));
    const wrapper = mountLogin();
    await wrapper.vm.sendPhoneCode();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.form-error').text()).toContain('请输入合法的11位手机号');
    expect(wrapper.vm.sendingCode).toBe(false);

    loginWithPhone.mockRejectedValue(new Error('验证码错误'));
    await wrapper.vm.phoneLogin();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.form-error').text()).toContain('验证码错误');
  });
});
