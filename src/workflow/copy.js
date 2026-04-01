import { askClaude } from '../utils/claude.js';
import { logger } from '../utils/logger.js';

export async function runCopyStep(brief, designLanguage, designSystem) {
  const { concept, audience, feeling } = brief;

  logger.info('Generating website copy...');

  const systemPrompt = `You are a senior web copywriter. You write copy that is clear, compelling, and conversion-oriented. You match tone to the brand and audience. You never use filler words or generic phrases. Every word earns its place.`;

  const text = await askClaude(
    `Write the copy for a website landing page.

Brief:
- Concept: ${concept}
- Audience: ${audience}
- Feeling: ${feeling}
- Design language: ${designLanguage.join(', ')}
- Color system: neutral ${designSystem.neutral}, primary ${designSystem.primary}, accent ${designSystem.accent}
- Fonts: ${designSystem.fonts.heading} (headings), ${designSystem.fonts.body} (body)

Generate the following copy elements. Be specific to this brand — no generic placeholder text.

Respond ONLY in this exact JSON format:
{
  "hero": {
    "headline": "the main hero headline",
    "subheadline": "supporting subheadline",
    "cta": "call to action button text"
  },
  "sections": [
    {
      "heading": "section heading",
      "body": "section body copy (2-3 sentences)"
    }
  ]
}

Include 3-5 sections covering features/benefits, social proof, and a final CTA.`,
    { system: systemPrompt, maxTokens: 2048 }
  );

  // Parse the JSON from the response
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!match) {
    throw new Error(`Failed to parse copy JSON from Claude response: ${text.slice(0, 200)}`);
  }

  const copy = JSON.parse(match[1].trim());
  return copy;
}
