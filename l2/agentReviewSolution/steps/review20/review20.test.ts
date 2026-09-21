/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/review20/review20.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { REVIEW20_SCHEMA_VERSION, stageReview20 } from './review20.js';

const snapshot = { moduleName: 'agendaClinica', request: 'Use a clearer appointment label.', requestRevision: 2 };
const persisted = { revision: 2, request: snapshot.request };
const base = {
  'module.defs.ts': { moduleName: 'agendaClinica', schemaVersion: 'v1', title: 'Agenda', moduleId: 'mod-1', untouched: 'keep' },
  'journeys/index.defs.ts': { moduleName: 'agendaClinica', journeys: [{ journeyId: 'j-1', title: 'Mark visit' }] },
};
const candidate = {
  'module.defs.ts': { ...base['module.defs.ts'], title: 'Visit calendar' },
  'journeys/index.defs.ts': base['journeys/index.defs.ts'],
};

function applyResponse(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: REVIEW20_SCHEMA_VERSION, decision: 'apply', clarification: '',
    operations: [{ artifactPath: 'module.defs.ts', op: 'replace', pointer: '/title',
      basis: 'refine-candidate-edit',
      expectedJson: '"Visit calendar"', valueJson: '"Appointments"', reason: 'Match the requested terminology.' }],
    ...overrides,
  };
}

test('review20 stages a bounded scalar correction and keeps input, IDs and unrelated artifacts intact', () => {
  const before = JSON.stringify(candidate);
  const result = stageReview20(snapshot, persisted, base, candidate, applyResponse());
  assert.equal(result.status, 'staged');
  assert.equal((result.proposal['module.defs.ts'] as { title: string }).title, 'Appointments');
  assert.equal(JSON.stringify(candidate), before);
  assert.deepEqual(result.proposal['journeys/index.defs.ts'], candidate['journeys/index.defs.ts']);
  assert.equal((result.proposal['module.defs.ts'] as { moduleId: string }).moduleId, 'mod-1');
  assert.deepEqual(Object.keys(result.explicitDiff), ['module.defs.ts']);
  assert.deepEqual(Object.keys(result.operationDiff), ['module.defs.ts']);
  assert.deepEqual(Object.keys(result.proposedDiff), ['module.defs.ts']);
});

test('review20 can stage the first scalar change when the candidate still equals the base', () => {
  const unchangedCandidate = JSON.parse(JSON.stringify(base)) as typeof base;
  const response = applyResponse({ operations: [{
    artifactPath: 'module.defs.ts', op: 'replace', pointer: '/title', basis: 'base-unchanged',
    expectedJson: '"Agenda"', valueJson: '"Appointments"', reason: 'Apply the persisted simple request.',
  }] });
  const result = stageReview20(snapshot, persisted, base, unchangedCandidate, response);
  assert.equal(result.status, 'staged');
  assert.equal((result.proposal['module.defs.ts'] as { title: string }).title, 'Appointments');
  assert.deepEqual(result.explicitDiff, {});
  assert.deepEqual(Object.keys(result.operationDiff), ['module.defs.ts']);
});

test('review20 protects a divergent manual field from a base-unchanged operation', () => {
  const response = applyResponse({ operations: [{
    artifactPath: 'module.defs.ts', op: 'replace', pointer: '/title', basis: 'base-unchanged',
    expectedJson: '"Visit calendar"', valueJson: '"Appointments"', reason: 'Apply initial wording.',
  }] });
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, response), /manual candidate edit conflict/);
});

test('review20 preserves an existing manual edit while changing another base-equal field', () => {
  const response = applyResponse({ operations: [{
    artifactPath: 'module.defs.ts', op: 'replace', pointer: '/untouched', basis: 'base-unchanged',
    expectedJson: '"keep"', valueJson: '"requested value"', reason: 'Apply the separate requested wording.',
  }] });
  const result = stageReview20(snapshot, persisted, base, candidate, response);
  assert.equal((result.proposal['module.defs.ts'] as { title: string }).title, 'Visit calendar');
  assert.equal((result.proposal['module.defs.ts'] as { untouched: string }).untouched, 'requested value');
});

