import { logger } from '../utils/logger.js';

/**
 * Scores design consistency by comparing extracted page styles against the intended design system.
 * Pure computation — no LLM calls.
 *
 * @param {Object} pageStyles - { colors: string[], fonts: string[], headingSizes: number[] }
 * @param {Object} designSystem - { neutral, primary, secondary, accent, fonts: { heading, body } }
 * @returns {{ score: number, issues: string[] }}
 */
export function scoreDesignConsistency(pageStyles, designSystem) {
  logger.debug('Scoring design consistency...');

  const issues = [];
  let totalScore = 0;
  let checks = 0;

  // --- Color count check (weight: ~33%) ---
  const uniqueColors = [...new Set((pageStyles.colors || []).map(c => c.toLowerCase().trim()))];
  const colorCount = uniqueColors.length;
  let colorScore;

  if (colorCount <= 6) {
    colorScore = 100;
  } else if (colorCount <= 10) {
    colorScore = 100 - (colorCount - 6) * 10;
  } else {
    colorScore = Math.max(0, 100 - (colorCount - 6) * 10);
  }

  if (colorCount > 6) {
    issues.push(`Too many unique colors: ${colorCount} (recommended: 6 or fewer)`);
  }

  totalScore += colorScore;
  checks++;

  // --- Font families check (weight: ~33%) ---
  const uniqueFonts = [...new Set((pageStyles.fonts || []).map(f => f.toLowerCase().trim()))];
  const fontCount = uniqueFonts.length;
  let fontScore;

  if (fontCount <= 3) {
    fontScore = 100;
  } else if (fontCount <= 6) {
    fontScore = 100 - (fontCount - 3) * 15;
  } else {
    fontScore = Math.max(0, 100 - (fontCount - 3) * 15);
  }

  if (fontCount > 3) {
    issues.push(`Too many font families: ${fontCount} (recommended: 3 or fewer)`);
  }

  // Check if design system fonts are used
  if (designSystem.fonts) {
    const dsHeading = (designSystem.fonts.heading || '').toLowerCase();
    const dsBody = (designSystem.fonts.body || '').toLowerCase();
    const usedFontsLower = uniqueFonts.map(f => f.toLowerCase());

    if (dsHeading && !usedFontsLower.some(f => f.includes(dsHeading))) {
      fontScore = Math.max(0, fontScore - 15);
      issues.push(`Design system heading font "${designSystem.fonts.heading}" not found in page`);
    }
    if (dsBody && !usedFontsLower.some(f => f.includes(dsBody))) {
      fontScore = Math.max(0, fontScore - 15);
      issues.push(`Design system body font "${designSystem.fonts.body}" not found in page`);
    }
  }

  totalScore += fontScore;
  checks++;

  // --- Heading size progression check (weight: ~33%) ---
  const headingSizes = pageStyles.headingSizes || [];
  let headingScore = 100;

  if (headingSizes.length >= 2) {
    for (let i = 0; i < headingSizes.length - 1; i++) {
      if (headingSizes[i] <= headingSizes[i + 1]) {
        headingScore -= 25;
        issues.push(
          `Heading size progression broken: h${i + 1} (${headingSizes[i]}px) should be larger than h${i + 2} (${headingSizes[i + 1]}px)`
        );
      }
    }
    headingScore = Math.max(0, headingScore);
  } else if (headingSizes.length === 0) {
    headingScore = 50;
    issues.push('No heading sizes detected');
  }

  totalScore += headingScore;
  checks++;

  const score = Math.round(totalScore / checks);

  logger.debug(`Design consistency: score=${score} issues=${issues.length}`);

  return { score, issues };
}
