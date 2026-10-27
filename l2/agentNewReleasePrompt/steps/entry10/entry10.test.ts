/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/entry10/entry10.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { createIndex10Step } from '/_102035_/l2/agentNewReleasePrompt/steps/entry10/entry10.js';

void test('index10 step is sequential on the client', () => {
  const step = createIndex10Step('{"moduleName":"tarefas","request":"x"}');
  assert.equal(step.planning?.planId, 'index10');
  assert.equal(step.planning?.executionHost, 'client');
});
