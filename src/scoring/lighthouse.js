import { logger } from '../utils/logger.js';

/**
 * Scores a page using Lighthouse audit results.
 * @param {Object} auditResult - Result from lighthouse-runner.js with .performance, .accessibility, .seo, .bestPractices (each 0-100)
 * @returns {{ performance: number, accessibility: number, seo: number, bestPractices: number }}
 */
export function scoreLighthouse(auditResult) {
  const performance = auditResult.performance ?? 0;
  const accessibility = auditResult.accessibility ?? 0;
  const seo = auditResult.seo ?? 0;
  const bestPractices = auditResult.bestPractices ?? 0;

  logger.debug(`Lighthouse scores — perf=${performance} a11y=${accessibility} seo=${seo} bp=${bestPractices}`);

  return { performance, accessibility, seo, bestPractices };
}
