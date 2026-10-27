/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/systemPrompts.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { NRP_REPAIR_SYSTEM_PROMPT } from '/_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.js';
import { NRP_EDIT_SYSTEM_PROMPT } from '/_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.js';
import { NRP_TRIAGE_SYSTEM_PROMPT } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

const ACCEPTED = new Set(['reasoning', 'general', 'classifier', 'code', 'design', 'translate']);

void test('system prompts declare an accepted modelType on the first line', () => {
  for (const prompt of [NRP_TRIAGE_SYSTEM_PROMPT, NRP_EDIT_SYSTEM_PROMPT, NRP_REPAIR_SYSTEM_PROMPT]) {
    const match = /^<!-- modelType: (\w+) -->$/.exec(prompt.split('\n')[0] ?? '');
    assert.ok(match, prompt.slice(0, 40));
    assert.equal(ACCEPTED.has(match[1]), true);
  }
});
