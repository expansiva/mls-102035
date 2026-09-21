/// <mls fileReference="_102035_/l2/agentReviewSolution/agentReviewSolution.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
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
