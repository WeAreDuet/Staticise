import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newPage, closeBrowser } from './browser.js';
import { logger } from '../utils/logger.js';

/**
 * Load a local HTML file in a new Playwright page and wait for the load event.
 *
 * @param {string} htmlPath  — absolute or relative path to an HTML file
 * @param {object} [options]
 * @param {number} [options.timeout=30000] — navigation timeout in ms
 * @returns {Promise<import('playwright').Page>}
 */
export async function renderHTML(htmlPath, options = {}) {
  const { timeout = 30000 } = options;
  const absPath = path.resolve(htmlPath);
  const fileUrl = `file://${absPath}`;

  logger.info(`Rendering HTML: ${absPath}`);
  const page = await newPage();

  await page.goto(fileUrl, { waitUntil: 'load', timeout });
  logger.success('Page loaded');
  return page;
}

/**
 * Set the viewport size and take a full-page screenshot.
 *
 * @param {import('playwright').Page} page
 * @param {string} outputPath — destination file path for the screenshot
 * @param {object} [size]
 * @param {number} [size.width=1440]
 * @param {number} [size.height=900]
 * @returns {Promise<string>} the outputPath that was written
 */
export async function takeScreenshot(page, outputPath, { width = 1440, height = 900 } = {}) {
  logger.info(`Setting viewport to ${width}x${height}`);
  await page.setViewportSize({ width, height });

  logger.info(`Taking screenshot → ${outputPath}`);
  await page.screenshot({ path: outputPath, fullPage: true });
  logger.success(`Screenshot saved: ${outputPath}`);
  return outputPath;
}

/**
 * Take desktop (1440px) and mobile (375px) screenshots of a given HTML file.
 *
 * @param {string} htmlPath  — path to the HTML file
 * @param {string} outputDir — directory to write screenshots into
 * @returns {Promise<{ desktop: string, mobile: string }>}
 */
export async function takeResponsiveScreenshots(htmlPath, outputDir) {
  const baseName = path.basename(htmlPath, path.extname(htmlPath));

  const desktopPath = path.join(outputDir, `${baseName}-desktop.png`);
  const mobilePath = path.join(outputDir, `${baseName}-mobile.png`);

  // Desktop
  const desktopPage = await renderHTML(htmlPath);
  await takeScreenshot(desktopPage, desktopPath, { width: 1440, height: 900 });
  await desktopPage.close();

  // Mobile
  const mobilePage = await renderHTML(htmlPath);
  await takeScreenshot(mobilePage, mobilePath, { width: 375, height: 812 });
  await mobilePage.close();

  logger.success('Responsive screenshots complete');
  return { desktop: desktopPath, mobile: mobilePath };
}

/**
 * Extract all visible text content from the page.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<string>}
 */
export async function extractPageText(page) {
  logger.info('Extracting visible text from page');
  const text = await page.evaluate(() => {
    return document.body.innerText;
  });
  return text;
}

/**
 * Extract computed styles (colors and fonts) from the page.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{ colors: string[], fonts: string[] }>}
 */
export async function extractPageStyles(page) {
  logger.info('Extracting computed styles from page');

  const styles = await page.evaluate(() => {
    const colorSet = new Set();
    const fontSet = new Set();
    const elements = document.querySelectorAll('*');

    for (const el of elements) {
      const cs = window.getComputedStyle(el);
      colorSet.add(cs.color);
      colorSet.add(cs.backgroundColor);
      fontSet.add(cs.fontFamily);
    }

    // Remove default/transparent values that are noise
    colorSet.delete('rgba(0, 0, 0, 0)');
    colorSet.delete('transparent');
    fontSet.delete('');

    return {
      colors: [...colorSet],
      fonts: [...fontSet],
    };
  });

  logger.debug(`Found ${styles.colors.length} colors, ${styles.fonts.length} font stacks`);
  return styles;
}
