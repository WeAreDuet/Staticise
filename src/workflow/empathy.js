import inquirer from 'inquirer';
import { askClaudeJSON } from '../utils/claude.js';
import { logger } from '../utils/logger.js';

export async function runEmpathyStep(concept = null) {
  if (concept) {
    logger.info('Generating empathy brief from concept...');

    const result = await askClaudeJSON(
      `You are helping design a website. The concept is: "${concept}"

Determine the target audience and the emotional feeling visitors should experience when they land on this site.

Respond in JSON:
{
  "concept": "${concept}",
  "audience": "description of the target audience",
  "feeling": "the emotional feeling visitors should have"
}`
    );

    return {
      concept,
      audience: result.audience,
      feeling: result.feeling,
    };
  }

  // Interactive mode
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'concept',
      message: 'What is this site for?',
      validate: (v) => v.trim().length > 0 || 'Please describe the site concept',
    },
    {
      type: 'input',
      name: 'audience',
      message: 'Who is the target audience?',
      validate: (v) => v.trim().length > 0 || 'Please describe the audience',
    },
    {
      type: 'input',
      name: 'feeling',
      message: 'How should they feel when they land on it?',
      validate: (v) => v.trim().length > 0 || 'Please describe the feeling',
    },
  ]);

  return {
    concept: answers.concept.trim(),
    audience: answers.audience.trim(),
    feeling: answers.feeling.trim(),
  };
}
