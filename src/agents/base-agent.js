/**
 * Abstract base class for all autoresearch agents.
 *
 * Each agent proposes a single design change per experiment round.
 * Subclasses must implement the `propose(context)` method.
 */
export class BaseAgent {
  /**
   * @param {string} name - Short identifier for the agent (e.g. 'layout', 'style')
   * @param {string} strategy - Human-readable description of the agent's strategy
   */
  constructor(name, strategy) {
    if (new.target === BaseAgent) {
      throw new Error('BaseAgent is abstract and cannot be instantiated directly');
    }
    this.name = name;
    this.strategy = strategy;
  }

  /**
   * Propose a design change based on the current context.
   *
   * @param {Object} context
   * @param {string} context.bestHtml - Current best HTML source
   * @param {number} context.bestScore - Current best composite score
   * @param {Object} context.scoreBreakdown - Most recent scoring breakdown
   * @param {Object[]} context.history - Recent ledger entries
   * @param {Object} context.config - Staticise config
   * @returns {Promise<{ action: 'edit'|'variant'|'generate', prompt: string, rationale: string, variantOptions?: Object }>}
   */
  async propose(context) {
    throw new Error(`Agent "${this.name}" must implement propose()`);
  }

  /**
   * Build a summary string from the context for use in LLM prompts.
   *
   * @param {Object} context
   * @returns {string}
   */
  buildContext(context) {
    const { bestScore, scoreBreakdown, history, config } = context;
    const lines = [];

    lines.push(`Current best score: ${bestScore?.toFixed(1) ?? 'N/A'}/100`);

    if (config?.brief) {
      const b = config.brief;
      lines.push(`Brief: concept="${b.concept}", audience="${b.audience}", feeling="${b.feeling}", brand="${b.brand}"`);
    }

    if (scoreBreakdown) {
      lines.push('Score breakdown:');
      const bd = scoreBreakdown;
      if (bd.lighthouse) {
        lines.push(`  Lighthouse: perf=${bd.lighthouse.performance}, a11y=${bd.lighthouse.accessibility}, seo=${bd.lighthouse.seo}, bp=${bd.lighthouse.bestPractices}`);
      }
      if (bd.llmAesthetics) {
        const a = bd.llmAesthetics;
        lines.push(`  LLM Aesthetics: total=${a.total}, visualHierarchy=${a.visualHierarchy ?? 'N/A'}, whitespace=${a.whitespace ?? 'N/A'}, typography=${a.typography ?? 'N/A'}, colorHarmony=${a.colorHarmony ?? 'N/A'}`);
      }
      if (bd.axeAccessibility) {
        lines.push(`  Axe Accessibility: score=${bd.axeAccessibility.score}`);
      }
      if (bd.contentQuality) {
        lines.push(`  Content Quality: score=${bd.contentQuality.score}`);
      }
      if (bd.designConsistency) {
        lines.push(`  Design Consistency: score=${bd.designConsistency.score}`);
      }
    }

    if (history && history.length > 0) {
      const recent = history.slice(-5);
      lines.push(`Recent experiments (last ${recent.length}):`);
      for (const h of recent) {
        lines.push(`  [${h.agent ?? h.experiment_id}] score=${h.composite_score ?? h.compositeScore} status=${h.status} — ${h.description ?? ''}`);
      }
    }

    return lines.join('\n');
  }
}
