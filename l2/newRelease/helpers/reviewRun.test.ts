/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRun.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCandidateResult, buildCandidateSnapshot, type CandidateResultRef } from './candidateGateway.js';
import {
  applyReviewObservation,
  assertReviewRunUpdate,
  buildReviewAgentInvocation,
  canonicalSha256,
  createReviewRun,
  evaluateReviewReadiness,
  evaluateReviewTerminality,
  reviewRunBindingEquals,
  reviewRunKey,
  stableCanonicalJson,
  submittingReviewRun,
  verifyReviewRunRecord,
  type ReviewCandidateTerminalEvidence,
  type ReviewReadinessProof,
  type ReviewRunCreateBinding,
  type ReviewRunRecord,
} from './reviewRun.js';
import { executeReviewRun, type ReviewChannelMode, type ReviewExecutionChannel } from './reviewRunExecution.js';
import type { ReviewRunStore } from './reviewRunStore.js';

const BARE_INPUT_HASH = 'a'.repeat(64);
const createBinding: ReviewRunCreateBinding = {
  project: 102047,
  moduleName: 'agendaClinica',
  changeId: 'change-one',
  inputRevisionId: 'revision-one',
  inputRevisionNumber: 3,
  inputSnapshotHash: `sha256:${BARE_INPUT_HASH}`,
  baseId: 'base-one',
  requestRevision: 4,
  originalL4Path: 'l4/agendaClinica/pipeline/releases/base-one/l4',
  temporaryL4Path: 'l4/agendaClinica/tobe/plan',
};

const CORE_PATHS = [
  'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
] as const;

async function run(runId = 'run-one'): Promise<ReviewRunRecord> {
  return createReviewRun(createBinding, { runId, requestId: 'request-one', now: '2026-09-21T10:00:00.000Z' }, 'Adjust greeting.');
}

async function evidence(current: ReviewRunRecord, manifestTaskId?: string): Promise<ReviewCandidateTerminalEvidence> {
  const outputSnapshot = await buildCandidateSnapshot({
    baseId: current.binding.baseId,
    requestRevision: current.binding.requestRevision,
    request: current.request,
    sources: CORE_PATHS.map(path => ({ path, source: `source:${path}` })),
  });
  const resultSuffix = (await canonicalSha256(current.runId)).slice('sha256:'.length, 'sha256:'.length + 32);
  const resultId = `result-${resultSuffix}`;
  const outputRevisionId = `review-${resultSuffix}`;
  const manifest = {
    runId: resultId,
    taskId: manifestTaskId ?? `task-${resultSuffix}`,
    status: 'completed' as const,
    outputSnapshotHash: outputSnapshot.hash,
    artifacts: outputSnapshot.files.map(({ path, sha256 }) => ({ path, sha256 })),
    traceHash: 'c'.repeat(64),
  };
  const built = await buildCandidateResult({
    project: current.binding.project,
    moduleName: current.binding.moduleName,
    expectedRevisionId: current.binding.inputRevisionId,
    expectedSnapshotHash: BARE_INPUT_HASH,
    expectedRevisionNumber: current.binding.inputRevisionNumber,
    resultId,
    result: manifest,
    outputSnapshot,
  });
  const result: CandidateResultRef = {
    resultRevisionId: current.binding.inputRevisionId,
    resultSnapshotHash: BARE_INPUT_HASH,
    resultRevisionNumber: current.binding.inputRevisionNumber,
    resultId,
    resultHash: built.resultHash,
    manifest: built.result,
  };
  return {
    finalize50: {
      schemaVersion: '2026-09-21-finalize50-private-result-v3',
      project: current.binding.project,
      moduleName: current.binding.moduleName,
      changeId: current.binding.changeId,
      inputRevisionId: current.binding.inputRevisionId,
      outputRevisionId,
      outputSnapshotHash: outputSnapshot.hash,
      correctionState: { requestKey: 'change-one/request-4', correctionAttemptsUsed: 0 },
      pointer: {
        changeId: current.binding.changeId,
        revisionId: outputRevisionId,
        snapshotHash: outputSnapshot.hash,
        revisionNumber: 4,
      },
      summary: { fileCount: outputSnapshot.files.length, changedPaths: ['module.defs.ts'] },
    },
    result,
    snapshotArtifacts: outputSnapshot.files.map(({ path, sha256 }) => ({ path, sha256 })),
  };
}

