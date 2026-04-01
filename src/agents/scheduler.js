/**
 * Scheduler — decides which agent runs next using a round-robin-with-momentum algorithm.
 *
 * Base: round-robin order through the agent list.
 * Momentum: agents that improved in their last round get +1 priority.
 * Backoff: agents with 3+ consecutive failures get deprioritized.
 * Every 10 rounds: reset to pure round-robin to avoid starvation.
 */
export class Scheduler {
  /**
   * @param {import('./base-agent.js').BaseAgent[]} agents
   * @param {string} mode - Scheduling mode (currently only 'round-robin-with-momentum')
   */
  constructor(agents, mode = 'round-robin-with-momentum') {
    this.agents = agents;
    this.mode = mode;
    this.roundIndex = 0;
    this.totalRounds = 0;

    /** @type {Map<string, { lastImproved: boolean, consecutiveFailures: number, momentum: number }>} */
    this.stats = new Map();
    for (const agent of agents) {
      this.stats.set(agent.name, {
        lastImproved: false,
        consecutiveFailures: 0,
        momentum: 0,
      });
    }
  }

  /**
   * Select the next agent to run based on the scheduling algorithm.
   * @returns {import('./base-agent.js').BaseAgent}
   */
  nextAgent() {
    this.totalRounds++;

    // Every 10 rounds, reset to pure round-robin
    if (this.totalRounds % 10 === 1) {
      this.roundIndex = (this.totalRounds - 1) % this.agents.length;
      const agent = this.agents[this.roundIndex];
      return agent;
    }

    // Build priority scores for each agent
    const priorities = this.agents.map((agent, index) => {
      const stat = this.stats.get(agent.name);
      let priority = 0;

      // Base round-robin: prefer the next agent in sequence
      const distanceFromNext = (index - this.roundIndex + this.agents.length) % this.agents.length;
      priority -= distanceFromNext;

      // Momentum: agents that improved last round get a boost
      if (stat.momentum > 0) {
        priority += stat.momentum;
      }

      // Backoff: agents with 3+ consecutive failures get deprioritized
      if (stat.consecutiveFailures >= 3) {
        priority -= stat.consecutiveFailures;
      }

      return { agent, index, priority };
    });

    // Sort by priority (highest first), break ties by round-robin order
    priorities.sort((a, b) => b.priority - a.priority);

    const chosen = priorities[0];
    this.roundIndex = (chosen.index + 1) % this.agents.length;
    return chosen.agent;
  }

  /**
   * Record the result of an experiment for a given agent.
   * @param {string} agentName
   * @param {boolean} improved - Whether the experiment improved the score
   */
  recordResult(agentName, improved) {
    const stat = this.stats.get(agentName);
    if (!stat) return;

    stat.lastImproved = improved;

    if (improved) {
      stat.consecutiveFailures = 0;
      stat.momentum = Math.min(stat.momentum + 1, 3);
    } else {
      stat.consecutiveFailures++;
      stat.momentum = Math.max(stat.momentum - 1, 0);
    }
  }
}
