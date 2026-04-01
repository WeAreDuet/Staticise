import chalk from 'chalk';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger.js';
import { getBrowser, closeBrowser } from '../../renderer/browser.js';

export function registerExport(program) {
  program
    .command('export')
    .description('Export the best design to static HTML')
    .option('--out <dir>', 'output directory', './build')
    .option('--screenshots', 'take screenshots at multiple viewports', false)
    .action(async (options) => {
      const srcPath = join(process.cwd(), 'dist', 'index.html');

      if (!existsSync(srcPath)) {
        logger.error('No design to export. Run ' + chalk.cyan('staticise design') + ' first.');
        process.exitCode = 1;
        return;
      }

      const outDir = options.out;
      await mkdir(outDir, { recursive: true });

      // Copy index.html to output directory
      const html = await readFile(srcPath, 'utf-8');
      const outPath = join(outDir, 'index.html');
      await writeFile(outPath, html);

      logger.success(`Exported to ${chalk.bold(outPath)}`);

      // Copy any additional assets from dist/
      const distDir = join(process.cwd(), 'dist');
      const { readdir } = await import('fs/promises');
      const files = await readdir(distDir);

      for (const file of files) {
        if (file === 'index.html') continue;
        const content = await readFile(join(distDir, file));
        await writeFile(join(outDir, file), content);
        logger.info(chalk.dim(`  Copied ${file}`));
      }

      // Optional screenshots at multiple viewports
      if (options.screenshots) {
        logger.info('Taking viewport screenshots...');

        const viewports = [
          { name: 'mobile', width: 375, height: 812 },
          { name: 'tablet', width: 768, height: 1024 },
          { name: 'desktop', width: 1440, height: 900 },
        ];

        const screenshotsDir = join(outDir, 'screenshots');
        await mkdir(screenshotsDir, { recursive: true });

        try {
          const browser = await getBrowser();

          for (const vp of viewports) {
            const page = await browser.newPage();
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.setContent(html, { waitUntil: 'networkidle' });

            const screenshotPath = join(screenshotsDir, `${vp.name}-${vp.width}x${vp.height}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            logger.success(`  ${vp.name}: ${screenshotPath}`);
            await page.close();
          }

          await closeBrowser();
        } catch (err) {
          logger.warn(`Screenshot capture failed: ${err.message}`);
          await closeBrowser();
        }
      }

      console.log();
      logger.success(chalk.bold('Export complete!'));
      console.log(chalk.dim(`  Output directory: ${outDir}`));
      console.log();
    });
}
