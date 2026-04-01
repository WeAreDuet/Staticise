import { BaseAgent } from './base-agent.js';
import { askClaudeJSON } from '../utils/claude.js';

/**
 * Layout agent — experiments with structural layout changes via Stitch variants.
 * Focuses on visual hierarchy and spatial organization.
 */
export class LayoutAgent extends BaseAgent {
  constructor() {
    super('layout', 'Layout experimentation via variants');
  }

  /**
   * @param {Object} context
   * @returns {Promise<{ action: string, prompt: string, rationale: string, variantOptions?: Object }>}
   */
  async propose(context) {
    const summary = this.buildContext(context);

    // Identify weaknesses
    const bd = context.scoreBreakdown;
    const weakAreas = [];
    if (bd?.llmAesthetics?.visualHierarchy != null && bd.llmAesthetics.visualHierarchy < 70) {
      weakAreas.push('visual hierarchy is weak — content sections lack clear importance ordering');
    }
    if (bd?.llmAesthetics?.whitespace != null && bd.llmAesthetics.whitespace < 70) {
      weakAreas.push('whitespace usage is poor — layout feels cramped or unbalanced');
    }
    if (bd?.designConsistency?.score != null && bd.designConsistency.score < 70) {
      weakAreas.push('design consistency is low — layout sections feel disconnected');
    }

    const weaknessContext = weakAreas.length > 0
      ? `\nKey layout weaknesses to address:\n${weakAreas.map((w) => `- ${w}`).join('\n')}`
      : '';

    const proposal = await askClaudeJSON(`You are a layout design expert. Analyze the current state of a website and propose ONE specific layout change that will improve the design score.

${summary}
${weaknessContext}

Respond with a JSON object:
{
  "prompt": "A detailed Stitch SDK prompt describing the layout change to make",
  "rationale": "A brief explanation of why this change will improve the score",
  "aspects": ["LAYOUT"]
}

Focus on: section ordering, grid systems, content grouping, visual hierarchy, hero sections, whitespace between sections, and alignment.
Do NOT suggest color, font, or content text changes.`, {
      system: 'You are a web design layout expert. Output only valid JSON.',
      maxTokens: 1024,
    });

    return {
      action: 'variant',
      prompt: proposal.prompt,
      rationale: proposal.rationale,
      variantOptions: {
        creativeRange: 'EXPLORE',
        aspects: proposal.aspects || ['LAYOUT'],
        variantCount: 3,
      },
    };
  }
}