function allReady(): ReviewReadinessProof {
  return {
    execCandidateRoute: { verified: true, evidence: 'route-test' },
    cbeCandidateContract: { verified: true, evidence: 'contract-test' },
    candidateWorkspace: { verified: true, evidence: 'workspace-test' },
    plannerHandoff: { verified: true, evidence: 'handoff-test' },
    writeFence: { verified: true, evidence: 'fence-test' },
  };
}

class MemoryStore implements ReviewRunStore {
  value: ReviewRunRecord | null = null;
  async read(): Promise<ReviewRunRecord | null> { return this.value ? structuredClone(this.value) : null; }
  async create(value: ReviewRunRecord): Promise<ReviewRunRecord> {
    if (!this.value) this.value = structuredClone(value);
    else if (!reviewRunBindingEquals(this.value.binding, value.binding)) throw new Error('review-run.revision_already_bound');
    return structuredClone(this.value);
  }
  async compareAndSwap(expected: number, value: ReviewRunRecord): Promise<{ committed: boolean; current: ReviewRunRecord }> {
    assert.ok(this.value);
    if (this.value.storeRevision !== expected) return { committed: false, current: structuredClone(this.value) };
    assertReviewRunUpdate(this.value, value);
    await verifyReviewRunRecord(value);
    this.value = structuredClone(value);
    return { committed: true, current: structuredClone(value) };
  }
}

test('create clones before hashing, computes canonical request hash internally and builds the exact invocation', async () => {
  const mutable = structuredClone(createBinding);
  const pending = createReviewRun(mutable, { runId: 'run-one', requestId: 'request-one', now: 'now' }, 'Adjust greeting.');
  mutable.moduleName = 'mutatedModule';
  mutable.inputSnapshotHash = `sha256:${'f'.repeat(64)}`;
  const draft = await pending;
  assert.equal(draft.binding.moduleName, 'agendaClinica');
  assert.equal(draft.binding.inputSnapshotHash, `sha256:${BARE_INPUT_HASH}`);
  assert.equal(draft.binding.requestHash, await canonicalSha256('Adjust greeting.'));
  assert.equal(reviewRunKey(draft.binding), 'review-runs/102047/agendaClinica/change-one/revision-one');
  const invocation = buildReviewAgentInvocation(draft);
  assert.equal(invocation.input.request, 'Adjust greeting.');
  assert.equal(invocation.input.expectedRevisionId, 'revision-one');
  await assert.rejects(() => createReviewRun(createBinding, {
    runId: 'run-two', requestId: 'request-two', now: 'now',
  }, ' Adjust greeting. '), /invalid_request/);
});

test('stable equality is independent of property insertion order', () => {
  const left = { z: 1, nested: { b: true, a: ['x', 2] } };
  const right = { nested: { a: ['x', 2], b: true }, z: 1 };
  assert.equal(stableCanonicalJson(left), stableCanonicalJson(right));
});

test('readiness remains closed until every external proof is present', () => {
  assert.deepEqual(evaluateReviewReadiness().missing, [
    'execCandidateRoute', 'cbeCandidateContract', 'candidateWorkspace', 'plannerHandoff', 'writeFence',
  ]);
  assert.deepEqual(evaluateReviewReadiness(allReady()), { ready: true, missing: [] });
});

