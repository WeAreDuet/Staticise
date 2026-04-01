import { BaseAgent } from './base-agent.js';
import { askClaudeJSON } from '../utils/claude.js';

/**
 * Performance and accessibility agent — adds ARIA labels, fixes heading hierarchy,
 * optimizes meta tags, and improves Lighthouse/axe scores.
 */
export class PerfAgent extends BaseAgent {
  constructor() {
    super('perf', 'Accessibility and performance optimization');
  }

  /**
   * @param {Object} context
   * @returns {Promise<{ action: 'edit', prompt: string, rationale: string }>}
   */
  async propose(context) {
    const summary = this.buildContext(context);
    const bd = context.scoreBreakdown;

    const weakAreas = [];
    if (bd?.lighthouse?.performance != null && bd.lighthouse.performance < 80) {
      weakAreas.push(`Lighthouse performance is ${bd.lighthouse.performance} — reduce DOM complexity, inline styles, or excessive images`);
    }
    if (bd?.lighthouse?.accessibility != null && bd.lighthouse.accessibility < 80) {
      weakAreas.push(`Lighthouse accessibility is ${bd.lighthouse.accessibility} — missing alt text, lang attribute, or heading issues`);
    }
    if (bd?.lighthouse?.seo != null && bd.lighthouse.seo < 80) {
      weakAreas.push(`Lighthouse SEO is ${bd.lighthouse.seo} — missing meta description, title, or viewport meta tag`);
    }
    if (bd?.lighthouse?.bestPractices != null && bd.lighthouse.bestPractices < 80) {
      weakAreas.push(`Lighthouse best practices is ${bd.lighthouse.bestPractices} — missing doctype, charset, or has inline event handlers`);
    }
    if (bd?.axeAccessibility?.score != null && bd.axeAccessibility.score < 80) {
      weakAreas.push(`Axe accessibility score is ${bd.axeAccessibility.score} — ARIA labels, color contrast, or semantic HTML issues`);
    }

    const weaknessContext = weakAreas.length > 0
      ? `\nPerformance/accessibility weaknesses to address:\n${weakAreas.map((w) => `- ${w}`).join('\n')}`
      : '';

    const htmlSnippet = (context.bestHtml || '').slice(0, 1500);

    const proposal = await askClaudeJSON(`You are a web performance and accessibility expert. Analyze the current website and propose ONE specific edit to improve accessibility or performance scores.

${summary}
${weaknessContext}

Current HTML (first 1500 chars):
${htmlSnippet}

Respond with JSON:
{
  "prompt": "A detailed Stitch SDK edit instruction describing the accessibility or performance fix. Be specific about what HTML attributes, meta tags, or ARIA labels to add/change.",
  "rationale": "Why this change improves the score"
}

Focus on:
- Adding ARIA labels to interactive elements (buttons, links, inputs)
- Fixing heading hierarchy (ensure h1 exists, no skipped levels)
- Adding meta viewport, meta description, lang attribute, charset
- Adding alt text to images
- Removing inline event handlers
- Improving color contrast for text readability
- Adding doctype declaration
Do NOT change layout, visual design, or content text.`, {
      system: 'You are a web accessibility and performance expert. Output only valid JSON.',
      maxTokens: 1024,
    });

    return {
      action: 'edit',
      prompt: proposal.prompt,
      rationale: proposal.rationale,
    };
  }
}
