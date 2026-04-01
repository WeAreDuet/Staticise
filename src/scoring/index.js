import { logger } from '../utils/logger.js';
import { scoreLighthouse } from './lighthouse.js';
import { scoreLLMAesthetics } from './llm-judge.js';
import { scoreAccessibility } from './accessibility.js';
import { scoreContentQuality } from './content-quality.js';
import { scoreDesignConsistency } from './design-consistency.js';

const DEFAULT_WEIGHTS = {
  llmAesthetics: 0.30,
  contentQuality: 0.15,
  designConsistency: 0.15,
  lighthousePerformance: 0.10,
  lighthouseAccessibility: 0.10,
  axeAccessibility: 0.10,
  lighthouseSeo: 0.05,
  lighthouseBestPractices: 0.05,
};

/**
 * Orchestrates all scorers and computes a weighted composite design quality score.
 *
 * @param {Object} params
 * @param {import('playwright').Page} params.page - Playwright page for axe-core injection
 * @param {string} params.screenshotBase64 - Base64-encoded PNG screenshot
 * @param {string} params.pageText - Extracted text content from the page
 * @param {Object} params.pageStyles - { colors: string[], fonts: string[], headingSizes: number[] }
 * @param {Object} params.brief - { concept, audience, feeling, brand }
 * @param {Object} params.designSystem - { neutral, primary, secondary, accent, fonts: { heading, body } }
 * @param {Object} params.auditResult - Lighthouse audit result with .performance, .accessibility, .seo, .bestPractices
 * @param {Object} params.config - Config object with .scoring.weights
 * @returns {Promise<{ composite: number, breakdown: Object, details: Object }>}
 */
export async function scoreDesign({ page, screenshotBase64, pageText, pageStyles, brief, designSystem, auditResult, config }) {
  const weights = { ...DEFAULT_WEIGHTS, ...config?.scoring?.weights };

  logger.info('Running design scoring pipeline...');

  // Run scorers in parallel where possible
  const [llmResult, contentResult, axeResult] = await Promise.all([
    scoreLLMAesthetics(screenshotBase64, brief),
    scoreContentQuality(pageText, brief),
    scoreAccessibility(page),
  ]);

  // Synchronous scorers
  const lighthouseResult = scoreLighthouse(auditResult);
  const consistencyResult = scoreDesignConsistency(pageStyles, designSystem);

  // Compute weighted composite
  const composite =
    weights.llmAesthetics * llmResult.total +
    weights.contentQuality * contentResult.score +
    weights.designConsistency * consistencyResult.score +
    weights.lighthousePerformance * lighthouseResult.performance +
    weights.lighthouseAccessibility * lighthouseResult.accessibility +
    weights.axeAccessibility * axeResult.score +
    weights.lighthouseSeo * lighthouseResult.seo +
    weights.lighthouseBestPractices * lighthouseResult.bestPractices;

  const roundedComposite = Math.round(composite * 100) / 100;

  const breakdown = {
    lighthouse: lighthouseResult,
    llmAesthetics: llmResult,
    axeAccessibility: axeResult,
    contentQuality: contentResult,
    designConsistency: consistencyResult,
  };

  const details = {
    weights,
    weightedComponents: {
      llmAesthetics: weights.llmAesthetics * llmResult.total,
      contentQuality: weights.contentQuality * contentResult.score,
      designConsistency: weights.designConsistency * consistencyResult.score,
      lighthousePerformance: weights.lighthousePerformance * lighthouseResult.performance,
      lighthouseAccessibility: weights.lighthouseAccessibility * lighthouseResult.accessibility,
      axeAccessibility: weights.axeAccessibility * axeResult.score,
      lighthouseSeo: weights.lighthouseSeo * lighthouseResult.seo,
      lighthouseBestPractices: weights.lighthouseBestPractices * lighthouseResult.bestPractices,
    },
  };

  logger.info(`Design score: ${roundedComposite}/100`);
  logger.debug(`Score breakdown: ${JSON.stringify(details.weightedComponents)}`);

  return { composite: roundedComposite, breakdown, details };
}
