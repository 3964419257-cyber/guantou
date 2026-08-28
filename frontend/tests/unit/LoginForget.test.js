import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/navigation', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    goLogin: vi.fn(),
    goUserEmail: vi.fn(),
  };
});

vi.mock('@/services/user', () => ({
  clearUserInfo: vi.fn(),
  getEmailByUsername: vi.fn(),
  requestPasswordResetCode: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('@/services/feedback', () => ({
  notify: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('@/services/theme', () => ({
  applyTheme: vi.fn(() => ({ preference: 'light', resolved: 'light' })),
  getThemePreference: vi.fn(() => 'light'),
}));

import { goLogin, goUserEmail } from '@/services/navigation';
import { notify, notifySuccess } from '@/services/feedback';
import {
  clearUserInfo,
  getEmailByUsername,
  requestPasswordResetCode,
  resetPassword,
} from '@/services/user';

const app = {
  globalData: {
    id: 7,
    userInfo: { username: 'collector' },
  },
};
globalThis.getApp = vi.fn(() => app);

const { default: ForgetPage } = await import('@/pages/login/forget.vue');

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/login/forget.vue'),
  'utf8',
);

function mountPage() {
  return mount(ForgetPage, {
    global: {
      stubs: {
        PageShell: { template: '<main><slot /></main>' },
        BaseForm: {
          name: 'BaseForm',
          props: ['data', 'rules'],
          template: '<div><slot /></div>',
          methods: { validate() { return Promise.resolve(true); } },
        },
      },
    },
  });
}

describe('password recovery page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    app.globalData.id = 7;
    globalThis.uni = {
      getStorageSync: vi.fn((key) => {
        if (key === 'token') return 'token';
        if (key === 'id') return 7;
        return '';
      }),
      showToast: vi.fn(),
    };
    getEmailByUsername.mockResolvedValue({ email_masked: 'c***@example.com' });
    requestPasswordResetCode.mockResolvedValue({
      email_masked: 'c***@example.com',
      retry_after: 60,
      demo_code: '654321',
    });
    resetPassword.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses design-system primitives instead of ColorUI', () => {
    expect(source).toContain('PageShell');
    expect(source).toContain('BaseForm');
    expect(source).toContain('BaseField');
    expect(source).toContain('getEmailByUsername');
    expect(source).toContain('requestPasswordResetCode');
    expect(source).toContain('resetPassword');
    expect(source).not.toContain('cu-custom');
    expect(source).not.toContain('cu-form-group');
    expect(source).not.toContain('cu-btn');
    expect(source).not.toMatch(/<form[\s>]/);
    expect(source).not.toMatch(/<input[\s>]/);
    expect(source).not.toMatch(/<button[\s>]/);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('looks up the masked mailbox then sends a reset code', async () => {
    const wrapper = mountPage();
    wrapper.vm.username = 'collector';
    await wrapper.vm.lookupAccount();
    await flushPromises();
    expect(getEmailByUsername).toHaveBeenCalledWith('collector');
    expect(wrapper.vm.step).toBe(1);
    expect(wrapper.vm.emailMasked).toBe('c***@example.com');

    await wrapper.vm.sendCode();
    await flushPromises();
    expect(requestPasswordResetCode).toHaveBeenCalledWith('collector');
    expect(wrapper.vm.demoCode).toBe('654321');
    expect(notify).toHaveBeenCalledWith({ title: '验证码已生成' });
  });

  it('offers email binding when the account has no mailbox', async () => {
    getEmailByUsername.mockRejectedValueOnce({
      statusCode: 404,
      message: '该账号尚未绑定邮箱，请先绑定邮箱后再找回密码',
      data: {},
    });
    const wrapper = mountPage();
    wrapper.vm.username = 'collector';
    await wrapper.vm.lookupAccount();
    await flushPromises();
    expect(wrapper.vm.step).toBe(0);
    expect(wrapper.vm.needsEmailBind).toBe(true);
    wrapper.vm.goBindEmail();
    expect(goUserEmail).toHaveBeenCalled();
  });

  it('resets the password with the existing payload and returns to login', async () => {
    const wrapper = mountPage();
    wrapper.vm.username = 'collector';
    await wrapper.vm.lookupAccount();
    await flushPromises();
    wrapper.vm.password = 'new-pass';
    wrapper.vm.confirmPassword = 'new-pass';
    wrapper.vm.code = '654321';
    await wrapper.vm.submitReset();
    await flushPromises();
    expect(resetPassword).toHaveBeenCalledWith('collector', 'new-pass', '654321');
    expect(clearUserInfo).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('重置成功，请用新密码登录');
    expect(goLogin).toHaveBeenCalledWith({}, { reset: true });
  });

  it('keeps the draft when confirmation does not match', async () => {
    const wrapper = mountPage();
    wrapper.vm.step = 1;
    wrapper.vm.password = 'new-pass';
    wrapper.vm.confirmPassword = 'other-pass';
    wrapper.vm.code = '654321';
    await wrapper.vm.submitReset();
    expect(wrapper.vm.confirmError).toBe('两次密码不一样');
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
