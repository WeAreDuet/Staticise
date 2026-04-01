import { randomUUID } from 'crypto';
import { readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { scoreDesign } from '../scoring/index.js';
import { editScreenWithRetry } from '../stitch/edit.js';
import { generateVariantsAndPickBest } from '../stitch/variants.js';
import { generateScreenWithRetry } from '../stitch/generate.js';
import { exportScreenHTML } from '../stitch/export-html.js';
import { renderHTML, takeScreenshot, extractPageText, extractPageStyles } from '../renderer/render.js';
import { runLighthouseAudit } from '../renderer/lighthouse-runner.js';
import { getCurrentCommit, commitExperiment, discardChanges, tagBest } from './git.js';
import { appendEntry } from './ledger.js';
import { logger } from '../utils/logger.js';

const DIST_HTML = join(process.cwd(), 'dist', 'index.html');
const EXPERIMENTS_DIR = join(process.cwd(), 'experiments');

/**
 * Run a single experiment: propose a change, execute it, score it, and decide whether to keep it.
 *
 * @param {Object} params
 * @param {Object} params.agent - An agent instance with a propose() method
 * @param {Object} params.config - Staticise config
 * @param {number} params.bestScore - Current best composite score
 * @param {string} params.bestHtml - Current best HTML content
 * @param {Object[]} params.history - Recent ledger entries for context
 * @param {import('playwright').Browser} params.browser - Playwright browser instance
 * @returns {Promise<Object>} Experiment result
 */
export async function runExperiment({ agent, config, bestScore, bestHtml, history, browser }) {
  const experimentId = `exp-${Date.now()}-${randomUUID().slice(0, 6)}`;
  logger.info(`Starting experiment ${experimentId} with agent=${agent.name}`);

  let proposal;
  try {
    // 1. Ask the agent to propose a change
    const context = {
      bestHtml,
      bestScore,
      scoreBreakdown: history.length > 0 ? history[history.length - 1] : null,
      history,
      config,
    };
    proposal = await agent.propose(context);
    logger.info(`Proposal: action=${proposal.action} — ${proposal.rationale}`);
  } catch (err) {
    logger.error(`Agent ${agent.name} failed to propose: ${err.message}`);
    return {
      experimentId,
      score: 0,
      scoreBreakdown: null,
      status: 'ERRORED',
      proposal: null,
      kept: false,
    };
  }

  try {
    const { stitchProjectId, currentScreenId } = config;
    const screenIds = [currentScreenId];

    // 2. Execute the proposal via Stitch SDK
    if (proposal.action === 'edit') {
      await editScreenWithRetry(stitchProjectId, screenIds, proposal.prompt);
    } else if (proposal.action === 'variant') {
      await generateVariantsAndPickBest(
        stitchProjectId,
        screenIds,
        proposal.prompt,
        proposal.variantOptions || {},
      );
    } else if (proposal.action === 'generate') {
      await generateScreenWithRetry(stitchProjectId, proposal.prompt);
    }

    // 3. Export HTML to dist/index.html
    await exportScreenHTML(stitchProjectId, currentScreenId, DIST_HTML);

    // 4. Render with Playwright and take screenshots
    const screenshotDir = join(EXPERIMENTS_DIR, experimentId);
    await mkdir(screenshotDir, { recursive: true });

    const page = await browser.newPage();
    try {
      await page.goto(`file://${DIST_HTML}`, { waitUntil: 'load', timeout: 30000 });

      const screenshotPath = join(screenshotDir, 'screenshot.png');
      await takeScreenshot(page, screenshotPath);
      const screenshotBase64 = (await readFile(screenshotPath)).toString('base64');

      const pageText = await extractPageText(page);
      const pageStyles = await extractPageStyles(page);
      const auditResult = await runLighthouseAudit(page);

      // 5. Score the design
      const { composite, breakdown, details } = await scoreDesign({
        page,
        screenshotBase64,
        pageText,
        pageStyles,
        brief: config.brief,
        designSystem: config.designSystem,
        auditResult,
        config,
      });

      await page.close();

      // 6. Decide: keep or discard
      const improved = composite > bestScore;
      const status = improved ? 'IMPROVED' : 'DISCARDED';

      if (improved) {
        const commitSha = commitExperiment(
          `${agent.name}: ${proposal.rationale.slice(0, 60)} (score ${composite.toFixed(1)})`,
        );
        tagBest(composite);

        logger.success(`IMPROVED: ${composite.toFixed(1)} > ${bestScore.toFixed(1)}`);
      } else {
        discardChanges();
        logger.info(`DISCARDED: ${composite.toFixed(1)} <= ${bestScore.toFixed(1)}`);
      }

      // 7. Log to ledger
      const lighthouseScores = breakdown.lighthouse || {};
      await appendEntry({
        timestamp: new Date().toISOString(),
        experimentId,
        agent: agent.name,
        commitHash: improved ? getCurrentCommit() : '',
        compositeScore: composite,
        lighthousePerf: lighthouseScores.performance ?? 0,
        lighthouseA11y: lighthouseScores.accessibility ?? 0,
        llmAesthetics: breakdown.llmAesthetics?.total ?? 0,
        axeScore: breakdown.axeAccessibility?.score ?? 0,
        contentQuality: breakdown.contentQuality?.score ?? 0,
        designConsistency: breakdown.designConsistency?.score ?? 0,
        status,
        description: proposal.rationale,
      });

      return {
        experimentId,
        score: composite,
        scoreBreakdown: breakdown,
        status,
        proposal,
        kept: improved,
      };
    } catch (err) {
      await page.close().catch(() => {});
      throw err;
    }
  } catch (err) {
    logger.error(`Experiment ${experimentId} failed: ${err.message}`);
    discardChanges();

    await appendEntry({
      timestamp: new Date().toISOString(),
      experimentId,
      agent: agent.name,
      commitHash: '',
      compositeScore: 0,
      status: 'ERRORED',
      description: `Error: ${err.message}`,
    });

    return {
      experimentId,
      score: 0,
      scoreBreakdown: null,
      status: 'ERRORED',
      proposal,
      kept: false,
    };
  }
}
