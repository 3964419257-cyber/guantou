import { chromium } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8011';
const HOLD_MS = Number(process.env.DEMO_HOLD_MS || 2200);

const collector = {
  user: {
    id: 7,
    username: 'collector',
    nickname: '采集者',
    avatar: '',
    email: 'c@example.com',
    telephone: '13900000001',
    birthday: '1991-02-03',
    wechat: false,
    title: { title: '方言采集员' },
    primary_dialect: { id: 3, name: '四川话', qualified_code: '西南官话.四川' },
    follower_count: 12,
    following_count: 4,
    followed_dialects: [{ id: 3, qualified_code: '西南官话.四川' }],
  },
  contribution: {
    cans: 2,
    flavors: 1,
    nameplates: 0,
    views: 18,
    cans_uploaded: 3,
    flavors_uploaded: 1,
    nameplates_uploaded: 0,
  },
  notification: { statistics: { unread: 2, total: 5, sent: 1, received: 4 } },
};

const visitor = {
  user: {
    id: 9,
    username: 'visitor',
    nickname: '邻乡录音',
    avatar: '',
    title: { title: '新手装罐员' },
    primary_dialect: { id: 3, name: '四川话', qualified_code: '西南官话.四川' },
    follower_count: 3,
    following_count: 1,
    is_following: false,
  },
  contribution: {
    cans: 0,
    flavors: 0,
    nameplates: 0,
    views: 0,
  },
};

async function pause(page, ms = HOLD_MS) {
  await page.waitForTimeout(ms);
}

async function clickText(page, name) {
  const candidates = [
    page.getByRole('button', { name }),
    page.getByText(name, { exact: true }),
    page.locator('.base-button', { hasText: name }),
  ];
  for (const locator of candidates) {
    try {
      await locator.first().click({ timeout: 4000 });
      return;
    } catch {
      // try the next locator
    }
  }
  console.log(`  click missed for "${name}"`);
}

async function show(page, title, path, waitText) {
  console.log(`show: ${title} ${path}`);
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  if (waitText) {
    try {
      await page.getByText(waitText).first().waitFor({ timeout: 12000 });
    } catch {
      console.log(`  wait missed for "${waitText}"`);
    }
  }
  await pause(page);
  await page.screenshot({
    path: `test-results/demo-${title.replace(/[^\w\u4e00-\u9fff]+/g, '-')}.png`,
    fullPage: true,
  });
}

async function installAccountMocks(page) {
  await page.route('**/dialects/**', async (route) => {
    await route.fulfill({
      json: {
        count: 1,
        next: null,
        previous: null,
        results: [{
          id: 3,
          name: '四川话',
          qualified_code: '西南官话.四川',
          sort_order: 1,
        }],
      },
    });
  });
  await page.route('**/users/email-code**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { retry_after: 60 } });
      return;
    }
    await route.continue();
  });
  await page.route('**/users/7/email**', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ json: { user: { ...collector.user, email: 'new@example.com' } } });
      return;
    }
    await route.continue();
  });
  await page.route('**/users/7/password**', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ json: { user: collector.user, token: 'fresh-token' } });
      return;
    }
    await route.continue();
  });
  await page.route('**/users/7**', async (route) => {
    await route.fulfill({ json: collector });
  });
  await page.route('**/users/9**', async (route) => {
    await route.fulfill({ json: visitor });
  });
}

const browser = await chromium.launch({
  channel: 'msedge',
  headless: false,
  slowMo: 280,
  args: [
    '--window-size=430,920',
    '--window-position=80,40',
  ],
});

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();

console.log(`Account UI demo at ${BASE_URL}`);

await show(page, '我的 · 游客', '/pages/users/me', '还没有登录');
await clickText(page, '登录 / 注册');
await page.getByText('登录后可以支持铭牌').first().waitFor({ timeout: 8000 }).catch(() => {});
await pause(page, 2800);

await context.addInitScript(() => {
  localStorage.setItem('token', 'demo-token');
  localStorage.setItem('id', '7');
});
await installAccountMocks(page);

await show(page, '我的 · 已登录', '/pages/users/me', '乡声号');
await show(page, '他人主页 · 空罐头引导', '/pages/users/details?id=9', 'TA 还没有公开罐头');
await show(page, '编辑资料', '/pages/users/settings/information', '公开档案');

await page.locator('.avatar-hit').click();
await page.getByText('从相册选择').waitFor({ timeout: 5000 }).catch(() => {});
await pause(page, 1800);
await clickText(page, '取消');
await pause(page, 800);
await page.getByText('生日').click();
await page.getByText('确定').first().waitFor({ timeout: 5000 }).catch(() => {});
await pause(page, 1800);

await show(page, '修改密码', '/pages/users/settings/password', '原密码');
await clickText(page, '保存');
await page.getByText('请输入原密码').waitFor({ timeout: 4000 }).catch(() => {});
await pause(page, 1200);
await clickText(page, '显示');
await pause(page, 1200);

await show(page, '修改邮箱', '/pages/users/settings/email', '原邮箱');
await clickText(page, '保存');
await page.getByText('请输入新邮箱').waitFor({ timeout: 4000 }).catch(() => {});
await pause(page, 1000);
const inputs = page.locator('input');
if (await inputs.count() >= 2) {
  await inputs.nth(1).fill('new@example.com');
  await clickText(page, '获取验证码');
  await page.getByText('验证码已发送').waitFor({ timeout: 4000 }).catch(() => {});
}
await pause(page, 1800);

await show(page, '我的 · 切深色', '/pages/users/me', '编辑资料');
const dark = page.locator('.theme-option', { hasText: '深色' });
if (await dark.count()) {
  await dark.click();
  await pause(page, 2500);
}

console.log('Parked on 我的. Leave the Edge window open.');
await new Promise(() => {});
