/**
 * Playwright screenshots hang when CSS animations never settle
 * (theme pulse / grain). Freeze motion for the capture, then restore.
 */
const STILL_CSS = `
  *, *::before, *::after {
    animation: none !important;
    animation-duration: 0s !important;
    transition: none !important;
  }
`;

export async function stableScreenshot(page, options = {}) {
  const style = await page.addStyleTag({ content: STILL_CSS });
  try {
    // `animations: 'disabled'` waits for CSS animations to finish. Infinite
    // theme pulse/grain never settles, so the screenshot hits the test timeout.
    return await page.screenshot({
      caret: 'hide',
      timeout: 8000,
      ...options,
      animations: 'allow',
    });
  } finally {
    await style.evaluate((node) => node.remove()).catch(() => {});
  }
}
