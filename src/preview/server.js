import express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger.js';
import { getBrowser, closeBrowser } from '../renderer/browser.js';

export async function startPreviewServer(dir, { port = 3000, screenshot = false } = {}) {
  const absDir = join(process.cwd(), dir);

  if (!existsSync(join(absDir, 'index.html'))) {
    throw new Error(`No index.html found in ${dir}. Run 'staticise design' first.`);
  }

  const app = express();
  app.use(express.static(absDir));

  const server = app.listen(port, () => {
    logger.success(`Preview server running at http://localhost:${port}`);
    logger.info('Press Ctrl+C to stop');
  });

  if (screenshot) {
    await takePreviewScreenshots(`http://localhost:${port}`, absDir);
  }

  // Keep server running until SIGINT
  await new Promise((resolve) => {
    process.on('SIGINT', () => {
      logger.info('Shutting down preview server...');
      server.close(resolve);
    });
  });
}

async function takePreviewScreenshots(url, outputDir) {
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 375, height: 812 },
  ];

  try {
    const browser = await getBrowser();

    for (const vp of viewports) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(1000);

      const screenshotPath = join(outputDir, `preview-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      logger.success(`Screenshot: ${screenshotPath}`);
      await page.close();
    }

    await closeBrowser();
  } catch (err) {
    logger.warn(`Screenshot failed: ${err.message}`);
    await closeBrowser();
  }
}
