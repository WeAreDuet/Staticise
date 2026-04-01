import { editScreen } from './client.js';
import { logger } from '../utils/logger.js';

export async function editScreenWithRetry(projectId, screenIds, prompt, { maxRetries = 2 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      logger.info(`Edit screen attempt ${attempt}/${maxRetries + 1}`);
      const result = await editScreen(projectId, screenIds, prompt);
      return result;
    } catch (err) {
      lastError = err;
      logger.warn(`Edit attempt ${attempt} failed: ${err.message}`);

      if (attempt < maxRetries + 1) {
        const backoff = 1000 * attempt;
        logger.info(`Retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw new Error(`editScreen failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}
