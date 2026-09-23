const { chromium } = require('playwright');

const takeScreenshot = async (url) => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const buffer = await page.screenshot();
    const base64 = buffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Screenshot failed:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = { takeScreenshot };
