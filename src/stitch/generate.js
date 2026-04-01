import { generateScreen } from './client.js';
import { logger } from '../utils/logger.js';

export async function generateScreenWithRetry(projectId, prompt, deviceType = 'DESKTOP', { maxRetries = 2, timeoutMs = 300000 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      logger.info(`Generate screen attempt ${attempt}/${maxRetries + 1}`);

      const result = await Promise.race([
        generateScreen(projectId, prompt, deviceType),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Screen generation timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);

      return result;
    } catch (err) {
      lastError = err;
      logger.warn(`Attempt ${attempt} failed: ${err.message}`);

      if (attempt < maxRetries + 1) {
        const backoff = 1000 * attempt;
        logger.info(`Retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw new Error(`generateScreen failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}
