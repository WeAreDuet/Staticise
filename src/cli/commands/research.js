import chalk from 'chalk';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../../utils/logger.js';
import { getBrowser, closeBrowser } from '../../renderer/browser.js';
import { askClaudeJSON } from '../../utils/claude.js';
import { loadConfig, saveConfig } from '../../core/config.js';

export function registerResearch(program) {
  program
    .command('research')
    .description('Research competitor sites using Playwright')
    .argument('[urls...]', 'URLs to research')
    .action(async (urls) => {
      if (!urls || urls.length === 0) {
        logger.error('Please provide at least one URL to research.');
        logger.info(chalk.dim('Usage: staticise research https://example.com https://other.com'));
        process.exitCode = 1;
        return;
      }

      console.log(chalk.bold.cyan('\n  Staticise Research\n'));
      logger.info(`Researching ${urls.length} site(s)...\n`);

      const screenshotsDir = join(process.cwd(), 'experiments', 'research');
      await mkdir(screenshotsDir, { recursive: true });

      const results = [];

      try {
        const browser = await getBrowser();

        for (const url of urls) {
          logger.info(`Visiting ${chalk.underline(url)}...`);

          const page = await browser.newPage();

          try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

            // Take screenshot
            const slug = url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60);
            const screenshotPath = join(screenshotsDir, `${slug}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            logger.success(`Screenshot saved: ${screenshotPath}`);

            // Extract page text
            const pageText = await page.evaluate(() => {
              return document.body?.innerText?.slice(0, 5000) || '';
            });

            // Extract computed styles from key elements
            const styles = await page.evaluate(() => {
              const getStyles = (el) => {
                if (!el) return null;
                const cs = window.getComputedStyle(el);
                return {
                  fontFamily: cs.fontFamily,
                  fontSize: cs.fontSize,
                  color: cs.color,
                  backgroundColor: cs.backgroundColor,
                };
              };
              return {
                body: getStyles(document.body),
                h1: getStyles(document.querySelector('h1')),
                nav: getStyles(document.querySelector('nav')),
              };
            });

            // Analyze with Claude
            const analysis = await askClaudeJSON(
              `Analyze this website (${url}).

Page text (first 2000 chars):
${pageText.slice(0, 2000)}

Computed styles:
${JSON.stringify(styles, null, 2)}

Return JSON with:
{
  "url": "${url}",
  "designPatterns": ["list of design patterns observed"],
  "colorUsage": { "primary": "", "secondary": "", "accent": "", "background": "", "notes": "" },
  "layoutStructure": { "type": "", "sections": [], "navigation": "" },
  "contentApproach": { "tone": "", "copyStyle": "", "ctaStrategy": "" },
  "keyTakeaways": ["actionable insights"]
}`,
              { system: 'You are a web design analyst. Return only valid JSON.' }
            );

            results.push(analysis);
            logger.success(`Analyzed: ${url}`);
          } catch (err) {
            logger.warn(`Failed to analyze ${url}: ${err.message}`);
            results.push({ url, error: err.message });
          } finally {
            await page.close();
          }
        }

        await closeBrowser();
      } catch (err) {
        logger.error(`Browser error: ${err.message}`);
        await closeBrowser();
      }

      // Save research results to config
      const config = await loadConfig();
      config.research = {
        analyzedAt: new Date().toISOString(),
        sites: results,
      };
      await saveConfig(config);

      // Save raw results as JSON too
      const resultsPath = join(screenshotsDir, 'results.json');
      await writeFile(resultsPath, JSON.stringify(results, null, 2) + '\n');

      // Display summary
      console.log(chalk.bold.green('\n  Research Summary\n'));

      for (const r of results) {
        if (r.error) {
          console.log(`  ${chalk.red('x')} ${chalk.underline(r.url)} — ${chalk.dim(r.error)}`);
          continue;
        }
        console.log(`  ${chalk.green('+')} ${chalk.underline(r.url)}`);
        if (r.designPatterns) {
          console.log(chalk.dim(`    Patterns: ${r.designPatterns.join(', ')}`));
        }
        if (r.colorUsage) {
          console.log(chalk.dim(`    Colors: primary=${r.colorUsage.primary}, accent=${r.colorUsage.accent}`));
        }
        if (r.layoutStructure) {
          console.log(chalk.dim(`    Layout: ${r.layoutStructure.type}`));
        }
        if (r.contentApproach) {
          console.log(chalk.dim(`    Tone: ${r.contentApproach.tone}`));
        }
        if (r.keyTakeaways) {
          console.log(chalk.dim(`    Takeaways: ${r.keyTakeaways.join('; ')}`));
        }
        console.log();
      }

      logger.success(`Research saved to .staticise.json and ${resultsPath}`);
    });
}
