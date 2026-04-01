import { askClaudeJSON } from '../utils/claude.js';
import { logger } from '../utils/logger.js';

export async function runDesignLanguageStep(brief) {
  const { concept, audience, feeling } = brief;

  logger.info('Translating feeling into design language...');

  const result = await askClaudeJSON(
    `You are a senior visual designer translating an emotional brief into concrete design language for a UI design tool.

Brief:
- Concept: ${concept}
- Audience: ${audience}
- Feeling: ${feeling}

Translate this feeling into concrete design language that a UI design tool can use. Not vague words like "sporty" — specific sensory/material words like "architectural limestone", "ink on paper", "clay on an old track".

Also write a single Stitch prompt paragraph that could be used to generate a screen matching this design language.

Respond in JSON:
{
  "designLanguage": ["word1", "word2", "word3", "word4", "word5"],
  "stitchPrompt": "A detailed prompt paragraph for generating the UI..."
}`
  );

  return {
    designLanguage: result.designLanguage,
    stitchPrompt: result.stitchPrompt,
  };
}
