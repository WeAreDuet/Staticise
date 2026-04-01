import { BaseAgent } from './base-agent.js';
import { askClaudeJSON } from '../utils/claude.js';

/**
 * Style agent — refines color palette, typography, and whitespace.
 * Targets designConsistency and llmAesthetics.whitespace scores.
 */
export class StyleAgent extends BaseAgent {
  constructor() {
    super('style', 'Color and typography refinement');
  }

  /**
   * @param {Object} context
   * @returns {Promise<{ action: string, prompt: string, rationale: string, variantOptions?: Object }>}
   */
  async propose(context) {
    const summary = this.buildContext(context);
    const bd = context.scoreBreakdown;

    const weakAreas = [];
    if (bd?.designConsistency?.score != null && bd.designConsistency.score < 75) {
      weakAreas.push(`design consistency score is ${bd.designConsistency.score} — colors or fonts may not match the design system`);
    }
    if (bd?.llmAesthetics?.whitespace != null && bd.llmAesthetics.whitespace < 70) {
      weakAreas.push(`whitespace score is ${bd.llmAesthetics.whitespace} — spacing needs improvement`);
    }
    if (bd?.llmAesthetics?.typography != null && bd.llmAesthetics.typography < 70) {
      weakAreas.push(`typography score is ${bd.llmAesthetics.typography} — font sizing or line height needs work`);
    }
    if (bd?.llmAesthetics?.colorHarmony != null && bd.llmAesthetics.colorHarmony < 70) {
      weakAreas.push(`color harmony score is ${bd.llmAesthetics.colorHarmony} — palette needs refinement`);
    }

    const designSystem = context.config?.designSystem;
    const dsContext = designSystem
      ? `\nDesign system: primary=${designSystem.primary}, secondary=${designSystem.secondary}, accent=${designSystem.accent}, heading font="${designSystem.fonts?.heading}", body font="${designSystem.fonts?.body}"`
      : '';

    const weaknessContext = weakAreas.length > 0
      ? `\nStyle weaknesses to address:\n${weakAreas.map((w) => `- ${w}`).join('\n')}`
      : '';

    const proposal = await askClaudeJSON(`You are a visual design expert specializing in color and typography. Analyze the current state and propose ONE specific style refinement.

${summary}
${dsContext}
${weaknessContext}

Respond with JSON:
{
  "action": "edit" or "variant",
  "prompt": "Detailed instruction for the style change",
  "rationale": "Why this will improve the design score"
}

Focus on: color contrast, font sizes, line heights, letter spacing, padding, margins, whitespace rhythm.
Ensure changes align with the design system colors and fonts.
Do NOT change content text or layout structure.`, {
      system: 'You are a visual design expert. Output only valid JSON.',
      maxTokens: 1024,
    });

    const action = proposal.action === 'variant' ? 'variant' : 'edit';

    const result = {
      action,
      prompt: proposal.prompt,
      rationale: proposal.rationale,
    };

    if (action === 'variant') {
      result.variantOptions = {
        creativeRange: 'REFINE',
        aspects: ['STYLE'],
        variantCount: 3,
      };
    }

    return result;
  }
}
