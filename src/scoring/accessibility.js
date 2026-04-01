import { readFile } from 'fs/promises';
import { logger } from '../utils/logger.js';

const IMPACT_PENALTY = {
  critical: 10,
  serious: 5,
  moderate: 2,
  minor: 1,
};

/**
 * Scores accessibility by injecting axe-core into a Playwright page.
 * @param {import('playwright').Page} page - Playwright page instance
 * @returns {Promise<{ score: number, violations: number, details: Array<{ id: string, impact: string, description: string, nodes: number }> }>}
 */
export async function scoreAccessibility(page) {
  logger.debug('Running axe-core accessibility audit...');

  const axeSource = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf-8'
  );

  await page.evaluate(axeSource);

  const results = await page.evaluate(() => {
    return window.axe.run();
  });

  let totalPenalty = 0;
  const details = [];

  for (const violation of results.violations) {
    const impact = violation.impact || 'minor';
    const penalty = (IMPACT_PENALTY[impact] || 1) * violation.nodes.length;
    totalPenalty += penalty;

    details.push({
      id: violation.id,
      impact,
      description: violation.description,
      nodes: violation.nodes.length,
    });
  }

  const score = Math.max(0, 100 - totalPenalty);
  const violations = results.violations.length;

  logger.debug(`Axe accessibility: score=${score} violations=${violations} penalty=${totalPenalty}`);

  return { score, violations, details };
}
