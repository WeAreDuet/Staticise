import { askClaudeJSON } from '../utils/claude.js';
import { logger } from '../utils/logger.js';

export async function runDesignSystemStep(brief, designLanguage) {
  const { concept, audience, feeling } = brief;

  logger.info('Generating design system...');

  const result = await askClaudeJSON(
    `You are a senior UI designer creating a color and typography system for a website.

Brief:
- Concept: ${concept}
- Audience: ${audience}
- Feeling: ${feeling}
- Design language: ${designLanguage.join(', ')}

Create a color hierarchy and font pairing. The colors should work together harmoniously:

- neutral: 80-90% of the screen, the canvas (background color)
- primary: headings and body text color, the ink
- secondary: subdued, keeps primary in focus (borders, muted text)
- accent: the loudest color, used least — for CTAs and highlights
- fonts: heading and body font names with reasoning

Respond in JSON:
{
  "neutral": "#hex",
  "primary": "#hex",
  "secondary": "#hex",
  "accent": "#hex",
  "fonts": {
    "heading": "Font Name",
    "headingReason": "why this font",
    "body": "Font Name",
    "bodyReason": "why this font"
  }
}`,
    { maxTokens: 1024 }
  );

  return result;
}
