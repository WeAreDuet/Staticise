import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';

/**
 * Get the short SHA of the current HEAD commit.
 * @returns {string}
 */
export function getCurrentCommit() {
  const sha = execSync('git rev-parse --short HEAD', { cwd: process.cwd() })
    .toString()
    .trim();
  logger.debug(`Current commit: ${sha}`);
  return sha;
}

/**
 * Stage dist/ and experiments/ directories and commit with the given message.
 * @param {string} message
 * @returns {string} the new commit SHA (short)
 */
export function commitExperiment(message) {
  const opts = { cwd: process.cwd(), stdio: 'pipe' };
  execSync('git add dist/ experiments/', opts);
  execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, opts);
  const sha = getCurrentCommit();
  logger.success(`Committed: ${sha} — ${message}`);
  return sha;
}

/**
 * Discard working-tree changes in dist/ by checking out the last committed version.
 */
export function discardChanges() {
  logger.info('Discarding changes in dist/');
  execSync('git checkout -- dist/', { cwd: process.cwd(), stdio: 'pipe' });
}

/**
 * Create a git tag marking the best score achieved so far.
 * @param {number} score
 */
export function tagBest(score) {
  const tagName = `best-score-${score.toFixed(1)}`;
  logger.info(`Tagging: ${tagName}`);
  try {
    execSync(`git tag -f "${tagName}"`, { cwd: process.cwd(), stdio: 'pipe' });
  } catch (err) {
    logger.warn(`Failed to create tag ${tagName}: ${err.message}`);
  }
}

/**
 * Get the current branch name.
 * @returns {string}
 */
export function getExperimentBranch() {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: process.cwd() })
    .toString()
    .trim();
  logger.debug(`Current branch: ${branch}`);
  return branch;
}
