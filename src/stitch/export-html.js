import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { getScreen, listScreens } from './client.js';
import { logger } from '../utils/logger.js';

export async function exportScreenHTML(projectId, screenId, outputPath) {
  logger.info(`Exporting screen ${screenId} from project ${projectId}`);

  const screen = await getScreen(projectId, screenId);
  const html = screen?.html ?? screen?.content ?? '';

  if (!html) {
    throw new Error(`No HTML content found for screen ${screenId}`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf-8');

  logger.success(`Screen exported to ${outputPath}`);
  return { htmlPath: outputPath, html };
}

export async function exportProjectHTML(projectId, outputDir) {
  logger.info(`Exporting all screens from project ${projectId}`);

  const screens = await listScreens(projectId);
  const screenList = screens?.screens ?? screens ?? [];

  if (screenList.length === 0) {
    logger.warn('No screens found in project');
    return [];
  }

  await mkdir(outputDir, { recursive: true });

  const results = [];

  for (const screen of screenList) {
    const screenId = screen.id ?? screen.name?.split('/').pop();
    const outputPath = join(outputDir, `${screenId}.html`);

    try {
      const result = await exportScreenHTML(projectId, screenId, outputPath);
      results.push(result);
    } catch (err) {
      logger.warn(`Failed to export screen ${screenId}: ${err.message}`);
    }
  }

  logger.success(`Exported ${results.length}/${screenList.length} screens to ${outputDir}`);
  return results;
}
