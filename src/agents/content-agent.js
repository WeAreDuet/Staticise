import { BaseAgent } from './base-agent.js';
import { askClaudeJSON } from '../utils/claude.js';

/**
 * Content agent — replaces placeholder or generic text with specific, branded copy.
 * Always uses action='edit'. Targets contentQuality score.
 */
export class ContentAgent extends BaseAgent {
  constructor() {
    super('content', 'Content quality improvement');
  }

  /**
   * @param {Object} context
   * @returns {Promise<{ action: 'edit', prompt: string, rationale: string }>}
   */
  async propose(context) {
    const summary = this.buildContext(context);
    const brief = context.config?.brief;

    const briefContext = brief
      ? `\nBrand brief: concept="${brief.concept}", audience="${brief.audience}", feeling="${brief.feeling}", brand="${brief.brand}"`
      : '';

    const bd = context.scoreBreakdown;
    const contentScore = bd?.contentQuality?.score;
    const scoreContext = contentScore != null
      ? `\nCurrent content quality score: ${contentScore}/100`
      : '';

    const proposal = await askClaudeJSON(`You are a professional copywriter and UX writer. Analyze the current website content and propose ONE specific content edit to improve quality.

${summary}
${briefContext}
${scoreContext}

Here is a snippet of the current HTML (first 2000 chars):
${(context.bestHtml || '').slice(0, 2000)}

Respond with JSON:
{
  "prompt": "A detailed Stitch SDK edit instruction that specifies exactly what text to change and what to replace it with. Be specific about locations (e.g., hero heading, CTA button, about section paragraph).",
  "rationale": "Why this content change improves quality"
}

Focus on:
- Replace "Lorem ipsum" or placeholder text with real, branded copy
- Improve vague headings to be specific and compelling
- Make CTAs action-oriented and audience-appropriate
- Ensure copy matches the brand voice and target audience
Do NOT suggest layout, color, or structural changes.`, {
      system: 'You are a UX copywriter. Output only valid JSON.',
      maxTokens: 1024,
    });

    return {
      action: 'edit',
      prompt: proposal.prompt,
      rationale: proposal.rationale,
    };
  }
}
