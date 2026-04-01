import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { startPreviewServer } from '../../preview/server.js';

export function registerPreview(program) {
  program
    .command('preview')
    .description('Start a local preview server for the current design')
    .option('--port <port>', 'port number', '3000')
    .option('--dir <dir>', 'directory to serve', 'dist')
    .option('--screenshot', 'take screenshots before serving', false)
    .action(async (options) => {
      console.log(chalk.bold('\n  Staticise Preview\n'));

      try {
        await startPreviewServer(options.dir, {
          port: parseInt(options.port, 10),
          screenshot: options.screenshot,
        });
      } catch (err) {
        logger.error(err.message);
        process.exitCode = 1;
      }
    });
}
