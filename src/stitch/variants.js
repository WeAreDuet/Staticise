import { generateVariants } from './client.js';
import { logger } from '../utils/logger.js';

export async function generateVariantsAndPickBest(projectId, screenIds, prompt, options = {}, scoreFn = null) {
  const {
    creativeRange = 'EXPLORE',
    aspects = [],
    variantCount = 3,
  } = options;

  const result = await generateVariants(projectId, screenIds, prompt, {
    creativeRange,
    aspects,
    variantCount,
  });

  const variants = result?.variants ?? result?.screens ?? [result];

  if (!scoreFn) {
    logger.info(`Returning all ${variants.length} variants (no scoreFn provided)`);
    return variants;
  }

  logger.info(`Scoring ${variants.length} variants...`);
  let bestVariant = null;
  let bestScore = -Infinity;

  for (const variant of variants) {
    const score = await scoreFn(variant);
    logger.debug(`Variant score: ${score}`);

    if (score > bestScore) {
      bestScore = score;
      bestVariant = variant;
    }
  }

  logger.success(`Best variant selected with score ${bestScore}`);
  return bestVariant;
}
