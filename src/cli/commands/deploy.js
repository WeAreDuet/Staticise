import { Option } from 'commander';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { logger } from '../../utils/logger.js';

function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getDeployDir() {
  const distDir = join(process.cwd(), 'dist');
  const buildDir = join(process.cwd(), 'build');

  if (existsSync(join(distDir, 'index.html'))) return distDir;
  if (existsSync(join(buildDir, 'index.html'))) return buildDir;
  return null;
}

export function registerDeploy(program) {
  program
    .command('deploy')
    .description('Deploy the exported site')
    .addOption(
      new Option('--provider <name>', 'deployment provider')
        .choices(['vercel', 'netlify', 'gh-pages'])
    )
    .action(async (options) => {
      const deployDir = getDeployDir();

      if (!deployDir) {
        logger.error('No deployable content found in dist/ or build/.');
        logger.info('Run ' + chalk.cyan('staticise export') + ' first to generate the build.');
        process.exitCode = 1;
        return;
      }

      logger.info(`Deploy directory: ${chalk.bold(deployDir)}`);

      const provider = options.provider;

      if (!provider) {
        // Show instructions for all providers
        console.log(chalk.bold.cyan('\n  Deployment Options\n'));

        console.log(chalk.bold('  Vercel'));
        if (commandExists('vercel')) {
          console.log(chalk.green('    CLI detected. ') + chalk.dim(`Run: vercel --prod ${deployDir}`));
        } else {
          console.log(chalk.dim('    Install: npm i -g vercel'));
          console.log(chalk.dim(`    Then:    vercel --prod ${deployDir}`));
        }
        console.log();

        console.log(chalk.bold('  Netlify'));
        if (commandExists('netlify')) {
          console.log(chalk.green('    CLI detected. ') + chalk.dim(`Run: netlify deploy --prod --dir ${deployDir}`));
        } else {
          console.log(chalk.dim('    Install: npm i -g netlify-cli'));
          console.log(chalk.dim(`    Then:    netlify deploy --prod --dir ${deployDir}`));
        }
        console.log();

        console.log(chalk.bold('  GitHub Pages'));
        console.log(chalk.dim('    1. Push your build output to a gh-pages branch'));
        console.log(chalk.dim('    2. Enable Pages in your repository settings'));
        console.log(chalk.dim(`    Or use: npx gh-pages -d ${deployDir}`));
        console.log();

        logger.info('Tip: use ' + chalk.cyan('--provider vercel|netlify|gh-pages') + ' to deploy directly.');
        return;
      }

      // Attempt direct deployment
      console.log(chalk.bold.cyan(`\n  Deploying to ${provider}...\n`));

      try {
        if (provider === 'vercel') {
          if (!commandExists('vercel')) {
            logger.error('Vercel CLI not found.');
            logger.info('Install it: ' + chalk.cyan('npm i -g vercel'));
            process.exitCode = 1;
            return;
          }
          logger.info('Running vercel deploy...');
          execSync(`vercel --prod ${deployDir}`, { stdio: 'inherit' });
          logger.success('Deployed to Vercel!');
        } else if (provider === 'netlify') {
          if (!commandExists('netlify')) {
            logger.error('Netlify CLI not found.');
            logger.info('Install it: ' + chalk.cyan('npm i -g netlify-cli'));
            process.exitCode = 1;
            return;
          }
          logger.info('Running netlify deploy...');
          execSync(`netlify deploy --prod --dir ${deployDir}`, { stdio: 'inherit' });
          logger.success('Deployed to Netlify!');
        } else if (provider === 'gh-pages') {
          logger.info('Deploying to GitHub Pages...');
          execSync(`npx gh-pages -d ${deployDir}`, { stdio: 'inherit' });
          logger.success('Deployed to GitHub Pages!');
        }
      } catch (err) {
        logger.error(`Deployment failed: ${err.message}`);
        process.exitCode = 1;
      }
    });
}
