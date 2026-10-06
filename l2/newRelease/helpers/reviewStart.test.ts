/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewStart.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { executePreparedReviewStart, prepareReviewStartInput } from './reviewStart.js';
import type { L4SealedCandidateSnapshot } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import type { CandidatePointer, CandidatePublishInput, CandidateSnapshot } from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { canStartReviewRun } from '../widgets/reviewModel.js';

const hash = `sha256:${'a'.repeat(64)}`;
const loaded: L4SealedCandidateSnapshot = {
  request: 'Add one field',
  manifest: {
    schemaVersion: '2026-09-20-nr-module-revision-v1',
    project: 102047,
    moduleName: 'agendaClinica',
    changeId: 'change-one',
    revisionId: 'revision-one',
    baseId: 'base-one',
    createdAt: '2026-10-02T00:00:00.000Z',
    files: { 'module.defs.ts': hash },
    changedPaths: ['module.defs.ts'],
    requestRevision: 1,
    requestHash: hash,
  },
  sources: [{ path: 'module.defs.ts', source: 'export const module = { title: "Before" }' }],
};

test('authoritative change between preflight and handler prevents any start request', async () => {
  let starts = 0;
  assert.equal(canStartReviewRun({
    project: 102047,
    moduleName: 'agendaClinica',
    changeId: 'change-one',
    revisionId: 'revision-one',
    request: 'Add one field',
    userId: 'user-one',
    hasRun: false,
    sealedRevision: loaded,
  }), true);
  const changed = structuredClone(loaded);
  changed.sources[0].source = 'export const module = { title: "After" }';
  changed.manifest.files['module.defs.ts'] = `sha256:${'b'.repeat(64)}`;
  await assert.rejects(
    executePreparedReviewStart(
      () => prepareReviewStartInput({
        project: 102047,
        moduleName: 'agendaClinica',
        changeId: 'change-one',
        revisionId: 'revision-one',
        request: 'Add one field',
        userId: 'user-one',
        loaded,
      }, { readActive: async () => changed }),
      async () => { starts += 1; return { runId: 'must-not-start' }; },
    ),
    /review-run\.revision_mismatch/u,
  );
  assert.equal(starts, 0);
});

const snapshotHash = 'c'.repeat(64);
const snapshot: CandidateSnapshot = {
  hash: snapshotHash,
  baseId: 'base-one',
  requestRevision: 1,
  request: 'Add one field',
  files: [{ path: 'module.defs.ts', sha256: snapshotHash, contentBase64: 'Zg==' }],
};

const startContext = {
  project: 102047,
  moduleName: 'agendaClinica',
  changeId: 'change-one',
  revisionId: 'revision-one',
  request: 'Add one field',
  userId: 'user-one',
  loaded,
};

function matchingPointer(overrides: Partial<CandidatePointer> = {}): CandidatePointer {
  return {
    changeId: 'change-one',
    revisionId: 'revision-one',
    snapshotHash,
    revisionNumber: 1,
    ...overrides,
  };
}

function hubDeps(options: {
  pointer: CandidatePointer | null;
  publish?: (input: CandidatePublishInput) => Promise<{ status: 'committed' | 'conflict'; pointer: CandidatePointer | null }>;
}) {
  const publishes: CandidatePublishInput[] = [];
  return {
    publishes,
    deps: {
      readActive: async () => structuredClone(loaded),
      buildSnapshot: async () => structuredClone(snapshot),
      readCandidate: async () => ({ pointer: options.pointer }),
      publishCandidate: async (input: CandidatePublishInput) => {
        publishes.push(input);
        return options.publish
          ? options.publish(input)
          : { status: 'committed' as const, pointer: matchingPointer() };
      },
    },
  };
}

test('mr_13 pointer null publishes once with expectedRevisionId null and returns start input', async () => {
  const { publishes, deps } = hubDeps({ pointer: null });
  const prepared = await prepareReviewStartInput(startContext, deps);
  assert.equal(publishes.length, 1);
  assert.equal(publishes[0].expectedRevisionId, null);
  assert.equal(publishes[0].requestId, 'review-start-revision-one');
  assert.equal(publishes[0].changeId, 'change-one');
  assert.equal(publishes[0].revisionId, 'revision-one');
  assert.equal(publishes[0].snapshot.hash, snapshotHash);
  assert.equal(prepared.input.inputRevisionId, 'revision-one');
  assert.equal(prepared.input.inputSnapshotHash, `sha256:${snapshotHash}`);
});

test('mr_13 matching pointer skips publish', async () => {
  const { publishes, deps } = hubDeps({ pointer: matchingPointer() });
  await prepareReviewStartInput(startContext, deps);
  assert.equal(publishes.length, 0);
});

test('mr_13 pointer on another revision throws hub_revision_differs without publish or start', async () => {
  let starts = 0;
  const { publishes, deps } = hubDeps({
    pointer: matchingPointer({ revisionId: 'revision-other' }),
  });
  await assert.rejects(
    executePreparedReviewStart(
      () => prepareReviewStartInput(startContext, deps),
      async () => { starts += 1; return { runId: 'must-not-start' }; },
    ),
    /review-run\.hub_revision_differs/u,
  );
  assert.equal(publishes.length, 0);
  assert.equal(starts, 0);
});

test('mr_13 publish conflict throws hub_publish_conflict without start', async () => {
  let starts = 0;
  const { deps } = hubDeps({
    pointer: null,
    publish: async () => ({ status: 'conflict', pointer: matchingPointer({ revisionId: 'revision-other' }) }),
  });
  await assert.rejects(
    executePreparedReviewStart(
      () => prepareReviewStartInput(startContext, deps),
      async () => { starts += 1; return { runId: 'must-not-start' }; },
    ),
    /review-run\.hub_publish_conflict/u,
  );
  assert.equal(starts, 0);
});
