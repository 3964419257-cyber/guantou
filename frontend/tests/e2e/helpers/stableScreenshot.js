/**
 * Playwright full-page shots hang when CSS animations never settle
 * (theme pulse / grain) or leftover pickers expand the document.
 */
const STILL_CSS = `
  *, *::before, *::after {
    animation: none !important;
    animation-duration: 0s !important;
    transition: none !important;
  }
  .t-popup, .t-overlay, .t-cascader, .t-picker { display: none !important; }
`;

export async function stableScreenshot(page, options = {}) {
  await page.addStyleTag({ content: STILL_CSS });
  // `animations: 'disabled'` waits for CSS animations to finish. Infinite
  // theme pulse/grain never settles, so the screenshot hits the test timeout.
  return page.screenshot({
    caret: 'hide',
    timeout: 8000,
    ...options,
    animations: 'allow',
  });
}
