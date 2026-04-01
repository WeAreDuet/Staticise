import { readFile } from 'fs/promises';
import { join } from 'path';
import { loadConfig, saveConfig } from './config.js';
import { initLedger, getLastN } from './ledger.js';
import { runExperiment } from './experiment.js';
import { getBrowser, closeBrowser } from '../renderer/browser.js';
import { LayoutAgent } from '../agents/layout-agent.js';
import { StyleAgent } from '../agents/style-agent.js';
import { ContentAgent } from '../agents/content-agent.js';
import { PerfAgent } from '../agents/perf-agent.js';
import { Scheduler } from '../agents/scheduler.js';
import { Leaderboard } from '../agents/leaderboard.js';
import { logger } from '../utils/logger.js';

const DIST_HTML = join(process.cwd(), 'dist', 'index.html');

/** Map of agent name to constructor */
const AGENT_REGISTRY = {
  layout: () => new LayoutAgent(),
  style: () => new StyleAgent(),
  content: () => new ContentAgent(),
  perf: () => new PerfAgent(),
};

/**
 * Create agent instances from a list of agent names.
 * @param {string[]} agentNames
 * @returns {import('../agents/base-agent.js').BaseAgent[]}
 */
function createAgents(agentNames) {
  const agents = [];
  for (const name of agentNames) {
    const factory = AGENT_REGISTRY[name];
    if (!factory) {
      logger.warn(`Unknown agent "${name}", skipping`);
      continue;
    }
    agents.push(factory());
  }
  if (agents.length === 0) {
    throw new Error('No valid agents configured. Check agents.enabled in config.');
  }
  return agents;
}

/**
 * Read the current best HTML from dist/index.html.
 * @returns {Promise<string>}
 */
async function readBestHtml() {
  try {
    return await readFile(DIST_HTML, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Async generator that runs the autoresearch optimization loop.
 *
 * Yields after each experiment with the result, leaderboard state, and iteration count.
 * Stops when maxExperiments is reached, targetScore is achieved, or SIGINT is received.
 *
 * @param {Object} config - Staticise config object
 * @param {Object} options
 * @param {number} [options.maxExperiments=50] - Maximum number of experiments to run
 * @param {number} [options.targetScore=95] - Target composite score to stop at
 * @param {string[]} [options.agents] - List of agent names to enable (defaults to config)
 * @yields {{ result: Object, leaderboard: import('../agents/leaderboard.js').Leaderboard, iteration: number, bestScore: number }}
 */
export async function* runAutoresearchLoop(config, options = {}) {
  const {
    maxExperiments = 50,
    targetScore = 95,
    agents: agentNames = config.agents?.enabled || ['layout', 'style', 'content', 'perf'],
  } = options;

  // Setup
  await initLedger();
  const agents = createAgents(agentNames);
  const schedulerMode = config.agents?.schedulerMode || 'round-robin-with-momentum';
  const scheduler = new Scheduler(agents, schedulerMode);
  const leaderboard = new Leaderboard();

  logger.info(`Starting autoresearch loop: ${maxExperiments} max experiments, target=${targetScore}`);
  logger.info(`Agents: ${agents.map((a) => a.name).join(', ')}`);

  // Launch browser
  const browser = await getBrowser();

  let bestScore = config.bestScore || 0;
  let interrupted = false;

  // Graceful SIGINT handling
  const sigintHandler = () => {
    logger.warn('SIGINT received — finishing current experiment and shutting down...');
    interrupted = true;
  };
  process.on('SIGINT', sigintHandler);

  try {
    for (let iteration = 1; iteration <= maxExperiments; iteration++) {
      if (interrupted) {
        logger.info('Loop interrupted by SIGINT');
        break;
      }

      // 1. Select next agent
      const agent = scheduler.nextAgent();
      logger.info(`--- Iteration ${iteration}/${maxExperiments} | Agent: ${agent.name} ---`);

      // 2. Gather context
      const bestHtml = await readBestHtml();
      const history = await getLastN(10);

      // 3. Run experiment
      const result = await runExperiment({
        agent,
        config,
        bestScore,
        bestHtml,
        history,
        browser,
      });

      // 4. Update scheduler and leaderboard
      const improved = result.status === 'IMPROVED';
      scheduler.recordResult(agent.name, improved);
      leaderboard.update(agent.name, result.score, improved);

      // 5. Update best score
      if (improved && result.score > bestScore) {
        bestScore = result.score;
        config.bestScore = bestScore;
        await saveConfig(config);
      }

      // 6. Log the experiment
      logger.experiment({
        id: result.experimentId,
        agent: agent.name,
        score: result.score,
        status: result.status,
        description: result.proposal?.rationale || result.status,
      });

      // 7. Yield result
      yield {
        result,
        leaderboard,
        iteration,
        bestScore,
      };

      // 8. Check stop conditions
      if (bestScore >= targetScore) {
        logger.success(`Target score ${targetScore} reached! Best: ${bestScore.toFixed(1)}`);
        break;
      }
    }
  } finally {
    // Cleanup
    process.removeListener('SIGINT', sigintHandler);
    await closeBrowser();
    logger.info('Autoresearch loop finished');
  }
}