test('review20 accepts a real PascalCase ontology entity path', () => {
  const entityBase = { ...base, 'ontology/Consulta.defs.ts': { entityId: 'Consulta', title: 'Consulta' } };
  const entityCandidate = JSON.parse(JSON.stringify(entityBase)) as typeof entityBase;
  const response = applyResponse({ operations: [{
    artifactPath: 'ontology/Consulta.defs.ts', op: 'replace', pointer: '/title', basis: 'base-unchanged',
    expectedJson: '"Consulta"', valueJson: '"Appointment"', reason: 'Apply the persisted terminology request.',
  }] });
  const result = stageReview20(snapshot, persisted, entityBase, entityCandidate, response);
  assert.equal((result.proposal['ontology/Consulta.defs.ts'] as { title: string }).title, 'Appointment');
});

test('review20 rejects an unsafe artifact path', () => {
  const unsafeBase = { ...base, 'ontology/../Consulta.defs.ts': { entityId: 'Consulta', title: 'Consulta' } };
  const unsafeCandidate = JSON.parse(JSON.stringify(unsafeBase)) as typeof unsafeBase;
  assert.throws(() => stageReview20(snapshot, persisted, unsafeBase, unsafeCandidate, applyResponse()), /invalid artifact path/);
});

test('review20 returns business ambiguity as a question without proposing an edit', () => {
  const result = stageReview20(snapshot, persisted, base, candidate, {
    schemaVersion: REVIEW20_SCHEMA_VERSION, decision: 'clarification',
    clarification: 'Which label should appear to clinicians?', operations: [],
  });
  assert.equal(result.status, 'clarification');
  assert.deepEqual(result.proposal, candidate);
  assert.deepEqual(result.operationDiff, {});
});

test('review20 rejects request detached from the sealed revision', () => {
  assert.throws(() => stageReview20(snapshot, { ...persisted, request: 'Another request' }, base, candidate, applyResponse()), /persisted candidate revision/);
  assert.throws(() => stageReview20(snapshot, { ...persisted, revision: 1 }, base, candidate, applyResponse()), /persisted candidate revision/);
  assert.throws(() => stageReview20({ ...snapshot, requestRevision: 0 }, persisted, base, candidate, applyResponse()), /persisted candidate revision/);
});

test('review20 rejects stale values, identity edits, invalid or blank output', () => {
  const operation = applyResponse().operations[0];
  const withOperation = (patch: Record<string, unknown>) => applyResponse({ operations: [{ ...operation, ...patch }] });
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, withOperation({ expectedJson: '"old"' })), /stale/);
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, withOperation({ pointer: '/moduleId', expectedJson: '"mod-1"' })), /identity/);
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, withOperation({ valueJson: '"  "' })), /nonblank/);
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, withOperation({ valueJson: '{"x":1}' })), /scalar/);
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, withOperation({ valueJson: '"Visit calendar"' })), /no-op/);
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, withOperation({ artifactPath: 'other/module.defs.ts' })), /invalid artifact path/);
});

test('review20 rejects unknown response fields, malformed JSON pointers, duplicate operations and other module', () => {
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, applyResponse({ approved: true })), /unexpected fields/);
  const operation = applyResponse().operations[0];
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, applyResponse({ operations: [{ ...operation, pointer: '/~2title' }] })), /pointer escape/);
  assert.throws(() => stageReview20(snapshot, persisted, base, candidate, applyResponse({ operations: [operation, operation] })), /duplicate/);
  assert.throws(() => stageReview20(snapshot, persisted, base, { ...candidate, 'module.defs.ts': { ...candidate['module.defs.ts'], moduleName: 'other' } }, applyResponse()), /another module/);
  assert.throws(() => stageReview20(snapshot, persisted, base, { ...candidate, 'rules.defs.ts': {} }, applyResponse()), /inventory differs/);
});
