/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/index10/index10.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { beforeNrpIndexStep } from '/_102035_/l2/agentNewReleasePrompt/steps/index10/index10.js';

void test('index10 hook is exported', () => {
  assert.equal(typeof beforeNrpIndexStep, 'function');
});
