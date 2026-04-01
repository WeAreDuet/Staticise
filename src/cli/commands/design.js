import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { runSeedWorkflow } from '../../workflow/seed.js';

export function registerDesign(program) {
  program
    .command('design')
    .description('Run the 5-step design workflow to create an initial seed design')
    .argument('[concept]', 'one-line concept for the design')
    .action(async (concept) => {
      try {
        const result = await runSeedWorkflow(concept || undefined);
        const { config } = result;

        console.log(chalk.bold.green('\n  Design Summary\n'));

        // Brief
        if (config.brief) {
          console.log(chalk.bold('  Brief:'));
          console.log(chalk.dim(`    Concept:  ${config.brief.concept}`));
          console.log(chalk.dim(`    Audience: ${config.brief.audience}`));
          console.log(chalk.dim(`    Feeling:  ${config.brief.feeling}`));
          console.log();
        }

        // Design Language
        if (config.designLanguage && config.designLanguage.length > 0) {
          console.log(chalk.bold('  Design Language:'));
          console.log(chalk.dim(`    ${config.designLanguage.join(', ')}`));
          console.log();
        }

        // Design System
        if (config.designSystem) {
          const ds = config.designSystem;
          console.log(chalk.bold('  Design System:'));
          console.log(chalk.dim(`    Neutral:   ${ds.neutral}`));
          console.log(chalk.dim(`    Primary:   ${ds.primary}`));
          console.log(chalk.dim(`    Secondary: ${ds.secondary}`));
          console.log(chalk.dim(`    Accent:    ${ds.accent}`));
          console.log(chalk.dim(`    Heading:   ${ds.fonts?.heading}`));
          console.log(chalk.dim(`    Body:      ${ds.fonts?.body}`));
          console.log();
        }

        logger.success('Design workflow complete. Run ' + chalk.cyan('staticise run') + ' to start optimizing.');
      } catch (err) {
        logger.error(chalk.red('Design workflow failed:'));
        logger.error(err.message);
        if (err.stack) {
          logger.debug(err.stack);
        }
        process.exitCode = 1;
      }
    });
}
