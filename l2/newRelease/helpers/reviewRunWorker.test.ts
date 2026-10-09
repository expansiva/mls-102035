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
  assert.equal(reported[0].errorCode, 'review-run.worker_start_failed:task unavailable');
  assert.deepEqual(reported[0].executions, []);

  const observeFailure = await driveReviewRunWorker(transport, {
    async startOrGet() { return structuredClone(execution); },
    async observe() { throw new Error('message unavailable'); },
  }, input);
  assert.equal(observeFailure.state, 'reported');
  assert.equal(reported[1].errorCode, 'review-run.worker_observe_failed');
  assert.equal(reported[1].executions[0].status, 'failed');
});

void test('review worker keeps a pending execution start out of the report', async () => {
  let reports = 0;
  const transport: ReviewWorkerTransport<{ status: string }> = {
    async claim() { return structuredClone(claim); },
    async report() { reports++; return { status: 'failed' }; },
  };
  const result = await driveReviewRunWorker(transport, {
    async startOrGet() { throw new Error('review-worker.execution_start_pending'); },
    async observe() { return null; },
  }, input);
  assert.equal(result.state, 'pending');
  if (result.state === 'pending') {
    assert.equal(result.reason, 'review-worker.execution_start_pending');
    assert.equal(result.claim.claimId, claim.claimId);
  }
  assert.equal(reports, 0);
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
      source: { resultId: `result-${'d'.repeat(32)}`, resultHash: 'b'.repeat(64) },
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
  for (const unpublished of [
    null,
    { status: 'read', pointer: null, snapshot: null },
    { status: 'read', pointer: candidate.pointer },
    { ...candidate, result: null },
  ]) {
    assert.equal(publishedCandidateMatchesRunRevision(run, outputRevisionId, unpublished), false);
  }
  for (const pointer of [
    { ...candidate.pointer, source: { ...candidate.pointer.source, resultId: 'result-other' } },
    { ...candidate.pointer, source: { ...candidate.pointer.source, resultHash: 'c'.repeat(64) } },
    { ...candidate.pointer, changeId: 'change-other' },
    { ...candidate.pointer, source: undefined, resultId: candidate.result.resultId, resultHash: candidate.result.resultHash },
  ]) {
    assert.equal(publishedCandidateMatchesRunRevision(run, outputRevisionId, { ...candidate, pointer }), false);
  }
  for (const result of [
    { ...candidate.result, resultSnapshotHash: 'c'.repeat(64) },
    { ...candidate.result, resultRevisionNumber: 2 },
    { ...candidate.result, manifest: { ...candidate.result.manifest, taskId: '' } },
    { ...candidate.result, manifest: { ...candidate.result.manifest, status: 'running' } },
    { ...candidate.result, manifest: { ...candidate.result.manifest, runId: `result-${'e'.repeat(32)}` } },
  ]) {
    assert.equal(publishedCandidateMatchesRunRevision(run, outputRevisionId, { ...candidate, result }), false);
  }

  assert.equal(publishedCandidateMatchesRunRevision(run, 'revision-new-request', candidate), false);
  assert.equal(publishedCandidateMatchesRunRevision(run, outputRevisionId, {
    ...candidate,
    result: { ...candidate.result, resultRevisionId: 'revision-other' },
  }), false);
});

void test('published review execution is adopted and observed without starting', async () => {
  const published = { taskId: 'published-task', resultRunId: 'result-published' };
  const adopted = { ...execution, taskId: published.taskId, resultRunId: published.resultRunId, status: 'completed' as const };
  let adoptions = 0;
  let starts = 0;
  let reports = 0;
  const transport: ReviewWorkerTransport<{ status: string }> = {
    async claim() { return structuredClone(claim); },
    async report(value) { reports++; assert.equal(value.progress.status, 'planning'); return { status: 'planning' }; },
  };
  const host: ReviewStudioHost = {
    async adoptPublished(value, result) { adoptions++; assert.deepEqual(value, claim); assert.deepEqual(result, published); return adopted; },
    async startOrGet() { starts++; return execution; },
    async observe(value, observed) { assert.deepEqual(value, claim); assert.deepEqual(observed, adopted); return { status: 'planning', executions: [observed] }; },
  };
  const result = await driveReviewRunWorker(transport, host, input, published);
  assert.equal(result.state, 'reported');
  assert.equal(adoptions, 1);
  assert.equal(starts, 0);
  assert.equal(reports, 1);
});

for (const scenario of ['planner', 'existing execution', 'host without adoption'] as const) {
  void test(`published execution is ignored for ${scenario}`, async () => {
    const currentClaim = { ...claim, ...(scenario === 'planner' ? { phase: 'planner' as const } : {}),
      ...(scenario === 'existing execution' ? { execution } : {}) };
    const currentExecution = { ...execution, agentName: scenario === 'planner' ? 'agentPlannerL4' : execution.agentName };
    let starts = 0;
    let adoptions = 0;
    const transport: ReviewWorkerTransport<unknown> = {
      async claim() { return currentClaim; },
      async report() { throw new Error('must not report without progress'); },
    };
    const host: ReviewStudioHost = {
      ...(scenario === 'host without adoption' ? {} : { async adoptPublished() { adoptions++; return currentExecution; } }),
      async startOrGet() { starts++; return currentExecution; },
      async observe() { return null; },
    };
    const result = await driveReviewRunWorker(transport, host, input, { taskId: 'published-task', resultRunId: 'result-published' });
    assert.equal(result.state, 'running');
    assert.equal(starts, 1);
    assert.equal(adoptions, 0);
  });
}
