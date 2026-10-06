/// <mls fileReference="_102035_/l2/agentReviewSolution/agentReviewSolution.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforePromptImplicit, createAgent } from './agentReviewSolution.js';

test('review agent remains private and malformed input creates no model step', async () => {
  assert.equal(createAgent().visibility, 'private');
  const previous = (globalThis as any).mls;
  (globalThis as any).mls = { actualProject: 102047 };
  try {
    const context = { message: { threadId: 'thread', orderAt: 'order', content: '@@agentReviewSolution {bad}' }, task: undefined, isTest: true } as mls.msg.ExecutionContext;
    const intents = await beforePromptImplicit(createAgent(), context, '{bad}');
    assert.equal(intents.length, 2);
    assert.equal(intents[0].type, 'add-message-ai');
    assert.equal((intents[0] as mls.msg.AgentIntentAddMessageAI).skipRootLLM, true);
    assert.equal(intents[1].type, 'add-step');
    assert.equal((intents[1] as mls.msg.AgentIntentAddStep).step.type, 'result');
  } finally {
    (globalThis as any).mls = previous;
  }
});

test('mr_16 produtores de prompt', () => {
  const root = dirname(fileURLToPath(import.meta.url));
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) files.push(full);
    }
  };
  walk(root);
  const bad: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const where = `${relative(root, file)}:${index + 1}`;
      if (/(^|[^\w.])prompt\s*,/.test(line)) bad.push(where);
      const match = line.match(/prompt\s*:\s*([^,\n]*)/);
      if (!match) return;
      const value = match[1].trim();
      const allowed = value.startsWith('serializeReviewInvocation(')
        || value === 'invocationPrompt'
        || value === "String(step.prompt || '')";
      if (!allowed) bad.push(where);
    });
  }
  assert.deepEqual(bad, []);
});