test('task completion or finalize50 alone stays explicitly pending; exact real contracts become ready', async () => {
  const draft = await run();
  const real = await evidence(draft);
  assert.deepEqual(await evaluateReviewTerminality(draft, {
    currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing', finalize50: real.finalize50,
  }), {
    status: 'running', phase: 'planning', superseded: false, output: null,
    errorCode: 'review-run.planner_result_contract_pending',
  });
  const ready = await evaluateReviewTerminality(draft, {
    currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
    channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId,
    finalize50: real.finalize50, candidateResult: { result: real.result, snapshotArtifacts: real.snapshotArtifacts },
  });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.output?.result.manifest.taskId.startsWith('task-'), true);
  assert.notEqual(ready.output?.result.manifest.taskId, 'studio-task-one');
  assert.equal(ready.output?.canonical.outputSnapshotHash, `sha256:${real.finalize50.outputSnapshotHash}`);

  const incomplete = structuredClone(real);
  incomplete.snapshotArtifacts = incomplete.snapshotArtifacts.slice(0, 1);
  assert.equal((await evaluateReviewTerminality(draft, {
    currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
    channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: incomplete.result.resultId,
    finalize50: incomplete.finalize50,
    candidateResult: { result: incomplete.result, snapshotArtifacts: incomplete.snapshotArtifacts },
  })).status, 'failed');

  assert.equal((await evaluateReviewTerminality(draft, {
    currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
    resultRunId: real.result.resultId, finalize50: real.finalize50,
    candidateResult: { result: real.result, snapshotArtifacts: real.snapshotArtifacts },
  })).status, 'failed');
  const foreign = await run('foreign-run');
  const foreignEvidence = await evidence(foreign);
  assert.equal((await evaluateReviewTerminality(draft, {
    currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
    channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId,
    finalize50: foreignEvidence.finalize50,
    candidateResult: { result: foreignEvidence.result, snapshotArtifacts: foreignEvidence.snapshotArtifacts },
  })).status, 'failed');

  const wrongManifestIdentity = await evidence(draft, `task-${'e'.repeat(32)}`);
  assert.equal((await evaluateReviewTerminality(draft, {
    currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
    channelTaskId: 'studio-task-one', channelThreadId: 'thread-one',
    resultRunId: wrongManifestIdentity.result.resultId,
    finalize50: wrongManifestIdentity.finalize50,
    candidateResult: {
      result: wrongManifestIdentity.result,
      snapshotArtifacts: wrongManifestIdentity.snapshotArtifacts,
    },
  })).status, 'failed');

  const divergentFinalize = structuredClone(real);
  divergentFinalize.finalize50.outputRevisionId = `review-${'e'.repeat(32)}`;
  divergentFinalize.finalize50.pointer.revisionId = `review-${'e'.repeat(32)}`;
  assert.equal((await evaluateReviewTerminality(draft, {
    currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
    channelTaskId: 'studio-task-one', channelThreadId: 'thread-one',
    resultRunId: divergentFinalize.result.resultId,
    finalize50: divergentFinalize.finalize50,
    candidateResult: {
      result: divergentFinalize.result,
      snapshotArtifacts: divergentFinalize.snapshotArtifacts,
    },
  })).status, 'failed');
});

test('late valid output keeps its terminal status and is stamped superseded without promotion', async () => {
  const draft = await run();
  const submitting = submittingReviewRun(draft, 'later');
  const real = await evidence(submitting);
  const archived = await applyReviewObservation(submitting, {
    currentRevisionId: 'revision-two', taskStatus: 'completed', phase: 'finalizing',
    channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId, finalize50: real.finalize50,
    candidateResult: { result: real.result, snapshotArtifacts: real.snapshotArtifacts },
  }, 'later-2');
  assert.equal(archived.status, 'ready');
  assert.equal(archived.superseded, true);
  assert.equal(archived.output?.result.resultId, real.result.resultId);
  assert.equal(archived.errorCode, null);
});

test('ready output is preserved byte-for-byte when a newer revision supersedes it', async () => {
  const active = submittingReviewRun(await run(), 'submitted');
  const real = await evidence(active);
  const ready = await applyReviewObservation(active, {
    currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
    channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId,
    finalize50: real.finalize50,
    candidateResult: { result: real.result, snapshotArtifacts: real.snapshotArtifacts },
  }, 'ready');
  const archived = await applyReviewObservation(ready, {
    currentRevisionId: 'revision-two', taskStatus: 'running', phase: 'reviewing',
  }, 'superseded');
  assert.equal(archived.status, 'ready');
  assert.equal(archived.superseded, true);
  assert.deepEqual(archived.output, ready.output);
});

