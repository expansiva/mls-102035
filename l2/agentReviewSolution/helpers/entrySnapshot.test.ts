/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/entrySnapshot.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { L4_REVISION_SCHEMA, type L4CandidateManifest, type L4ChangeRecord, type L4ReleaseManifest } from '/_102035_/l2/newRelease/helpers/moduleRevision.js';
import { freezeReviewEntry } from './entrySnapshot.js';
import { parseReviewInvocation } from './invocation.js';

const invocation = parseReviewInvocation({
  moduleName: 'agendaClinica',
  originalL4Path: 'l4/agendaClinica/pipeline/releases/base-abc123/l4',
  temporaryL4Path: 'l4/agendaClinica/tobe/plan',
  request: 'Adjust the appointment greeting.',
  expectedRevisionId: 'rev-7',
}, 102047);
const release: L4ReleaseManifest = {
  schemaVersion: L4_REVISION_SCHEMA, project: 102047, moduleName: 'agendaClinica', baseId: 'base-abc123',
  createdAt: '2026-09-20T00:00:00.000Z', files: { 'module.defs.ts': 'sha256:base' },
  schemas: { 'module.defs.ts': '2026-09-10-ns5-module-v2' },
  provenance: { status: 'unverified', label: 'Base captured — publication not verified' },
};
const change: L4ChangeRecord = {
  schemaVersion: L4_REVISION_SCHEMA, project: 102047, moduleName: 'agendaClinica', changeId: 'change-1',
  baseId: 'base-abc123', activeRevisionId: 'rev-7', requestRevision: 2, resultRevisionId: null,
  sourcePrompt: 'Initial request', updatedAt: '2026-09-20T00:01:00.000Z',
};
const revision: L4CandidateManifest = {
  schemaVersion: L4_REVISION_SCHEMA, project: 102047, moduleName: 'agendaClinica', changeId: 'change-1',
  revisionId: 'rev-7', baseId: 'base-abc123', createdAt: '2026-09-20T00:01:00.000Z',
  files: { 'module.defs.ts': 'sha256:edited' }, changedPaths: ['module.defs.ts'], requestRevision: 2,
};

test('entry freezes the matching private snapshot without writing or changing the original', () => {
  const frozen = freezeReviewEntry(invocation, change, release, revision, { 'module.defs.ts': 'sha256:edited' });
  assert.deepEqual(frozen.changedPaths, ['module.defs.ts']);
  assert.equal(frozen.originalHashes['module.defs.ts'], 'sha256:base');
  assert.equal(frozen.candidateHashes['module.defs.ts'], 'sha256:edited');
  assert.equal(frozen.revisionId, 'rev-7');
  assert.equal(release.files['module.defs.ts'], 'sha256:base');
});

test('entry refuses stale revision, other module, incomplete source inventory and unsealed bytes', () => {
  assert.throws(() => freezeReviewEntry(invocation, { ...change, activeRevisionId: 'rev-8' }, release, revision, revision.files), /revision conflict/);
  assert.throws(() => freezeReviewEntry(invocation, { ...change, moduleName: 'otherModule' }, release, revision, revision.files), /no matching active change/);
  assert.throws(() => freezeReviewEntry(invocation, change, release, { ...revision, files: { ...revision.files, 'rules.defs.ts': 'sha256:extra' } }, revision.files), /inventory differs/);
  assert.throws(() => freezeReviewEntry(invocation, change, release, revision, { 'module.defs.ts': 'sha256:later' }), /bytes differ/);
  assert.throws(() => freezeReviewEntry(invocation, { ...change, activeRevisionId: null }, release, null, {}), /Save the request/);
});
