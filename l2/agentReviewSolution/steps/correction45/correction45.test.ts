/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/correction45/correction45.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { unavailableCandidateCoverage } from '/_102035_/l2/newRelease/helpers/candidateValidation.js';
import type { NewReleaseOverlayValidation } from '/_102035_/l2/newRelease/tobe.js';
import { correct45Directed } from './correction45.js';

const requestKey = 'change-1/request-3';
const base = { 'module.defs.ts': { moduleName: 'agendaClinica', title: 'Agenda', description: 'Base description' } };

function validation(path: string, code = 'TEST_INVALID'): NewReleaseOverlayValidation {
  const coverage = unavailableCandidateCoverage('Not affected.');
  coverage.module = { status: 'error', reason: 'Module has an invalid scalar.' };
  return {
    ok: false,
    oracle: null,
    coverage,
    issues: [{ artifact: 'module.defs.ts', path, severity: 'error', code, message: 'Invalid field.', source: 'gate' }],
  };
}

test('correction45 restores only the exact invalid scalar and consumes one real attempt', () => {
  const draft = { 'module.defs.ts': { moduleName: 'agendaClinica', title: '', description: 'Requested description' } };
  const result = correct45Directed(base, draft, validation('$.title'), { requestKey, correctionAttemptsUsed: 0 });
  assert.equal(result.status, 'corrected');
  assert.equal(result.attempted, true);
  assert.equal(result.state.correctionAttemptsUsed, 1);
  assert.equal((result.draft['module.defs.ts'] as { title: string }).title, 'Agenda');
  assert.equal((result.draft['module.defs.ts'] as { description: string }).description, 'Requested description');
  assert.equal((draft['module.defs.ts'] as { title: string }).title, '');
  assert.deepEqual(result.mutations, [{
    artifactPath: 'module.defs.ts', pointer: '/title', issueCode: 'TEST_INVALID', fromJson: '""', toJson: '"Agenda"',
  }]);
});

test('correction45 fails closed without spending an attempt when the error has no safe target', () => {
  const draft = { 'module.defs.ts': { moduleName: 'agendaClinica', title: '', description: 'Requested description' } };
  const identity = correct45Directed(base, draft, validation('$.moduleName'), { requestKey, correctionAttemptsUsed: 1 });
  assert.equal(identity.status, 'uncorrectable');
  assert.equal(identity.attempted, false);
  assert.equal(identity.state.correctionAttemptsUsed, 1);
  assert.deepEqual(identity.draft, draft);

  const broad = correct45Directed(base, draft, validation('$'), { requestKey, correctionAttemptsUsed: 1 });
  assert.equal(broad.attempted, false);
  assert.equal(broad.state.correctionAttemptsUsed, 1);
  assert.deepEqual(broad.draft, draft);
});

test('correction45 enforces the request limit and never resets a resumed counter', () => {
  const draft = { 'module.defs.ts': { moduleName: 'agendaClinica', title: '', description: 'Requested description' } };
  const third = correct45Directed(base, draft, validation('$.title'), { requestKey, correctionAttemptsUsed: 2 });
  assert.equal(third.attempted, true);
  assert.equal(third.state.correctionAttemptsUsed, 3);
  const stopped = correct45Directed(base, draft, validation('$.title'), { requestKey, correctionAttemptsUsed: 3 });
  assert.equal(stopped.attempted, false);
  assert.equal(stopped.state.correctionAttemptsUsed, 3);
  assert.deepEqual(stopped.draft, draft);
});