test('superseded running run remains reattachable and records its own late terminal output', async () => {
  const store = new MemoryStore();
  const draft = await run();
  const real = await evidence(draft);
  const revisionChanged: ReviewExecutionChannel = {
    async *stream() {
      yield {
        currentRevisionId: 'revision-two', taskStatus: 'running', phase: 'planning',
        channelTaskId: 'studio-task-one', channelThreadId: 'thread-one',
      };
    },
  };
  const first = await executeReviewRun({
    store, channel: revisionChanged, run: draft, readiness: allReady(), now: () => 'revision-changed',
  });
  assert.equal(first.run.status, 'running');
  assert.equal(first.run.superseded, true);
  assert.equal(first.run.output, null);
  assert.equal(first.run.errorCode, null);

  let mode: ReviewChannelMode | null = null;
  const lateTerminal: ReviewExecutionChannel = {
    async *stream(_invocation, attachment) {
      mode = attachment.mode;
      yield {
        currentRevisionId: 'revision-two', taskStatus: 'completed', phase: 'finalizing',
        channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId,
        finalize50: real.finalize50,
        candidateResult: { result: real.result, snapshotArtifacts: real.snapshotArtifacts },
      };
    },
  };
  const reloaded = await executeReviewRun({
    store, channel: lateTerminal, run: await run('ignored-after-reload'), readiness: allReady(), now: () => 'late-terminal',
  });
  assert.equal(mode, 'reattach');
  assert.equal(reloaded.run.status, 'ready');
  assert.equal(reloaded.run.superseded, true);
  assert.equal(reloaded.run.output?.result.resultId, real.result.resultId);
});

test('executor persists without channel access while readiness is unproved', async () => {
  const store = new MemoryStore();
  let calls = 0;
  const channel: ReviewExecutionChannel = { async *stream() { calls += 1; } };
  const result = await executeReviewRun({ store, channel, run: await run() });
  assert.equal(result.status, 'disabled');
  assert.equal(result.run.status, 'planning');
  assert.equal(calls, 0);
});

test('fake channel uses real finalize50/CBE evidence and reaches ready', async () => {
  const store = new MemoryStore();
  const draft = await run();
  const real = await evidence(draft);
  const modes: ReviewChannelMode[] = [];
  const channel: ReviewExecutionChannel = {
    async *stream(_invocation, attachment) {
      modes.push(attachment.mode);
      yield { currentRevisionId: 'revision-one', taskStatus: 'running', phase: 'reviewing', channelTaskId: 'studio-task-one', channelThreadId: 'thread-one' };
      yield { currentRevisionId: 'revision-one', taskStatus: 'running', phase: 'planning', channelTaskId: 'studio-task-one', channelThreadId: 'thread-one' };
      yield {
        currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
        channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId,
        finalize50: real.finalize50, candidateResult: { result: real.result, snapshotArtifacts: real.snapshotArtifacts },
      };
    },
  };
  const result = await executeReviewRun({ store, channel, run: draft, readiness: allReady(), now: () => 'tick' });
  assert.equal(result.run.status, 'ready');
  assert.equal(result.run.taskId, 'studio-task-one');
  assert.notEqual(result.run.taskId, result.run.output?.result.manifest.taskId);
  assert.equal(result.run.attemptsUsed, 1);
  assert.deepEqual(modes, ['submit']);
});

test('reload after submit CAS reattaches idempotently instead of resending', async () => {
  const store = new MemoryStore();
  const draft = await run();
  await store.create(draft);
  store.value = submittingReviewRun(draft, 'after-cas');
  const real = await evidence(draft);
  let mode: ReviewChannelMode | null = null;
  const channel: ReviewExecutionChannel = {
    async *stream(_invocation, attachment) {
      mode = attachment.mode;
      yield {
        currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
        channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId,
        finalize50: real.finalize50, candidateResult: { result: real.result, snapshotArtifacts: real.snapshotArtifacts },
      };
    },
  };
  const result = await executeReviewRun({ store, channel, run: await run('ignored-run'), readiness: allReady() });
  assert.equal(mode, 'reattach');
  assert.equal(result.run.runId, 'run-one');
  assert.equal(result.run.status, 'ready');
});

