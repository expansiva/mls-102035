/// <mls fileReference="_102035_/l2/newRelease/helpers/effortFreshness.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { effortMatchesCurrent } from './effortFreshness.js';
import type { L4SealedCandidateSnapshot } from '/_102035_/l2/solution/candidate/moduleRevision.js';

const sealed: L4SealedCandidateSnapshot = {
  request: 'Change a rule', manifest: { schemaVersion: '2026-09-20-nr-module-revision-v1', project: 102047,
    moduleName: 'agendaClinica', changeId: 'change-one', revisionId: 'revision-one', baseId: 'base-one',
    createdAt: '', files: {}, changedPaths: ['module.defs.ts'], requestRevision: 1,
    requestHash: `sha256:${'a'.repeat(64)}` },
  sources: (['module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts', 'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts'] as const).map(path => ({ path, source: 'export const value = { title: "Before" };' })),
};
function effort() {
  const value = JSON.parse(readFileSync(new URL('../widgets/fixtures/changeEffort-agendaClinica-regra-anotacao.json', import.meta.url), 'utf8'));
  value.base = { baseId: 'base-one', revisionId: 'revision-one', candidateRoot: 'agendaClinica/pipeline/changes/change-one/revisions/revision-one/l4' };
  return value;
}
test('same sealed revision and current mirror content keep effort current', async () => {
  assert.equal(await effortMatchesCurrent(102047, 'agendaClinica', effort(), {
    sealed: async () => sealed, source: async () => sealed.sources[0].source,
  }), true);
});
test('a mutable mirror edit invalidates effort even with the same revision identity', async () => {
  assert.equal(await effortMatchesCurrent(102047, 'agendaClinica', effort(), {
    sealed: async () => sealed, source: async () => 'export const module = { title: "After" };',
  }), false);
});
test('different root, revision, base or failed sealed integrity invalidate effort', async () => {
  for (const field of ['baseId', 'revisionId', 'candidateRoot']) {
    const value = effort(); value.base[field] = 'old';
    assert.equal(await effortMatchesCurrent(102047, 'agendaClinica', value, { sealed: async () => sealed }), false);
  }
  assert.equal(await effortMatchesCurrent(102047, 'agendaClinica', effort(), { sealed: async () => null }), false);
});


test('unexpected integrity/IO failure fails closed with its cause logged', async () => {
  const cause = new Error('Cannot read sealed revision');
  const original = console.error;
  const diagnostics: unknown[][] = [];
  console.error = (...args) => { diagnostics.push(args); };
  try {
    assert.equal(await effortMatchesCurrent(102047, 'agendaClinica', effort(), { sealed: async () => { throw cause; } }), false);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0][1], cause);
  } finally { console.error = original; }
});
