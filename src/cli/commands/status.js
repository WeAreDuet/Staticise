import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { readLedger, getLastN, getBestEntry } from '../../core/ledger.js';

export function registerStatus(program) {
  program
    .command('status')
    .description('Show experiment leaderboard and status')
    .action(async () => {
      const entries = await readLedger();

      if (entries.length === 0) {
        logger.info('No experiments yet. Run ' + chalk.cyan('staticise run') + ' to start.');
        return;
      }

      const best = await getBestEntry();
      const totalExperiments = entries.length;
      const improvements = entries.filter((e) => e.status === 'IMPROVED').length;
      const discards = entries.filter((e) => e.status === 'DISCARDED').length;

      // Header
      console.log(chalk.bold.cyan('\n  Staticise Status\n'));

      // Summary stats
      console.log(chalk.bold('  Overview'));
      console.log(chalk.gray('  ' + '\u2500'.repeat(50)));
      console.log(`  Total experiments:  ${chalk.bold(totalExperiments)}`);
      console.log(`  Improvements:       ${chalk.green.bold(improvements)}`);
      console.log(`  Discards:           ${chalk.red.bold(discards)}`);

      if (best) {
        console.log(`  Best score:         ${chalk.bold.yellow(best.composite_score.toFixed(1))} (commit ${chalk.dim(best.commit_hash || 'n/a')})`);
      }
      console.log();

      // Last 20 experiments table
      const recent = await getLastN(20);
      if (recent.length > 0) {
        console.log(chalk.bold('  Recent Experiments (last 20)'));
        console.log(chalk.gray('  ' + '\u2500'.repeat(50)));
        console.log(
          chalk.gray('  ') +
          'ID'.padEnd(14) +
          'Agent'.padEnd(12) +
          'Score'.padEnd(8) +
          'Status'.padEnd(12) +
          'Description'
        );
        console.log(chalk.gray('  ' + '\u2500'.repeat(50)));

        for (const e of recent) {
          const statusColor = e.status === 'IMPROVED' ? chalk.green : chalk.red;
          console.log(
            '  ' +
            chalk.cyan((e.experiment_id || '').slice(0, 12).padEnd(14)) +
            (e.agent || '').padEnd(12) +
            chalk.bold(String(e.composite_score.toFixed(1)).padEnd(8)) +
            statusColor(String(e.status || '').padEnd(12)) +
            chalk.dim((e.description || '').slice(0, 40))
          );
        }
        console.log();
      }

      // Leaderboard by agent
      const agentMap = {};
      for (const e of entries) {
        const agent = e.agent || 'unknown';
        if (!agentMap[agent]) {
          agentMap[agent] = { agent, bestScore: 0, total: 0, improvements: 0 };
        }
        agentMap[agent].total++;
        if (e.status === 'IMPROVED') {
          agentMap[agent].improvements++;
        }
        if (e.composite_score > agentMap[agent].bestScore) {
          agentMap[agent].bestScore = e.composite_score;
        }
      }

      const leaderboardData = Object.values(agentMap).sort((a, b) => b.bestScore - a.bestScore);

      if (leaderboardData.length > 0) {
        logger.leaderboard(leaderboardData);
      }
    });
}
