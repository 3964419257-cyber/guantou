import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  registerWechatUser: vi.fn(),
  confirmDialog: vi.fn(),
}));

vi.mock('@/services/user', () => ({ registerWechatUser: mocks.registerWechatUser }));
vi.mock('@/components/ConfirmDialog', () => ({ default: mocks.confirmDialog }));

const { default: WechatRegisterPage } = await import('@/pages/login/register/wechat.vue');

function mountPage() {
  return mount(WechatRegisterPage, {
    global: {
      stubs: {
        PageShell: { template: '<main><slot /></main>' },
      },
    },
  });
}

function fillValidForm(wrapper) {
  wrapper.vm.username = 'wx_user';
  wrapper.vm.password = 'password123';
  wrapper.vm.passwordConfirmed = 'password123';
}

describe('wechat register page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      showToast: vi.fn(),
    };
  });

  it('keeps submitting true until the registration promise settles', async () => {
    let resolveRegister;
    mocks.registerWechatUser.mockImplementation(
      () => new Promise((resolve) => {
        resolveRegister = resolve;
      }),
    );
    const wrapper = mountPage();
    fillValidForm(wrapper);
    wrapper.vm.nickname = '昵称';

    const pending = wrapper.vm.wechatRegister();
    expect(wrapper.vm.submitting).toBe(true);

    resolveRegister({ id: 9, token: 't' });
    await pending;
    expect(wrapper.vm.submitting).toBe(false);
    expect(mocks.registerWechatUser).toHaveBeenCalledWith('wx_user', 'password123', '昵称');
  });

  it('falls back to the username as nickname after confirmation', async () => {
    mocks.confirmDialog.mockResolvedValue(true);
    mocks.registerWechatUser.mockResolvedValue({ id: 9 });
    const wrapper = mountPage();
    fillValidForm(wrapper);

    await wrapper.vm.wechatRegister();

    expect(mocks.confirmDialog).toHaveBeenCalledWith({
      content: '未填写昵称将会用用户名暂代哦~',
    });
    expect(mocks.registerWechatUser).toHaveBeenCalledWith('wx_user', 'password123', 'wx_user');
  });

  it('aborts without submitting when the nickname confirmation is cancelled', async () => {
    mocks.confirmDialog.mockResolvedValue(false);
    const wrapper = mountPage();
    fillValidForm(wrapper);

    await wrapper.vm.wechatRegister();

    expect(mocks.registerWechatUser).not.toHaveBeenCalled();
    expect(wrapper.vm.submitting).toBe(false);
  });

  it('maps server field errors inline and toasts unmapped ones once', async () => {
    const wrapper = mountPage();
    fillValidForm(wrapper);
    wrapper.vm.nickname = '昵称';
    mocks.registerWechatUser.mockRejectedValue({
      statusCode: 409,
      message: '用户名重复',
      data: { username: { code: 'unique', message: '用户名重复' } },
    });

    await wrapper.vm.wechatRegister();

    expect(wrapper.vm.errors.username).toBe('用户名重复');
    expect(uni.showToast).not.toHaveBeenCalled();

    mocks.registerWechatUser.mockRejectedValue({ statusCode: 500, message: '' });
    await wrapper.vm.wechatRegister();

    expect(uni.showToast).toHaveBeenCalledTimes(1);
    expect(uni.showToast).toHaveBeenCalledWith({ title: '注册失败', icon: 'none' });
    expect(wrapper.vm.submitting).toBe(false);
  });

  it('blocks submission when client validation fails', async () => {
    const wrapper = mountPage();
    fillValidForm(wrapper);
    wrapper.vm.passwordConfirmed = 'different';

    await wrapper.vm.wechatRegister();

    expect(mocks.registerWechatUser).not.toHaveBeenCalled();
    expect(wrapper.vm.errors.passwordConfirmed).toBe('两次密码不相同');
  });
});
