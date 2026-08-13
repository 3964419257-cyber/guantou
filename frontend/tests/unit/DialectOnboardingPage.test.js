import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/guantou', () => ({
  listAllDialects: vi.fn(),
}));

vi.mock('@/services/dialectOnboarding', () => ({
  completeOnboarding: vi.fn(),
  exampleWordForDialect: vi.fn((dialect) => (
    dialect?.name === '四川话'
      ? { word: '巴适', meaning: '舒服、好、妥帖' }
      : null
  )),
  loadDialectSample: vi.fn(),
  normalizeOnboardingReason: vi.fn((reason) => reason || 'missing_dialect'),
  ONBOARDING_REASONS: {
    MISSING_DIALECT: 'missing_dialect',
    NEW_USER: 'new_user',
    FORCED: 'forced',
  },
}));

vi.mock('@/services/login', () => ({
  resumeInterruptedPageAfterLogin: vi.fn(async () => false),
}));

vi.mock('@/services/user', () => ({
  clearUserInfo: vi.fn(),
}));

vi.mock('@/routers', () => ({
  toIndexPage: vi.fn(),
}));

vi.mock('@/utils/audio', () => ({
  playAudio: vi.fn(),
}));

globalThis.getApp = vi.fn(() => ({
  globalData: {
    userInfo: { id: 7, username: 'collector', nickname: '采集者', primary_dialect: null },
  },
}));

import { listAllDialects } from '@/services/guantou';
import {
  completeOnboarding,
  loadDialectSample,
} from '@/services/dialectOnboarding';
import { resumeInterruptedPageAfterLogin } from '@/services/login';
import { toIndexPage } from '@/routers';

const { default: DialectOnboardingPage } = await import('@/pages/users/onboarding.vue');

function mountPage() {
  return mount(DialectOnboardingPage, {
    global: {
      stubs: {
        PageShell: {
          template: '<main><slot /></main>',
        },
      },
    },
  });
}

describe('dialect onboarding page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      getStorageSync: vi.fn((key) => (key === 'id' ? 7 : '')),
      reLaunch: vi.fn(),
      showToast: vi.fn(),
    };
    listAllDialects.mockResolvedValue([
      { id: 3, name: '四川话', qualified_code: '西南官话.四川', depth: 1 },
      { id: 5, name: '粤语', qualified_code: '粤.广府', depth: 1 },
    ]);
    loadDialectSample.mockResolvedValue({
      id: 8,
      audio_url: 'can.mp3',
      concept_text: '舒服',
      duration_ms: 3200,
    });
    completeOnboarding.mockResolvedValue({
      id: 7,
      nickname: '采集者',
      primary_dialect: { id: 3, name: '四川话' },
    });
  });

  it('blocks step 2 without a primary dialect and allows default nickname', async () => {
    const wrapper = mountPage();
    expect(wrapper.text()).toContain('1/3');
    wrapper.vm.nickname = '';
    wrapper.vm.nextFromNickname();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.step).toBe(2);
    expect(wrapper.vm.nickname).toBe('采集者');
    expect(wrapper.text()).toContain('2/3');

    wrapper.vm.nextFromPrimary();
    expect(wrapper.vm.error).toBe('请选择主方言');
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it('shows example word, completes after step 3 skip, and returns home', async () => {
    const wrapper = mountPage();
    await wrapper.vm.$options.onLoad.call(wrapper.vm, { reason: 'new_user' });
    await flushPromises();
    wrapper.vm.nextFromNickname();
    await wrapper.vm.selectPrimaryDialect(wrapper.vm.dialects[0]);
    expect(wrapper.vm.exampleWord.word).toBe('巴适');
    wrapper.vm.nextFromPrimary();
    expect(wrapper.vm.step).toBe(3);
    await wrapper.vm.finish(true);
    await flushPromises();

    expect(loadDialectSample).toHaveBeenCalledWith(3);
    expect(completeOnboarding).toHaveBeenCalledWith(7, {
      nickname: '采集者',
      primaryDialectId: 3,
      dialectIds: [3],
    });
    expect(resumeInterruptedPageAfterLogin).toHaveBeenCalledWith(7);
    expect(toIndexPage).toHaveBeenCalledWith(true);
  });
});
