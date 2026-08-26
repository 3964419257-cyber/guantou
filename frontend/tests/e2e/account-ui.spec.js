import { expect, test } from '@playwright/test';

async function openMine(page) {
  await page.goto('/');
  await page.getByRole('button', { name: '我的' }).click();
  await expect(page.getByText('还没有登录')).toBeVisible();
}

async function themeTokens(page) {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      theme: document.documentElement.dataset.theme || '',
      page: styles.getPropertyValue('--page-color').trim(),
      text: styles.getPropertyValue('--text-color').trim(),
      surface: styles.getPropertyValue('--surface-color').trim(),
    };
  });
}

test('mine page keeps contrast in light and dark themes', async ({ page }) => {
  await openMine(page);

  const light = await themeTokens(page);
  expect(light.page).toBe('#f6f7f3');
  expect(light.text).toBe('#1d2a24');
  expect(light.page).not.toBe(light.text);
  await page.screenshot({
    path: 'test-results/account-me-light.png',
    fullPage: true,
  });

  await page.locator('.theme-option', { hasText: '深色' }).click();
  await expect.poll(async () => (await themeTokens(page)).theme).toBe('dark');

  const dark = await themeTokens(page);
  expect(dark.page).toBe('#121915');
  expect(dark.text).toBe('#edf4ef');
  expect(dark.surface).toBe('#1d2822');
  expect(dark.page).not.toBe(light.page);
  await page.screenshot({
    path: 'test-results/account-me-dark.png',
    fullPage: true,
  });
});

test('account settings stay behind login and use PageShell titles', async ({ page }) => {
  await openMine(page);
  await page.locator('.login-button').click();
  await expect(page.getByText('登录后可以支持铭牌')).toBeVisible();

  await page.goto('/pages/users/settings/information');
  await expect(page).toHaveURL(/\/pages\/login\/login/);

  await page.goto('/pages/users/settings/password');
  await expect(page).toHaveURL(/\/pages\/login\/login/);
});

async function mockSignedInCollector(page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('id', '7');
  });
  await page.route('**/login', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ json: { token: 'fresh-token', id: 7 } });
      return;
    }
    await route.continue();
  });
  await page.route('**/users/7/password', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ json: { user: { id: 7 }, token: 'fresh-token' } });
      return;
    }
    await route.continue();
  });
  await page.route('**/users/7', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 7,
          username: 'collector',
          nickname: '采集者',
          primary_dialect: { id: 3, name: '四川话' },
        },
        contribution: {},
      },
    });
  });
}

test('password settings use design-system fields, visibility, and loading', async ({ page }) => {
  await mockSignedInCollector(page);
  await page.goto('/pages/users/settings/password');

  await expect(page.getByText('修改密码').first()).toBeVisible();
  await expect(page.getByText('原密码').first()).toBeVisible();
  await expect(page.getByText('新密码').first()).toBeVisible();
  await expect(page.getByText('确认密码')).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);

  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('请输入原密码')).toBeVisible();

  const oldInput = page.locator('input').first();
  await expect(oldInput).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: '显示' }).first().click();
  await expect(oldInput).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: '隐藏' }).click();
  await expect(oldInput).toHaveAttribute('type', 'password');

  if (process.env.E2E_SCREENSHOT_DIR) {
    await page.screenshot({
      path: `${process.env.E2E_SCREENSHOT_DIR}/account-password-light.png`,
      fullPage: true,
    });
  }

  const inputs = page.locator('input');
  await inputs.nth(0).fill('old-pass');
  await inputs.nth(1).fill('new-pass');
  await inputs.nth(2).fill('new-pass');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('修改成功')).toBeVisible();
});
