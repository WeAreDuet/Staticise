import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

const LEDGER_PATH = join(process.cwd(), 'experiments', 'ledger.tsv');

const HEADER = [
  'timestamp',
  'experiment_id',
  'agent',
  'commit_hash',
  'composite_score',
  'lighthouse_perf',
  'lighthouse_a11y',
  'llm_aesthetics',
  'axe_score',
  'content_quality',
  'design_consistency',
  'status',
  'description',
].join('\t');

/**
 * Create the ledger file with a TSV header if it does not already exist.
 */
export async function initLedger() {
  if (!existsSync(LEDGER_PATH)) {
    await mkdir(dirname(LEDGER_PATH), { recursive: true });
    await writeFile(LEDGER_PATH, HEADER + '\n', 'utf-8');
  }
}

/**
 * Append a single entry row to the ledger.
 * @param {Object} entry
 */
export async function appendEntry(entry) {
  const row = [
    entry.timestamp ?? new Date().toISOString(),
    entry.experimentId ?? '',
    entry.agent ?? '',
    entry.commitHash ?? '',
    entry.compositeScore ?? 0,
    entry.lighthousePerf ?? 0,
    entry.lighthouseA11y ?? 0,
    entry.llmAesthetics ?? 0,
    entry.axeScore ?? 0,
    entry.contentQuality ?? 0,
    entry.designConsistency ?? 0,
    entry.status ?? '',
    entry.description ?? '',
  ].join('\t');

  await writeFile(LEDGER_PATH, row + '\n', { flag: 'a', encoding: 'utf-8' });
}

/**
 * Parse a single TSV line into an object using the header column names.
 */
function parseLine(line, headers) {
  const values = line.split('\t');
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = values[i] ?? '';
  }
  // Cast numeric fields
  for (const key of ['composite_score', 'lighthouse_perf', 'lighthouse_a11y', 'llm_aesthetics', 'axe_score', 'content_quality', 'design_consistency']) {
    if (obj[key] !== undefined) {
      obj[key] = parseFloat(obj[key]) || 0;
    }
  }
  return obj;
}

/**
 * Read and parse all entries from the ledger.
 * @returns {Promise<Object[]>}
 */
export async function readLedger() {
  if (!existsSync(LEDGER_PATH)) return [];
  const raw = await readFile(LEDGER_PATH, 'utf-8');
  const lines = raw.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).filter(Boolean).map((line) => parseLine(line, headers));
}

/**
 * Return the last N entries from the ledger.
 * @param {number} n
 * @returns {Promise<Object[]>}
 */
export async function getLastN(n) {
  const entries = await readLedger();
  return entries.slice(-n);
}

/**
 * Return the entry with the highest composite_score where status is IMPROVED.
 * @returns {Promise<Object|null>}
 */
export async function getBestEntry() {
  const entries = await readLedger();
  const improved = entries.filter((e) => e.status === 'IMPROVED');
  if (improved.length === 0) return null;
  return improved.reduce((best, e) => (e.composite_score > best.composite_score ? e : best));
}
