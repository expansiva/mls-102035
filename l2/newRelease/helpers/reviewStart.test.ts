/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewStart.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { executePreparedReviewStart, prepareReviewStartInput } from './reviewStart.js';
import type { L4SealedCandidateSnapshot } from './moduleRevision.js';
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
