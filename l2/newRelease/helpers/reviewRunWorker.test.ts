/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunWorker.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { driveReviewRunWorker } from './reviewRunWorkerCore.js';
import {
  readReviewRunLink,
  publishedCandidateMatchesRunRevision,
  reviewRunMatchesRevision,
  reviewRunLinkKey,
  reviewRunStableLinkKey,
  saveReviewRunLink,
  type ReviewWorkerIdentity,
} from './reviewRunWorker.js';
import type {
  ReviewStudioHost,
  ReviewWorkerClaim,
  ReviewWorkerClaimInput,
  ReviewWorkerExecution,
  ReviewWorkerProgress,
  ReviewWorkerTransport,
} from './reviewRunWorker.js';

const hash = `sha256:${'a'.repeat(64)}` as const;
const input: ReviewWorkerClaimInput = {
  userId: 'user-1', project: 102047, moduleName: 'agendaClinica', changeId: 'change-1',
  inputRevisionId: 'revision-1', inputSnapshotHash: hash, baseId: 'base-1', requestRevision: 1,
  requestHash: hash, runId: 'review-run-1', workerId: 'studio-1', canonicalSnapshotHash: hash,
};
const execution: ReviewWorkerExecution = {
  agentName: 'agentReviewSolution', taskId: 'task-1', threadId: 'thread-1', status: 'running', attempt: 1,
  provider: 'openai', model: 'gpt-5.5', resultRunId: null, candidateRevisionId: null,
  startedAt: '2026-09-22T00:00:00.000Z', updatedAt: '2026-09-22T00:00:00.000Z',
};
const claim: ReviewWorkerClaim = {
  runId: input.runId, project: input.project, moduleName: input.moduleName, changeId: input.changeId,
  phase: 'review', attempt: 1, claimId: 'claim-1', workerId: input.workerId,
  command: '@@agentReviewSolution {}', commandHash: hash, canonicalSnapshotHash: hash,
  claimedAt: '2026-09-22T00:00:00.000Z', leaseExpiresAt: '2026-09-22T00:00:30.000Z', execution: null,
};

void test('review worker starts once and reports observed progress', async () => {
  let starts = 0;
  let reports = 0;
  const progress: ReviewWorkerProgress = { status: 'reviewing', executions: [execution] };
  const transport: ReviewWorkerTransport<{ status: string }> = {
    async claim() { return structuredClone(claim); },
    async report(value) { reports++; assert.deepEqual(value.progress, progress); return { status: 'reviewing' }; },
  };
  const host: ReviewStudioHost = {
    async startOrGet() { starts++; return structuredClone(execution); },
    async observe() { return structuredClone(progress); },
  };
  const result = await driveReviewRunWorker(transport, host, input);
  assert.equal(result.state, 'reported');
  assert.equal(starts, 1);
  assert.equal(reports, 1);
});

void test('review worker reload reattaches without starting again', async () => {
  const reattached = { ...claim, execution: structuredClone(execution) };
  const transport: ReviewWorkerTransport<{ status: string }> = {
    async claim() { return structuredClone(reattached); },
    async report() { throw new Error('must not report without progress'); },
  };
  const host: ReviewStudioHost = {
    async startOrGet(value) { assert.deepEqual(value.execution, execution); return structuredClone(execution); },
    async observe() { return null; },
  };
  const result = await driveReviewRunWorker(transport, host, input);
  assert.equal(result.state, 'running');
});

void test('review worker rejects an execution from another phase', async () => {
  const transport: ReviewWorkerTransport<unknown> = {
    async claim() { return structuredClone(claim); },
    async report() { return {}; },
  };
  const host: ReviewStudioHost = {
    async startOrGet() { return { ...execution, agentName: 'agentPlannerL4' }; },
    async observe() { return null; },
  };
  const result = await driveReviewRunWorker(transport, host, input);
  assert.equal(result.state, 'reported');
});

