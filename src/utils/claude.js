import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger.js';

let client = null;

export function getClaude() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required. Set it in .env or export it.');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function askClaude(prompt, { system, maxTokens = 2048, model = 'claude-sonnet-4-20250514' } = {}) {
  const claude = getClaude();
  const messages = [{ role: 'user', content: prompt }];
  const params = { model, max_tokens: maxTokens, messages };
  if (system) params.system = system;

  logger.debug(`Claude request (${model}): ${prompt.slice(0, 100)}...`);
  const response = await claude.messages.create(params);
  const text = response.content[0]?.text ?? '';
  logger.debug(`Claude response: ${text.slice(0, 100)}...`);
  return text;
}

export async function askClaudeJSON(prompt, { system, maxTokens = 2048, model = 'claude-sonnet-4-20250514' } = {}) {
  const text = await askClaude(prompt, { system, maxTokens, model });
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error(`Failed to parse JSON from Claude response: ${text.slice(0, 200)}`);
  return JSON.parse(match[1].trim());
}

export async function askClaudeVision(imageBase64, prompt, { system, maxTokens = 2048, model = 'claude-sonnet-4-20250514' } = {}) {
  const claude = getClaude();
  const response = await claude.messages.create({
    model,
    max_tokens: maxTokens,
    system: system || undefined,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
        { type: 'text', text: prompt },
      ],
    }],
  });
  return response.content[0]?.text ?? '';
}
