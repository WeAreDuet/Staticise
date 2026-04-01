import { askClaudeJSON } from '../utils/claude.js';
import { logger } from '../utils/logger.js';

export async function runLayoutStep(brief, designLanguage) {
  const { concept, audience, feeling } = brief;

  logger.info('Determining layout metaphor...');

  const result = await askClaudeJSON(
    `You are a senior web designer deciding the physical layout metaphor for a website.

Brief:
- Concept: ${concept}
- Audience: ${audience}
- Feeling: ${feeling}
- Design language: ${designLanguage.join(', ')}

If your website was a book, what kind of book would it be? For example:
- "coffee table book — full-page imagery, editorial headings, generous whitespace"
- "field manual — dense, structured, utilitarian grid, clear hierarchy"
- "art catalogue — asymmetric layouts, bold type, curated visual rhythm"

Answer with the metaphor, then build a detailed Stitch prompt that combines the design language, the metaphor, and specific layout directions (grid structure, spacing, visual weight distribution, scroll behavior).

Respond in JSON:
{
  "metaphor": "the book metaphor — short description",
  "layoutPrompt": "A detailed Stitch prompt paragraph with layout directions..."
}`,
    { maxTokens: 1024 }
  );

  return {
    metaphor: result.metaphor,
    layoutPrompt: result.layoutPrompt,
  };
}
