import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../core/config.js';
import { runAutoresearchLoop } from '../../core/loop.js';

export function registerRun(program) {
  program
    .command('run')
    .description('Start the autoresearch optimization loop')
    .option('--agents <list>', 'comma-separated list of agents to run', 'all')
    .option('--max-experiments <n>', 'maximum number of experiments to run', '50')
    .option('--target-score <n>', 'target score to stop at', '95')
    .action(async (options) => {
      try {
        const config = await loadConfig();

        if (!config.stitchProjectId) {
          logger.error(
            'No stitchProjectId found in config. Run ' +
              chalk.yellow('staticise init') +
              ' first to set up your project.',
          );
          process.exit(1);
        }

        // Parse agent list
        const agentNames =
          options.agents === 'all'
            ? config.agents?.enabled || ['layout', 'style', 'content', 'perf']
            : options.agents.split(',').map((s) => s.trim());

        const maxExperiments = parseInt(options.maxExperiments, 10) || 50;
        const targetScore = parseFloat(options.targetScore) || 95;

        logger.info(chalk.bold('Starting Staticise autoresearch loop'));
        logger.info(`  Agents:          ${agentNames.join(', ')}`);
        logger.info(`  Max experiments:  ${maxExperiments}`);
        logger.info(`  Target score:     ${targetScore}`);
        logger.info(`  Current best:     ${config.bestScore || 0}`);
        logger.info('');

        let iteration = 0;

        const loop = runAutoresearchLoop(config, {
          maxExperiments,
          targetScore,
          agents: agentNames,
        });

        for await (const { result, leaderboard, iteration: iter, bestScore } of loop) {
          iteration = iter;

          // Show leaderboard every 4 experiments
          if (iteration % 4 === 0) {
            logger.leaderboard(leaderboard.getEntries());
          }
        }

        // Final summary
        logger.info('');
        logger.info(chalk.bold('=== Autoresearch Complete ==='));
        logger.info(`  Total experiments: ${iteration}`);
        logger.info(`  Final best score:  ${config.bestScore?.toFixed(1) || 'N/A'}`);
        logger.info('');

        // Reload leaderboard entries from the last yield — show final leaderboard
        // by re-running the loop one more time is not needed; we captured it above
        logger.info(chalk.bold('Final Leaderboard:'));

        // Re-create leaderboard from the last iteration state
        // The loop already yielded the final leaderboard, so we access it through config
        const finalConfig = await loadConfig();
        logger.info(`  Best score: ${chalk.green(finalConfig.bestScore?.toFixed(1) || '0')}`);
        logger.info(`  Best commit: ${finalConfig.bestCommit || 'none'}`);
      } catch (err) {
        logger.error(`Run failed: ${err.message}`);
        logger.debug(err.stack);
        process.exit(1);
      }
    });
}