test('transient channel failure retries explicitly with the same immutable identity', async () => {
  const store = new MemoryStore();
  const draft = await run();
  const failing: ReviewExecutionChannel = { async *stream() { throw new Error('network'); } };
  const first = await executeReviewRun({ store, channel: failing, run: draft, readiness: allReady(), now: () => 'first' });
  assert.equal(first.run.status, 'running');
  assert.equal(first.run.errorCode, 'review-run.channel_failed');
  assert.equal(first.run.attemptsUsed, 1);
  const real = await evidence(first.run);
  let mode: ReviewChannelMode | null = null;
  const recovered: ReviewExecutionChannel = {
    async *stream(_invocation, attachment) {
      mode = attachment.mode;
      yield {
        currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
        channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId,
        finalize50: real.finalize50, candidateResult: { result: real.result, snapshotArtifacts: real.snapshotArtifacts },
      };
    },
  };
  const mutableReadiness = allReady();
  const executionInput = {
    store, channel: recovered, run: structuredClone(draft), readiness: mutableReadiness,
    retryFailed: true, now: () => 'retry',
  };
  const pendingRetry = executeReviewRun(executionInput);
  executionInput.retryFailed = false;
  executionInput.run.runId = 'mutated-run';
  mutableReadiness.writeFence = undefined;
  recovered.stream = async function* () { throw new Error('mutated channel must not run'); };
  const retried = await pendingRetry;
  assert.equal(mode, 'retry');
  assert.equal(retried.run.status, 'ready');
  assert.equal(retried.run.attemptsUsed, 2);
  assert.equal(retried.run.runId, first.run.runId);
});

test('completed task with missing planner contract remains resumable planning', async () => {
  const store = new MemoryStore();
  const draft = await run();
  const real = await evidence(draft);
  const pending: ReviewExecutionChannel = {
    async *stream() {
      yield {
        currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
        channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId,
        finalize50: real.finalize50,
      };
    },
  };
  const first = await executeReviewRun({ store, channel: pending, run: draft, readiness: allReady(), now: () => 'pending' });
  assert.equal(first.run.status, 'running');
  assert.equal(first.run.errorCode, 'review-run.planner_result_contract_pending');
  let mode: ReviewChannelMode | null = null;
  const complete: ReviewExecutionChannel = {
    async *stream(_invocation, attachment) {
      mode = attachment.mode;
      yield {
        currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
        channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: real.result.resultId,
        finalize50: real.finalize50, candidateResult: { result: real.result, snapshotArtifacts: real.snapshotArtifacts },
      };
    },
  };
  const second = await executeReviewRun({ store, channel: complete, run: draft, readiness: allReady(), now: () => 'complete' });
  assert.equal(mode, 'reattach');
  assert.equal(second.run.status, 'ready');
});

test('terminal failure and dispute stay terminal while superseded is stamped independently', async () => {
  const active = submittingReviewRun(await run(), 'submitted');
  const failed = await applyReviewObservation(active, {
    currentRevisionId: 'revision-two', taskStatus: 'failed', phase: 'planning',
    channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', errorCode: 'planner.failed',
  }, 'failed');
  assert.equal(failed.status, 'failed');
  assert.equal(failed.superseded, true);
  const replayed = await applyReviewObservation(failed, {
    currentRevisionId: 'revision-three', taskStatus: 'running', phase: 'reviewing',
  }, 'reload');
  assert.equal(replayed.status, 'failed');
  assert.equal(replayed.superseded, true);
  assert.equal(replayed.errorCode, 'planner.failed');

  const disputed = await applyReviewObservation(submittingReviewRun(await run('run-dispute'), 'submitted'), {
    currentRevisionId: 'revision-two', taskStatus: 'running', phase: 'planning', disputed: true,
    channelTaskId: 'studio-task-two', channelThreadId: 'thread-two', errorCode: 'planner.disputed',
  }, 'disputed');
  assert.equal(disputed.status, 'disputed');
  assert.equal(disputed.superseded, true);
});