void test('review worker reports start and observe failures as terminal progress', async () => {
  const reported: ReviewWorkerProgress[] = [];
  const transport: ReviewWorkerTransport<{ status: string }> = {
    async claim() { return structuredClone(claim); },
    async report(value) { reported.push(value.progress); return { status: 'failed' }; },
  };
  const startFailure = await driveReviewRunWorker(transport, {
    async startOrGet() { throw new Error('task unavailable'); },
    async observe() { return null; },
  }, input);
  assert.equal(startFailure.state, 'reported');
  assert.equal(reported[0].errorCode, 'review-run.worker_start_failed');
  assert.deepEqual(reported[0].executions, []);

  const observeFailure = await driveReviewRunWorker(transport, {
    async startOrGet() { return structuredClone(execution); },
    async observe() { throw new Error('message unavailable'); },
  }, input);
  assert.equal(observeFailure.state, 'reported');
  assert.equal(reported[1].errorCode, 'review-run.worker_observe_failed');
  assert.equal(reported[1].executions[0].status, 'failed');
});

void test('review run reload reattaches after the active revision changes before report', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
  };
  const identity: ReviewWorkerIdentity = {
    userId: input.userId,
    project: input.project,
    moduleName: input.moduleName,
    changeId: input.changeId,
    inputRevisionId: input.inputRevisionId,
    inputSnapshotHash: input.inputSnapshotHash,
    baseId: input.baseId,
    requestRevision: input.requestRevision,
    requestHash: input.requestHash,
    runId: input.runId,
  };
  const outputLookup = { ...identity, inputRevisionId: 'review-output-before-report' };

  saveReviewRunLink(identity, storage);

  assert.deepEqual(readReviewRunLink(outputLookup, storage), identity);
  assert.equal(values.has(reviewRunLinkKey(outputLookup)), false);
  assert.equal(values.get(reviewRunStableLinkKey(identity)), JSON.stringify(identity));

  const run = {
    binding: { inputRevisionId: identity.inputRevisionId },
    candidateResult: { manifest: { runId: `result-${'d'.repeat(32)}` } },
  } as Pick<import('./reviewRunWorker.js').PlatformReviewRun, 'binding' | 'candidateResult'>;
  assert.equal(reviewRunMatchesRevision(run, identity.inputRevisionId), true);
  assert.equal(reviewRunMatchesRevision(run, `review-${'d'.repeat(32)}`), true);
  assert.equal(reviewRunMatchesRevision(run, 'revision-new-request'), false);
});

void test('lost acknowledgement reattaches from the published candidate before the ledger report', () => {
  const outputRevisionId = `review-${'d'.repeat(32)}`;
  const run = {
    binding: {
      inputRevisionId: input.inputRevisionId,
      inputSnapshotHash: input.inputSnapshotHash,
      inputRevisionNumber: 1,
      changeId: input.changeId,
    },
  } as Pick<import('./reviewRunWorker.js').PlatformReviewRun, 'binding'>;
  const candidate = {
    status: 'read',
    pointer: {
      changeId: input.changeId,
      revisionId: outputRevisionId,
      resultId: `result-${'d'.repeat(32)}`,
      resultHash: 'b'.repeat(64),
    },
    result: {
      resultRevisionId: input.inputRevisionId,
      resultSnapshotHash: input.inputSnapshotHash.slice('sha256:'.length),
      resultRevisionNumber: 1,
      resultId: `result-${'d'.repeat(32)}`,
      resultHash: 'b'.repeat(64),
      manifest: { runId: `result-${'d'.repeat(32)}`, taskId: 'task-1', status: 'completed' },
    },
  };

  assert.equal(publishedCandidateMatchesRunRevision(run, outputRevisionId, candidate), true);
  assert.equal(publishedCandidateMatchesRunRevision(run, 'revision-new-request', candidate), false);
  assert.equal(publishedCandidateMatchesRunRevision(run, outputRevisionId, {
    ...candidate,
    result: { ...candidate.result, resultRevisionId: 'revision-other' },
  }), false);
});
