import inquirer from 'inquirer';
import chalk from 'chalk';
import { mkdir } from 'fs/promises';
import { saveConfig, loadConfig } from '../../core/config.js';
import { logger } from '../../utils/logger.js';

export function registerInit(program) {
  program
    .command('init')
    .description('Initialize a new Staticise project')
    .action(async () => {
      console.log(chalk.bold.cyan('\n  Staticise Project Setup\n'));

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: 'my-site',
        },
        {
          type: 'input',
          name: 'concept',
          message: 'One-line concept (what is this site about?):',
        },
        {
          type: 'input',
          name: 'audience',
          message: 'Target audience:',
        },
        {
          type: 'input',
          name: 'feeling',
          message: 'Desired feeling (how should visitors feel?):',
        },
        {
          type: 'input',
          name: 'brand',
          message: 'Brand name (if any):',
          default: '',
        },
      ]);

      // Create project directories
      const dirs = ['content', 'content/pages', 'experiments', 'dist'];
      for (const dir of dirs) {
        await mkdir(dir, { recursive: true });
      }

      // Build and save config
      const config = await loadConfig();
      Object.assign(config, {
        projectName: answers.projectName,
        brief: {
          concept: answers.concept,
          audience: answers.audience,
          feeling: answers.feeling,
          brand: answers.brand,
        },
      });

      await saveConfig(config);

      console.log();
      logger.success(chalk.bold('Project initialized!'));
      console.log();
      console.log(chalk.dim('  Created:'));
      console.log(chalk.dim('    .staticise.json   — project configuration'));
      console.log(chalk.dim('    content/          — your site content'));
      console.log(chalk.dim('    experiments/      — experiment history'));
      console.log(chalk.dim('    dist/             — build output'));
      console.log();
      console.log(chalk.bold('  Next steps:'));
      console.log(`    ${chalk.cyan('staticise design')}     — generate your first design`);
      console.log(`    ${chalk.cyan('staticise research')}   — research competitor sites`);
      console.log(`    ${chalk.cyan('staticise run')}        — start the optimization loop`);
      console.log();
    });
}
