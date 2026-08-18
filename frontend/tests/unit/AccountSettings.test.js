import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/navigation', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    goBack: vi.fn(),
    goHome: vi.fn(),
    goLogin: vi.fn(),
  };
});

vi.mock('@/utils/request', () => ({
  default: {
    put: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/services/user', () => ({
  getUserInfo: vi.fn(async () => ({
    user: { id: 7, nickname: '采集者', username: 'collector', wechat: false },
    contribution: { cans_uploaded: 0, flavors_uploaded: 0, nameplates: 0 },
    notification: { statistics: { unread: 0 } },
  })),
  clearUserInfo: vi.fn(),
  bindingWechat: vi.fn(),
  cancelBindingWechat: vi.fn(),
}));

vi.mock('@/services/canDrafts', () => ({
  listCanDrafts: vi.fn(() => []),
}));

vi.mock('@/services/authJourney', () => ({
  openLoginFromMine: vi.fn(),
}));

vi.mock('@/services/file', () => ({
  uploadFile: vi.fn(),
}));

vi.mock('@/services/guantou', () => ({
  listAllDialects: vi.fn(async () => []),
}));

vi.mock('@/services/following', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));

vi.mock('@/services/shareMessages', () => ({
  defaultMessage: vi.fn(() => ({})),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: vi.fn(async () => true),
}));

import { goBack, goHome } from '@/services/navigation';
import { clearUserInfo } from '@/services/user';
import request from '@/utils/request';
import confirmDialog from '@/components/ConfirmDialog';

const app = {
  globalData: {
    id: 7,
    userInfo: {
      id: 7,
      nickname: '采集者',
      username: 'collector',
      telephone: '13900000001',
    },
  },
};
globalThis.getApp = vi.fn(() => app);

const accountPages = [
  'src/pages/users/me.vue',
  'src/pages/users/details.vue',
  'src/pages/users/settings/information.vue',
  'src/pages/users/settings/username.vue',
  'src/pages/users/settings/nickname.vue',
  'src/pages/users/settings/email.vue',
  'src/pages/users/settings/password.vue',
  'src/pages/users/settings/telephone.vue',
];

const { default: NicknamePage } = await import('@/pages/users/settings/nickname.vue');
const { default: PasswordPage } = await import('@/pages/users/settings/password.vue');
const { default: UserDetailsPage } = await import('@/pages/users/details.vue');
const { default: MePage } = await import('@/pages/users/me.vue');

function mountForm(Page) {
  return mount(Page, {
    global: {
      stubs: {
        PageShell: { template: '<main><slot /></main>' },
        AppShell: { template: '<main><slot /></main>' },
        ThemeSwitcher: true,
      },
    },
  });
}

describe('account UI tokens', () => {
  it('does not introduce hardcoded hex colors in account pages', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    accountPages.forEach((relativePath) => {
      const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
      expect(source, relativePath).not.toMatch(hex);
    });
  });
});

describe('nickname settings form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      getStorageSync: vi.fn((key) => (key === 'id' ? 7 : '')),
      setStorageSync: vi.fn(),
      showToast: vi.fn(),
    };
    request.put.mockResolvedValue({ token: 'token', user: { nickname: '新昵称' } });
  });

  it('blocks empty nickname and maps field errors from data.nickname', async () => {
    const wrapper = mountForm(NicknamePage);
    wrapper.vm.$options.onShow.call(wrapper.vm);
    wrapper.vm.nickname = '   ';
    await wrapper.vm.saveNickname();
    expect(wrapper.vm.error).toBe('请输入昵称');
    expect(request.put).not.toHaveBeenCalled();

    wrapper.vm.nickname = '新昵称';
    request.put.mockRejectedValueOnce({
      message: '请求参数校验失败',
      data: { nickname: { code: 'invalid', message: '昵称过长' } },
    });
    await wrapper.vm.saveNickname();
    await flushPromises();
    expect(wrapper.vm.error).toBe('昵称过长');
    expect(goBack).not.toHaveBeenCalled();
  });

  it('saves and returns after success', async () => {
    const wrapper = mountForm(NicknamePage);
    wrapper.vm.$options.onShow.call(wrapper.vm);
    wrapper.vm.nickname = '新昵称';
    await wrapper.vm.saveNickname();
    await flushPromises();
    expect(request.put).toHaveBeenCalled();
    expect(goBack).toHaveBeenCalled();
    expect(uni.showToast).toHaveBeenCalledWith({ title: '修改成功' });
  });
});

describe('password settings form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      showToast: vi.fn(),
    };
    request.put.mockResolvedValue({});
  });

  it('requires all fields and matching confirmation before submit', async () => {
    const wrapper = mountForm(PasswordPage);
    await wrapper.vm.savePassword();
    expect(wrapper.vm.oldError).toBe('请输入原密码');
    expect(request.put).not.toHaveBeenCalled();

    wrapper.vm.oldPassword = 'old-pass';
    wrapper.vm.newPassword = 'new-pass';
    wrapper.vm.confirmPassword = 'other-pass';
    await wrapper.vm.savePassword();
    expect(wrapper.vm.confirmError).toBe('两次密码不一样');
    expect(request.put).not.toHaveBeenCalled();
  });
});

describe('user details page', () => {
  it('renders inside PageShell', () => {
    const wrapper = mountForm(UserDetailsPage);
    expect(wrapper.html()).toContain('正在读取用户档案');
  });
});

describe('mine page logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      getStorageSync: vi.fn((key) => (key === 'token' ? 'token' : key === 'id' ? 7 : '')),
      showToast: vi.fn(),
    };
  });

  it('confirms before leaving the account', async () => {
    const wrapper = mountForm(MePage);
    await wrapper.vm.exit();
    expect(confirmDialog).toHaveBeenCalled();
    expect(clearUserInfo).toHaveBeenCalled();
    expect(goHome).toHaveBeenCalledWith(true);
  });
});
