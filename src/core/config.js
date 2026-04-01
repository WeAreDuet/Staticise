import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../utils/logger.js';

const CONFIG_FILE = '.staticise.json';

const DEFAULT_CONFIG = {
  projectName: '',
  stitchProjectId: null,
  currentScreenId: null,
  brief: {
    concept: '',
    audience: '',
    feeling: '',
    brand: '',
  },
  designLanguage: [],
  designSystem: {
    neutral: '',
    primary: '',
    secondary: '',
    accent: '',
    fonts: { heading: '', body: '' },
  },
  scoring: {
    weights: {
      lighthousePerformance: 0.10,
      lighthouseAccessibility: 0.10,
      lighthouseSeo: 0.05,
      lighthouseBestPractices: 0.05,
      llmAesthetics: 0.30,
      axeAccessibility: 0.10,
      contentQuality: 0.15,
      designConsistency: 0.15,
    },
  },
  agents: {
    enabled: ['layout', 'style', 'content', 'perf'],
    schedulerMode: 'round-robin-with-momentum',
  },
  bestScore: 0,
  bestCommit: null,
};

export async function loadConfig(dir = process.cwd()) {
  const path = join(dir, CONFIG_FILE);
  try {
    const raw = await readFile(path, 'utf-8');
    const config = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    logger.debug(`No config found at ${path}, using defaults`);
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config, dir = process.cwd()) {
  const path = join(dir, CONFIG_FILE);
  await writeFile(path, JSON.stringify(config, null, 2) + '\n');
  logger.debug(`Config saved to ${path}`);
}

export { DEFAULT_CONFIG };
