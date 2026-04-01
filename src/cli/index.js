import { Command } from 'commander';
import { registerInit } from './commands/init.js';
import { registerDesign } from './commands/design.js';
import { registerRun } from './commands/run.js';
import { registerStatus } from './commands/status.js';
import { registerResearch } from './commands/research.js';
import { registerExport } from './commands/export.js';
import { registerDeploy } from './commands/deploy.js';
import { registerPreview } from './commands/preview.js';

export const program = new Command();

program
  .name('staticise')
  .description('Autoresearch-powered AI website creator — competitive agents optimize designs via Google Stitch')
  .version('1.0.0');

registerInit(program);
registerDesign(program);
registerRun(program);
registerStatus(program);
registerResearch(program);
registerExport(program);
registerDeploy(program);
registerPreview(program);
