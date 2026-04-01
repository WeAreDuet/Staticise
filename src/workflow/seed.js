import ora from 'ora';
import chalk from 'chalk';
import { createProject, generateScreen } from '../stitch/client.js';
import { saveConfig, loadConfig } from '../core/config.js';
import { runEmpathyStep } from './empathy.js';
import { runDesignLanguageStep } from './design-language.js';
import { runDesignSystemStep } from './design-system.js';
import { runLayoutStep } from './layout.js';
import { runCopyStep } from './copy.js';

export async function runSeedWorkflow(concept = null) {
  console.log(chalk.bold.cyan('\n  Staticise Seed Workflow\n'));

  // Step 1: Empathy
  console.log(chalk.bold.white('  Step 1/5 ') + chalk.dim('Empathy'));
  let spinner = ora('Understanding your audience...').start();
  const brief = await runEmpathyStep(concept);
  spinner.succeed(`Brief: "${brief.concept}" for ${brief.audience}`);

  // Step 2: Design Language
  console.log(chalk.bold.white('\n  Step 2/5 ') + chalk.dim('Design Language'));
  spinner = ora('Translating feeling into design words...').start();
  const { designLanguage, stitchPrompt } = await runDesignLanguageStep(brief);
  spinner.succeed(`Design language: ${designLanguage.slice(0, 3).join(', ')}...`);

  // Step 3: Design System
  console.log(chalk.bold.white('\n  Step 3/5 ') + chalk.dim('Design System'));
  spinner = ora('Building color and type system...').start();
  const designSystem = await runDesignSystemStep(brief, designLanguage);
  spinner.succeed(`Colors: ${designSystem.neutral} / ${designSystem.primary} / ${designSystem.accent} | Fonts: ${designSystem.fonts.heading}, ${designSystem.fonts.body}`);

  // Step 4: Layout
  console.log(chalk.bold.white('\n  Step 4/5 ') + chalk.dim('Layout'));
  spinner = ora('Choosing layout metaphor...').start();
  const { metaphor, layoutPrompt } = await runLayoutStep(brief, designLanguage);
  spinner.succeed(`Metaphor: ${metaphor}`);

  // Step 5: Copy
  console.log(chalk.bold.white('\n  Step 5/5 ') + chalk.dim('Copywriting'));
  spinner = ora('Writing website copy...').start();
  const copy = await runCopyStep(brief, designLanguage, designSystem);
  spinner.succeed(`Copy: "${copy.hero.headline}" + ${copy.sections.length} sections`);

  // Generate with Stitch
  console.log(chalk.bold.magenta('\n  Generating initial screen with Stitch...\n'));
  spinner = ora('Creating Stitch project...').start();

  const project = await createProject(brief.concept);
  const projectId = project.name?.split('/').pop() ?? project.id;
  spinner.succeed(`Project: ${projectId}`);

  // Build combined prompt
  const combinedPrompt = [
    stitchPrompt,
    layoutPrompt,
    `Color palette: neutral ${designSystem.neutral}, primary ${designSystem.primary}, secondary ${designSystem.secondary}, accent ${designSystem.accent}.`,
    `Typography: ${designSystem.fonts.heading} for headings, ${designSystem.fonts.body} for body.`,
    `Hero headline: "${copy.hero.headline}"`,
    `Hero subheadline: "${copy.hero.subheadline}"`,
    `CTA: "${copy.hero.cta}"`,
    ...copy.sections.map((s) => `Section "${s.heading}": ${s.body}`),
  ].join('\n\n');

  spinner = ora('Generating initial screen...').start();
  const screen = await generateScreen(projectId, combinedPrompt);
  const screenId = screen.name?.split('/').pop() ?? screen.id;
  spinner.succeed(`Screen generated: ${screenId}`);

  // Save config
  const config = await loadConfig();
  Object.assign(config, {
    projectName: brief.concept,
    stitchProjectId: projectId,
    currentScreenId: screenId,
    brief: {
      concept: brief.concept,
      audience: brief.audience,
      feeling: brief.feeling,
      brand: '',
    },
    designLanguage,
    designSystem: {
      neutral: designSystem.neutral,
      primary: designSystem.primary,
      secondary: designSystem.secondary,
      accent: designSystem.accent,
      fonts: {
        heading: designSystem.fonts.heading,
        body: designSystem.fonts.body,
      },
    },
    copy,
    metaphor,
    stitchPrompt: combinedPrompt,
  });

  await saveConfig(config);

  console.log(chalk.bold.green('\n  Seed workflow complete!\n'));

  return { config, projectId, screenId };
}
