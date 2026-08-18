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
