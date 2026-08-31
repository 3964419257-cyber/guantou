import { chromium } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8011/';

const browser = await chromium.launch({
  channel: 'msedge',
  headless: false,
  devtools: true,
  args: [
    '--auto-open-devtools-for-tabs',
    '--window-size=1680,1040',
    '--window-position=24,16',
  ],
});

const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

await context.addInitScript(() => {
  try {
    localStorage.setItem('ui_theme', 'dark');
  } catch {
    // ignore
  }
});

const page = await context.newPage();
const session = await page.context().newCDPSession(page);
await session.send('Emulation.setDeviceMetricsOverride', {
  mobile: true,
  width: 430,
  height: 932,
  deviceScaleFactor: 3,
  screenWidth: 430,
  screenHeight: 932,
});
await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
await session.send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'dark' }],
});

console.log(`Opening iPhone 15 Pro Max demo at ${BASE_URL}`);
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
console.log('Parked. DevTools + 430x932. Leave the Edge window open.');
await new Promise(() => {});
