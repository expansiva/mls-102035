/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewStart.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { executePreparedReviewStart, prepareReviewStartInput } from './reviewStart.js';
import type { L4SealedCandidateSnapshot } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { buildCandidateSnapshot, type CandidatePointer, type CandidatePublishInput, type CandidateSnapshot } from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { canStartReviewRun } from '../widgets/reviewModel.js';
import { createHubEmMemoria } from '../../ensaio/nodejsHubEmMemoria.js';

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
          : { status: 'committed' as const, pointer: matchingPointer({
            changeId: input.changeId,
            revisionId: input.revisionId,
            snapshotHash: input.snapshot.hash,
            revisionNumber: (options.pointer?.revisionNumber ?? 0) + 1,
            ...(input.supersede && options.pointer ? { supersedes: {
              ...input.supersede, revisionNumber: options.pointer.revisionNumber,
            } } : {}),
          }) };
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
  assert.equal(prepared.supersededRevisionId, undefined);
});

test('mr_13 matching pointer skips publish', async () => {
  const { publishes, deps } = hubDeps({ pointer: matchingPointer() });
  const prepared = await prepareReviewStartInput(startContext, deps);
  assert.equal(publishes.length, 0);
  assert.equal(prepared.supersededRevisionId, undefined);
});

test('mr_42 pointer on another revision publishes with the exact supersede', async () => {
  const { publishes, deps } = hubDeps({
    pointer: matchingPointer({ revisionId: 'revision-other' }),
  });
  const prepared = await prepareReviewStartInput(startContext, deps);
  assert.equal(publishes.length, 1);
  assert.equal(publishes[0].expectedRevisionId, 'revision-other');
  assert.deepEqual(publishes[0].supersede, { changeId: 'change-one', revisionId: 'revision-other' });
  assert.equal(publishes[0].permit, undefined);
  assert.equal(prepared.input.inputRevisionId, 'revision-one');
  assert.equal(prepared.supersededRevisionId, 'revision-other');
});

test('mr_42 another change publishes with supersede; a pointer race stops before start', async () => {
  const prior = matchingPointer({ changeId: 'change-other', revisionId: 'revision-other' });
  const { publishes, deps } = hubDeps({ pointer: prior });
  const prepared = await prepareReviewStartInput(startContext, deps);
  assert.deepEqual(publishes[0].supersede, { changeId: prior.changeId, revisionId: prior.revisionId });
  assert.equal(prepared.supersededRevisionId, 'revision-other');

  let starts = 0;
  const raced = hubDeps({ pointer: prior, publish: async () => ({
    status: 'conflict', pointer: matchingPointer({ changeId: 'change-winner', revisionId: 'revision-winner' }),
  }) });
  await assert.rejects(executePreparedReviewStart(
    () => prepareReviewStartInput(startContext, raced.deps),
    async () => { starts += 1; return { runId: 'must-not-start' }; },
  ), /review-run\.hub_publish_conflict/u);
  assert.equal(raced.publishes.length, 1);
  assert.equal(starts, 0);
});

test('mr_42 reports the prior ID only with matching committed hub provenance', async () => {
  const prior = matchingPointer({ changeId: 'change-other', revisionId: 'revision-other', revisionNumber: 3 });
  const wrong = hubDeps({ pointer: prior, publish: async () => ({
    status: 'committed', pointer: matchingPointer({ revisionNumber: 4,
      supersedes: { changeId: 'change-other', revisionId: 'revision-wrong', revisionNumber: 3 },
    }),
  }) });
  await assert.rejects(prepareReviewStartInput(startContext, wrong.deps), /review-run\.hub_publish_conflict/u);
  assert.equal(wrong.publishes.length, 1);
});

test('mr_42 real in-memory hub preserves the superseded pointer on a new change and revision', async () => {
  const hub = createHubEmMemoria();
  const sources = [
    'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
    'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
  ].map(path => ({ path, source: 'export const value = 1;' }));
  const fullSnapshot = await buildCandidateSnapshot({ baseId: 'base-one', requestRevision: 1, request: 'Add one field', sources });
  const first = await hub.publish({
    project: 102047, moduleName: 'agendaClinica', expectedRevisionId: null,
    requestId: 'request-prior', changeId: 'change-prior', revisionId: 'revision-prior', snapshot: fullSnapshot,
  });
  assert.equal(first.status, 'committed');
  let publishCalls = 0;
  const deps = {
    readActive: async () => structuredClone(loaded),
    buildSnapshot: async () => fullSnapshot,
    readCandidate: async () => ({ pointer: (await hub.read({ project: 102047, moduleName: 'agendaClinica' })).pointer ?? null }),
    publishCandidate: async (input: CandidatePublishInput) => {
      publishCalls += 1;
      const result = await hub.publish(input);
      if (result.status === 'committed' || result.status === 'conflict') return {
        status: result.status, pointer: result.pointer ?? null,
      };
      throw new Error(result.msg || 'hub publish failed');
    },
  };
  const prepared = await prepareReviewStartInput(startContext, deps);
  assert.equal(prepared.supersededRevisionId, 'revision-prior');
  const current = await hub.read({ project: 102047, moduleName: 'agendaClinica' });
  assert.equal(current.pointer?.revisionId, 'revision-one');
  assert.deepEqual(current.pointer?.supersedes, {
    changeId: 'change-prior', revisionId: 'revision-prior', revisionNumber: 1,
  });
  const matching = await prepareReviewStartInput(startContext, deps);
  assert.equal(matching.supersededRevisionId, undefined);
  assert.equal(publishCalls, 1, 'matching pointer skips a second publish');
  const later = structuredClone(loaded);
  later.manifest.revisionId = 'revision-two';
  await prepareReviewStartInput({ ...startContext, revisionId: 'revision-two', loaded: later }, {
    ...deps, readActive: async () => later,
  });
  const newest = await hub.read({ project: 102047, moduleName: 'agendaClinica' });
  assert.deepEqual(newest.pointer?.supersedes, {
    changeId: 'change-one', revisionId: 'revision-one', revisionNumber: 2,
  });

  const raced = structuredClone(loaded);
  raced.manifest.revisionId = 'revision-three';
  let starts = 0;
  await assert.rejects(executePreparedReviewStart(
    () => prepareReviewStartInput({ ...startContext, revisionId: 'revision-three', loaded: raced }, {
      ...deps,
      readActive: async () => raced,
      publishCandidate: async input => {
        const winner = await hub.publish({
          project: input.project, moduleName: input.moduleName,
          expectedRevisionId: 'revision-two', requestId: 'request-winner',
          changeId: 'change-winner', revisionId: 'revision-winner', snapshot: fullSnapshot,
          supersede: { changeId: 'change-one', revisionId: 'revision-two' },
        });
        assert.equal(winner.status, 'committed');
        const result = await hub.publish(input);
        assert.equal(result.status, 'conflict');
        return { status: 'conflict' as const, pointer: result.pointer ?? null };
      },
    }),
    async () => { starts += 1; return { runId: 'must-not-start' }; },
  ), /review-run\.hub_publish_conflict/u);
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
