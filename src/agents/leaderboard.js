/**
 * Leaderboard — tracks per-agent statistics for the autoresearch loop.
 *
 * Serializable to/from JSON for persistence across sessions.
 */
export class Leaderboard {
  constructor() {
    /** @type {Map<string, { total: number, improvements: number, discards: number, bestScore: number, currentStreak: number }>} */
    this.entries = new Map();
  }

  /**
   * Update stats for a given agent after an experiment.
   * @param {string} agentName
   * @param {number} score - The composite score achieved
   * @param {boolean} improved - Whether the experiment was kept
   */
  update(agentName, score, improved) {
    if (!this.entries.has(agentName)) {
      this.entries.set(agentName, {
        total: 0,
        improvements: 0,
        discards: 0,
        bestScore: 0,
        currentStreak: 0,
      });
    }

    const entry = this.entries.get(agentName);
    entry.total++;

    if (improved) {
      entry.improvements++;
      entry.currentStreak = entry.currentStreak >= 0 ? entry.currentStreak + 1 : 1;
      if (score > entry.bestScore) {
        entry.bestScore = score;
      }
    } else {
      entry.discards++;
      entry.currentStreak = entry.currentStreak <= 0 ? entry.currentStreak - 1 : -1;
    }
  }

  /**
   * Return an array of leaderboard entries sorted by bestScore descending.
   * @returns {{ agent: string, total: number, improvements: number, discards: number, bestScore: number, currentStreak: number }[]}
   */
  getEntries() {
    const result = [];
    for (const [agent, stats] of this.entries) {
      result.push({ agent, ...stats });
    }
    result.sort((a, b) => b.bestScore - a.bestScore);
    return result;
  }

  /**
   * Return a formatted summary string of the leaderboard.
   * @returns {string}
   */
  getSummary() {
    const entries = this.getEntries();
    if (entries.length === 0) return 'No experiments run yet.';

    const lines = ['Agent Leaderboard:', ''];
    for (const e of entries) {
      const winRate = e.total > 0 ? ((e.improvements / e.total) * 100).toFixed(0) : 0;
      const streakStr = e.currentStreak > 0
        ? `+${e.currentStreak} streak`
        : e.currentStreak < 0
          ? `${e.currentStreak} streak`
          : 'neutral';
      lines.push(
        `  ${e.agent.padEnd(12)} best=${e.bestScore.toFixed(1)}  runs=${e.total}  wins=${e.improvements}  rate=${winRate}%  ${streakStr}`,
      );
    }
    return lines.join('\n');
  }

  /**
   * Serialize leaderboard to a plain JSON-compatible object.
   * @returns {Object}
   */
  toJSON() {
    const data = {};
    for (const [agent, stats] of this.entries) {
      data[agent] = { ...stats };
    }
    return data;
  }

  /**
   * Restore leaderboard state from a serialized object.
   * @param {Object} data
   * @returns {Leaderboard}
   */
  static fromJSON(data) {
    const lb = new Leaderboard();
    for (const [agent, stats] of Object.entries(data)) {
      lb.entries.set(agent, { ...stats });
    }
    return lb;
  }
}
