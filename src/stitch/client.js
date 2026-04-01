import { logger } from '../utils/logger.js';

let stitchModule = null;

async function getStitchSDK() {
  if (!stitchModule) {
    try {
      stitchModule = await import('@google/stitch-sdk');
    } catch {
      logger.warn('Stitch SDK not installed. Install with: npm install @google/stitch-sdk');
      stitchModule = null;
    }
  }
  return stitchModule;
}

export async function getStitchClient() {
  if (!process.env.STITCH_API_KEY) {
    throw new Error('STITCH_API_KEY environment variable is required. Get one from stitch.withgoogle.com');
  }
  const sdk = await getStitchSDK();
  if (!sdk) throw new Error('Stitch SDK not available');
  return sdk.stitch;
}

export async function createProject(title) {
  const stitch = await getStitchClient();
  logger.info(`Creating Stitch project: "${title}"`);
  const result = await stitch.callTool('create_project', { title });
  logger.success(`Project created: ${result?.name || 'unknown'}`);
  return result;
}

export async function generateScreen(projectId, prompt, deviceType = 'DESKTOP') {
  const stitch = await getStitchClient();
  logger.info(`Generating screen: "${prompt.slice(0, 80)}..."`);
  const result = await stitch.callTool('generate_screen_from_text', {
    projectId,
    prompt,
    deviceType,
  });
  logger.success('Screen generated');
  return result;
}

export async function editScreen(projectId, screenIds, prompt) {
  const stitch = await getStitchClient();
  logger.info(`Editing screens: "${prompt.slice(0, 80)}..."`);
  const result = await stitch.callTool('edit_screens', {
    projectId,
    selectedScreenIds: Array.isArray(screenIds) ? screenIds : [screenIds],
    prompt,
  });
  return result;
}

export async function generateVariants(projectId, screenIds, prompt, options = {}) {
  const stitch = await getStitchClient();
  const {
    creativeRange = 'EXPLORE',
    aspects = [],
    variantCount = 3,
  } = options;

  logger.info(`Generating ${variantCount} variants (${creativeRange}): "${prompt.slice(0, 60)}..."`);
  const result = await stitch.callTool('generate_variants', {
    projectId,
    selectedScreenIds: Array.isArray(screenIds) ? screenIds : [screenIds],
    prompt,
    variantOptions: { creativeRange, aspects, variantCount },
  });
  return result;
}

export async function getScreen(projectId, screenId) {
  const stitch = await getStitchClient();
  return stitch.callTool('get_screen', {
    name: `projects/${projectId}/screens/${screenId}`,
  });
}

export async function listScreens(projectId) {
  const stitch = await getStitchClient();
  return stitch.callTool('list_screens', { projectId });
}

export async function listProjects() {
  const stitch = await getStitchClient();
  return stitch.callTool('list_projects', {});
}
