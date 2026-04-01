import { askClaudeVision } from '../utils/claude.js';
import { logger } from '../utils/logger.js';

const RUBRIC_PROMPT = `You are a senior UI/UX design critic. Score the following webpage screenshot against the creative brief provided.

**Creative Brief:**
- Concept: {concept}
- Target Audience: {audience}
- Intended Feeling: {feeling}
- Brand: {brand}

Score each dimension from 0-25:

1. **visualHierarchy** (0-25): Is there a clear focal point? Do headings, subheadings, and body text establish proper hierarchy? Is the eye guided through the content logically?
2. **whitespace** (0-25): Is negative space used effectively? Does the layout breathe, or is it cramped? Are margins and padding consistent?
3. **brandAlignment** (0-25): Does the design reflect the brand identity described in the brief? Are colors, typography, and imagery consistent with the brand?
4. **emotionalResonance** (0-25): Does the page evoke the intended feeling? Would the target audience connect with this design?

Respond with ONLY a JSON object in this exact format (no markdown fences):
{
  "visualHierarchy": <number>,
  "whitespace": <number>,
  "brandAlignment": <number>,
  "emotionalResonance": <number>,
  "reasoning": "<brief explanation of scores>"
}`;

/**
 * Sends a screenshot + brief to Claude vision for aesthetic scoring.
 * @param {string} screenshotBase64 - Base64-encoded PNG screenshot
 * @param {Object} brief - { concept, audience, feeling, brand }
 * @returns {Promise<{ total: number, breakdown: { visualHierarchy: number, whitespace: number, brandAlignment: number, emotionalResonance: number }, reasoning: string }>}
 */
export async function scoreLLMAesthetics(screenshotBase64, brief) {
  logger.debug('Scoring LLM aesthetics via Claude vision...');

  const prompt = RUBRIC_PROMPT
    .replace('{concept}', brief.concept || 'N/A')
    .replace('{audience}', brief.audience || 'N/A')
    .replace('{feeling}', brief.feeling || 'N/A')
    .replace('{brand}', brief.brand || 'N/A');

  const response = await askClaudeVision(screenshotBase64, prompt, {
    system: 'You are a design quality evaluator. Always respond with valid JSON only.',
    maxTokens: 1024,
  });

  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || response.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error(`Failed to parse LLM aesthetics JSON: ${response.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[1].trim());

  const breakdown = {
    visualHierarchy: clamp(parsed.visualHierarchy, 0, 25),
    whitespace: clamp(parsed.whitespace, 0, 25),
    brandAlignment: clamp(parsed.brandAlignment, 0, 25),
    emotionalResonance: clamp(parsed.emotionalResonance, 0, 25),
  };

  const total = breakdown.visualHierarchy + breakdown.whitespace + breakdown.brandAlignment + breakdown.emotionalResonance;
  const reasoning = parsed.reasoning || '';

  logger.debug(`LLM aesthetics total=${total} breakdown=${JSON.stringify(breakdown)}`);

  return { total, breakdown, reasoning };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
