import { chromium } from 'playwright';
import { logger } from '../utils/logger.js';

const EXECUTABLE_PATH = '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';

let browserInstance = null;

/**
 * Launch a new Chromium browser instance in headless mode.
 * Replaces any existing instance.
 */
export async function launchBrowser() {
  if (browserInstance) {
    logger.warn('Browser already running — closing before re-launch');
    await closeBrowser();
  }

  logger.info('Launching Chromium browser…');
  browserInstance = await chromium.launch({
    headless: true,
    executablePath: EXECUTABLE_PATH,
    args: ['--no-sandbox'],
  });

  logger.success('Browser launched');
  return browserInstance;
}

/**
 * Return the existing browser instance, or launch a new one.
 */
export async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  return launchBrowser();
}

/**
 * Close the browser if it is open.
 */
export async function closeBrowser() {
  if (browserInstance) {
    logger.info('Closing browser…');
    try {
      await browserInstance.close();
    } catch (err) {
      logger.warn('Error closing browser:', err.message);
    }
    browserInstance = null;
    logger.success('Browser closed');
  }
}

/**
 * Create a new page (tab) from the shared browser instance.
 */
export async function newPage() {
  const browser = await getBrowser();
  return browser.newPage();
}

// Graceful shutdown on SIGINT
process.on('SIGINT', async () => {
  logger.info('SIGINT received — shutting down browser');
  await closeBrowser();
  process.exit(0);
});
