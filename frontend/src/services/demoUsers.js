import { needsDialectOnboarding, ONBOARDING_REASONS } from '@/services/dialectOnboarding';
import rawRequest from '@/utils/rawRequest';

export const DEMO_DECISION_ROWS = [
  {
    key: 'guest',
    type: '游客',
    isNew: '—',
    primaryDialect: '—',
    destination: '查词 / 公开流',
    demoPhone: '未登录',
  },
  {
    key: 'new_user',
    type: '新注册',
    isNew: 'true',
    primaryDialect: 'null',
    destination: 'Epic5 三步引导',
    demoPhone: '新号',
  },
  {
    key: 'missing_dialect',
    type: '老用户缺方言',
    isNew: 'false',
    primaryDialect: 'null',
    destination: '补选（异文案）',
    demoPhone: '…002',
  },
  {
    key: 'ready',
    type: '老用户有方言',
    isNew: 'false',
    primaryDialect: '有值',
    destination: '同方言首页或回流',
    demoPhone: '…001',
  },
];

/**
 * Demo 任务板高亮：游客 / 需引导(新用户|补选) / 就绪
 */
export function resolveDemoDecisionRow({
  loggedIn = false,
  user = null,
  onboardingReason = '',
} = {}) {
  if (!loggedIn || !user?.id) return 'guest';
  const reason = onboardingReason || '';
  const treatAsNew = reason === ONBOARDING_REASONS.NEW_USER;
  if (needsDialectOnboarding(user, treatAsNew) || treatAsNew) {
    if (treatAsNew) return 'new_user';
    return 'missing_dialect';
  }
  return 'ready';
}

export async function seedDemoUsers({ reset = false } = {}) {
  return rawRequest.post('/users/demo-seed', { reset }, {
    auth: false,
    loading: false,
  });
}

export default {
  DEMO_DECISION_ROWS,
  resolveDemoDecisionRow,
  seedDemoUsers,
};
