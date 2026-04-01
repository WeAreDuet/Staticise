import { askClaudeJSON } from '../utils/claude.js';
import { logger } from '../utils/logger.js';

const CONTENT_PROMPT = `You are a content quality analyst. Evaluate the following webpage text against the creative brief.

**Creative Brief:**
- Concept: {concept}
- Target Audience: {audience}
- Feeling: {feeling}
- Brand: {brand}

**Page Text:**
{pageText}

Score the content quality from 0-100 based on these criteria:
- **Lorem ipsum / placeholder text**: Heavy penalty (-30 per instance). Any "lorem ipsum", "dolor sit amet", "[placeholder]", "your text here", or similar filler text.
- **Generic phrases**: Moderate penalty (-10 per instance). Phrases like "welcome to our website", "we are a leading provider", "click here to learn more", or other boilerplate.
- **Brand specificity**: Does the content specifically reference and align with the brand described in the brief? (+20 if highly specific, +10 if somewhat specific, 0 if generic)
- **Reading level appropriateness**: Is the language suitable for the target audience? (+10 if well-matched, 0 if neutral, -10 if mismatched)

Respond with ONLY a JSON object (no markdown fences):
{
  "score": <number 0-100>,
  "issues": ["<issue description>", ...]
}`;

/**
 * Scores content quality by sending page text to Claude for analysis.
 * @param {string} pageText - Extracted text content from the page
 * @param {Object} brief - { concept, audience, feeling, brand }
 * @returns {Promise<{ score: number, issues: string[] }>}
 */
export async function scoreContentQuality(pageText, brief) {
  logger.debug('Scoring content quality via Claude...');

  const truncatedText = pageText.slice(0, 4000);

  const prompt = CONTENT_PROMPT
    .replace('{concept}', brief.concept || 'N/A')
    .replace('{audience}', brief.audience || 'N/A')
    .replace('{feeling}', brief.feeling || 'N/A')
    .replace('{brand}', brief.brand || 'N/A')
    .replace('{pageText}', truncatedText);

  const result = await askClaudeJSON(prompt, {
    system: 'You are a content quality evaluator. Always respond with valid JSON only.',
    maxTokens: 1024,
  });

  const score = Math.max(0, Math.min(100, Number(result.score) || 0));
  const issues = Array.isArray(result.issues) ? result.issues : [];

  logger.debug(`Content quality: score=${score} issues=${issues.length}`);

  return { score, issues };
}
