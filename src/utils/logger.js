import chalk from 'chalk';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let currentLevel = LEVELS.info;

function timestamp() {
  return new Date().toISOString().slice(11, 19);
}

export const logger = {
  setLevel(level) {
    currentLevel = LEVELS[level] ?? LEVELS.info;
  },

  debug(...args) {
    if (currentLevel <= LEVELS.debug) {
      console.log(chalk.gray(`[${timestamp()}] DBG`), ...args);
    }
  },

  info(...args) {
    if (currentLevel <= LEVELS.info) {
      console.log(chalk.blue(`[${timestamp()}]`), ...args);
    }
  },

  success(...args) {
    if (currentLevel <= LEVELS.info) {
      console.log(chalk.green(`[${timestamp()}]`), ...args);
    }
  },

  warn(...args) {
    if (currentLevel <= LEVELS.warn) {
      console.warn(chalk.yellow(`[${timestamp()}] WARN`), ...args);
    }
  },

  error(...args) {
    if (currentLevel <= LEVELS.error) {
      console.error(chalk.red(`[${timestamp()}] ERR`), ...args);
    }
  },

  experiment({ id, agent, score, status, description }) {
    const icon = status === 'IMPROVED' ? chalk.green('+') : chalk.red('-');
    const scoreStr = chalk.bold(score.toFixed(1));
    console.log(`  ${icon} ${chalk.cyan(id)} [${agent}] score=${scoreStr} ${status} — ${description}`);
  },

  leaderboard(entries) {
    console.log(chalk.bold('\n  Leaderboard'));
    console.log(chalk.gray('  ─'.repeat(30)));
    for (const e of entries) {
      const bar = '█'.repeat(Math.round(e.bestScore / 2.5));
      console.log(`  ${chalk.cyan(e.agent.padEnd(12))} best=${chalk.bold(e.bestScore.toFixed(1))} runs=${e.total} wins=${chalk.green(e.improvements)} ${chalk.gray(bar)}`);
    }
    console.log();
  },
};
