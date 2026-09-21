/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/invocation.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { parseReviewInvocation } from './invocation.js';

const valid = {
  moduleName: 'agendaClinica',
  originalL4Path: 'l4/agendaClinica/pipeline/releases/base-abc123/l4',
  temporaryL4Path: 'l4/agendaClinica/tobe/plan',
  request: 'Adjust the appointment greeting.',
};

test('structured UI and @@ CLI invocations resolve the same explicit project and folders', () => {
  const ui = parseReviewInvocation({ ...valid, expectedRevisionId: 'rev-7' }, 102047);
  const cli = parseReviewInvocation(`@@agentReviewSolution ${JSON.stringify(valid)}`, 102047);
  assert.equal(ui.project, 102047);
  assert.equal(ui.baseId, 'base-abc123');
  assert.equal(ui.expectedRevisionId, 'rev-7');
  assert.equal(cli.expectedRevisionId, undefined);
  assert.equal(cli.temporaryL4Path, ui.temporaryL4Path);
});

test('parser rejects invalid JSON, wrong module, equal/escaped paths and unknown fields before work', () => {
  assert.throws(() => parseReviewInvocation('@@agentReviewSolution {bad}', 102047), /valid JSON/);
  assert.throws(() => parseReviewInvocation(valid, 0), /valid project/);
  assert.throws(() => parseReviewInvocation({ ...valid, moduleName: 'otherModule' }, 102047), /does not belong/);
  assert.throws(() => parseReviewInvocation({ ...valid, originalL4Path: valid.temporaryL4Path }, 102047), /does not belong/);
  assert.throws(() => parseReviewInvocation({ ...valid, originalL4Path: 'l4/agendaClinica/pipeline/releases/../l4' }, 102047), /Invalid base/);
  assert.throws(() => parseReviewInvocation({ ...valid, temporaryL4Path: 'l4/agendaClinica/tobe/plan/../other' }, 102047), /must match/);
  assert.throws(() => parseReviewInvocation({ ...valid, temporaryL4Path: '/tmp/plan' }, 102047), /must match/);
  assert.throws(() => parseReviewInvocation({ ...valid, command: 'echo hi' }, 102047), /Unexpected review field/);
  assert.throws(() => parseReviewInvocation({ ...valid, expectedRevisionId: 'rev/other' }, 102047), /Invalid expectedRevisionId/);
});
