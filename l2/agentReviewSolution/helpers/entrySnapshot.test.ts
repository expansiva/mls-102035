/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/entrySnapshot.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { L4_REVISION_SCHEMA, type L4CandidateManifest, type L4ChangeRecord, type L4ReleaseManifest } from '/_102035_/l2/newRelease/helpers/moduleRevision.js';
import {
  freezeReviewEntry,
  readReviewInventories,
  type ReviewEntrySnapshot,
  type ReviewInventoryRuntime,
} from './entrySnapshot.js';
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

test('inventory refuses altered original bytes with a stable manifest before review20 or validate40', async () => {
  const original = defsSource({ schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Original title' });
  const tampered = defsSource({ schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Tampered title' });
  const candidate = defsSource({ schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Candidate title' });
  const stable: ReviewEntrySnapshot = {
    project: invocation.project,
    moduleName: invocation.moduleName,
    originalL4Path: invocation.originalL4Path,
    temporaryL4Path: invocation.temporaryL4Path,
    request: invocation.request,
    baseId: invocation.baseId,
    changeId: change.changeId,
    revisionId: revision.revisionId,
    requestRevision: revision.requestRevision,
    originalHashes: { 'module.defs.ts': await hash(original) },
    candidateHashes: { 'module.defs.ts': await hash(candidate) },
    changedPaths: ['module.defs.ts'],
  };
  let snapshotReads = 0;
  const runtime: ReviewInventoryRuntime = {
    readSnapshot: async () => { snapshotReads += 1; return JSON.parse(JSON.stringify(stable)) as ReviewEntrySnapshot; },
    readRequest: async () => ({
      changeId: stable.changeId, revisionId: stable.revisionId, text: stable.request, resultCurrent: false,
    }),
    readOriginalSource: async () => tampered,
    readCandidateSource: async () => candidate,
  };
  await assert.rejects(() => readReviewInventories(invocation, runtime), /base bytes changed without a matching release manifest/u);
  assert.equal(snapshotReads, 1, 'failure occurs before downstream review steps or the final snapshot acceptance');
});

test('inventory parses the hashed bytes and revalidates the snapshot after reading', async () => {
  const original = defsSource({ schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Original title' });
  const candidate = defsSource({ schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Candidate title' });
  const stable: ReviewEntrySnapshot = {
    project: invocation.project, moduleName: invocation.moduleName,
    originalL4Path: invocation.originalL4Path, temporaryL4Path: invocation.temporaryL4Path,
    request: invocation.request, baseId: invocation.baseId, changeId: change.changeId,
    revisionId: revision.revisionId, requestRevision: revision.requestRevision,
    originalHashes: { 'module.defs.ts': await hash(original) },
    candidateHashes: { 'module.defs.ts': await hash(candidate) }, changedPaths: ['module.defs.ts'],
  };
  let snapshotReads = 0;
  const result = await readReviewInventories(invocation, {
    readSnapshot: async () => { snapshotReads += 1; return JSON.parse(JSON.stringify(stable)) as ReviewEntrySnapshot; },
    readRequest: async () => ({
      changeId: stable.changeId, revisionId: stable.revisionId, text: stable.request, resultCurrent: false,
    }),
    readOriginalSource: async () => original,
    readCandidateSource: async () => candidate,
  });
  assert.equal((result.base['module.defs.ts'] as { title: string }).title, 'Original title');
  assert.equal((result.candidate['module.defs.ts'] as { title: string }).title, 'Candidate title');
  assert.equal(snapshotReads, 2);
});

function defsSource(value: unknown): string {
  return `export const module = ${JSON.stringify(value)} as const;\n`;
}

async function hash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
