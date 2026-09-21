/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/validate40/agentValidate40.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReviewEntrySnapshot } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { buildReviewTaskState, type ReviewTaskState } from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import { unavailableCandidateCoverage } from '/_102035_/l2/newRelease/helpers/candidateValidation.js';
import type { NewReleaseOverlayValidation } from '/_102035_/l2/newRelease/tobe.js';
import {
  RECONCILE30_PRIVATE_STATE_VERSION,
  type Reconcile30PrivateState,
} from '/_102035_/l2/agentReviewSolution/steps/reconcile30/agentReconcile30.js';
import { REVIEW20_PRIVATE_STATE_VERSION } from '/_102035_/l2/agentReviewSolution/steps/review20/agentReview20.js';
import type { Validate40Result } from '/_102035_/l2/agentReviewSolution/steps/validate40/validate40.js';
import {
  beforeValidate40Step,
  createValidate40Step,
  parseValidate40PrivateState,
  type Validate40Runtime,
} from './agentValidate40.js';
import {
  CORRECTION45_PRIVATE_STATE_VERSION,
  correct45Directed,
} from '/_102035_/l2/agentReviewSolution/steps/correction45/correction45.js';

const invocation = {
  project: 102047,
  moduleName: 'agendaClinica',
  originalL4Path: 'l4/agendaClinica/pipeline/releases/base-1/l4',
  temporaryL4Path: 'l4/agendaClinica/tobe/plan',
  request: 'Change the title.',
  baseId: 'base-1',
  expectedRevisionId: 'rev-1',
};
const snapshot: ReviewEntrySnapshot = {
  project: invocation.project,
  moduleName: invocation.moduleName,
  originalL4Path: invocation.originalL4Path,
  temporaryL4Path: invocation.temporaryL4Path,
  request: invocation.request,
  baseId: invocation.baseId,
  changeId: 'change-1',
  revisionId: 'rev-1',
  requestRevision: 3,
  originalHashes: { 'module.defs.ts': 'sha256:base' },
  candidateHashes: { 'module.defs.ts': 'sha256:candidate' },
  changedPaths: [],
};
const base = { 'module.defs.ts': { schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Old title' } };
const draft = { 'module.defs.ts': { schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'New title' } };

async function taskState(attempts = 0, context: Parameters<typeof buildReviewTaskState>[1] = {
  v2: { registryModuleNames: ['agendaClinica'] },
}): Promise<ReviewTaskState> {
  return buildReviewTaskState(snapshot, context, attempts);
}

function reconcile(task: ReviewTaskState): Reconcile30PrivateState {
  return {
    schemaVersion: RECONCILE30_PRIVATE_STATE_VERSION,
    sourceReviewSchemaVersion: REVIEW20_PRIVATE_STATE_VERSION,
    project: snapshot.project,
    moduleName: snapshot.moduleName,
    baseId: snapshot.baseId,
    changeId: snapshot.changeId,
    revisionId: snapshot.revisionId,
    requestRevision: snapshot.requestRevision,
    originalHashes: { ...snapshot.originalHashes },
    candidateHashes: { ...snapshot.candidateHashes },
    validationContextHash: task.validationContextHash,
    correctionState: { requestKey: task.requestKey, correctionAttemptsUsed: task.correctionAttemptsUsed },
    status: 'ready',
    schemaFamily: 'unknown',
    changedPaths: ['module.defs.ts'],
    directAreas: ['module'],
    dependencyAreas: ['module'],
    diagnostics: [{ area: 'module', status: 'checked', reason: 'Pure gate checked the supplied inventory.', issues: [] }],
    clarification: '',
    base: clone(base),
    draft: clone(draft),
    mutations: [],
  };
}

function validation(status: 'checked' | 'unsupported' | 'error', issue = false): NewReleaseOverlayValidation {
  const coverage = unavailableCandidateCoverage('Not affected by this private validation.');
  coverage.module = status === 'checked' ? { status } : { status, reason: `Module is ${status}.` };
  return {
    ok: status === 'checked' && !issue,
    oracle: null,
    coverage,
    issues: issue ? [{
      artifact: 'module.defs.ts', path: '$.title', severity: 'error', code: 'TEST_INVALID',
      message: 'The title is invalid.', source: 'gate',
    }] : [],
  };
}

function result(
  task: ReviewTaskState,
  status: Validate40Result['status'],
  coverageStatus: 'checked' | 'unsupported' | 'error',
): Validate40Result {
  const publishable = status === 'publishable';
  return {
    status,
    publishable,
    mayCorrect: status === 'draft' && coverageStatus === 'error',
    schemaFamily: 'v2',
    affectedAreas: ['module'],
    unsupportedPaths: [],
    state: { requestKey: task.requestKey, correctionAttemptsUsed: task.correctionAttemptsUsed },
    draft: clone(draft),
    validation: validation(coverageStatus, coverageStatus === 'error'),
    reasons: publishable ? [] : [`Module is ${coverageStatus}.`],
  };
}

function runtime(value: Validate40Result, inspect?: (input: Parameters<Validate40Runtime['validate']>[0]) => void): Validate40Runtime {
  return { validate: async input => { inspect?.(input); return clone(value); } };
}

function context(
  task: ReviewTaskState,
  state: Reconcile30PrivateState = reconcile(task),
  extras: mls.msg.AIPayload[] = [],
): mls.msg.ExecutionContext {
  const reconcileResult: mls.msg.AIResultStep = {
    type: 'result', stepId: 31, status: 'completed', interaction: null, nextSteps: [], result: JSON.stringify(state),
    planning: { planId: 'reconcile30-private-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'order', threadId: 'thread' },
    task: { PK: 'task', iaCompressed: {
      longMemory: { entrySnapshot: JSON.stringify(snapshot), reviewPrivateState: JSON.stringify(task) },
      nextSteps: [reconcileResult, ...extras],
    } },
    isTest: true,
  } as unknown as mls.msg.ExecutionContext;
}

function parent(): mls.msg.AIAgentStep {
  return { type: 'agent', agentName: 'agentReviewSolution', stepId: 10, status: 'in_progress', interaction: null, nextSteps: [], rags: [] };
}

function step(): mls.msg.AIAgentStep {
  return { ...createValidate40Step(JSON.stringify({
    moduleName: invocation.moduleName,
    originalL4Path: invocation.originalL4Path,
    temporaryL4Path: invocation.temporaryL4Path,
    request: invocation.request,
    expectedRevisionId: invocation.expectedRevisionId,
  })), stepId: 40, status: 'waiting_human_input' };
}

function retryStep(attempt: number): mls.msg.AIAgentStep {
  return { ...step(), planning: { planId: `validate40-attempt-${attempt}`, dependsOn: [`correction45-private-result-${attempt}`],
    executionMode: 'sequential', executionHost: 'client' } };
}

function stored(planId: string, value: unknown): mls.msg.AIResultStep {
  return { type: 'result', stepId: 99, status: 'completed', interaction: null, nextSteps: [], result: JSON.stringify(value),
    planning: { planId, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } };
}

async function withProject<T>(fn: () => Promise<T>): Promise<T> {
  const previous = (globalThis as { mls?: unknown }).mls;
  let writes = 0;
  (globalThis as { mls?: unknown }).mls = {
    actualProject: 102047,
    stor: { localStor: { setContent: () => { writes += 1; throw new Error('external write attempted'); } } },
  };
  try {
    const value = await fn();
    assert.equal(writes, 0);
    return value;
  } finally {
    (globalThis as { mls?: unknown }).mls = previous;
  }
}

test('validate40 keeps valid output private and schedules permit-gated finalize50', async () => withProject(async () => {
  const task = await taskState(0);
  const intents = await beforeValidate40Step(context(task), parent(), step(), 40, runtime(result(task, 'publishable', 'checked')));
  assert.deepEqual(intents.map(intent => intent.type), ['add-step', 'add-step', 'update-status']);
  const privateResult = (intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
  const state = parseValidate40PrivateState(privateResult.result);
  assert.equal(privateResult.planning?.planId, 'validate40-private-result');
  assert.equal(state.status, 'ready');
  assert.equal(state.correctionState.correctionAttemptsUsed, 0);
  const finalize = (intents[1] as mls.msg.AgentIntentAddStep).step as mls.msg.AIAgentStep;
  assert.equal(finalize.type, 'agent');
  assert.equal(finalize.planning?.planId, 'finalize50');
  assert.deepEqual(finalize.planning?.dependsOn, ['validate40-private-result']);
}));

test('validate40 transports missing context without rereading storage and reports unsupported', async () => withProject(async () => {
  const task = await taskState(0, {});
  const value = result(task, 'draft', 'unsupported');
  value.mayCorrect = false;
  const intents = await beforeValidate40Step(context(task), parent(), step(), 41, runtime(value, input => {
    assert.deepEqual(input.context, {});
  }));
  const state = parseValidate40PrivateState(((intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep).result);
  assert.equal(state.status, 'unsupported');
  assert.equal(state.correctionState.correctionAttemptsUsed, 0);
  assert.equal(intents.some(intent => intent.type === 'add-step'
    && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'finalize50'), false);
}));

test('validate40 preserves correction counters zero and three for invalid drafts', async () => withProject(async () => {
  const zero = await taskState(0);
  const zeroIntents = await beforeValidate40Step(context(zero), parent(), step(), 42, runtime(result(zero, 'draft', 'error')));
  const zeroState = parseValidate40PrivateState(((zeroIntents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep).result);
  assert.equal(zeroState.status, 'invalid');
  assert.equal(zeroState.correctionState.correctionAttemptsUsed, 0);
  assert.equal(zeroState.mayCorrect, true);
  const correction = zeroIntents.find(intent => intent.type === 'add-step'
    && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'correction45-attempt-1') as mls.msg.AgentIntentAddStep;
  assert.ok(correction);
  assert.deepEqual(correction.step.planning?.dependsOn, ['validate40-private-terminal-0']);

  const three = await taskState(3);
  const atLimit = result(three, 'attempt-limit', 'error');
  atLimit.mayCorrect = false;
  const threeIntents = await beforeValidate40Step(context(three), parent(), step(), 43, runtime(atLimit));
  const threeState = parseValidate40PrivateState(((threeIntents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep).result);
  assert.equal(threeState.status, 'invalid');
  assert.equal(threeState.correctionState.correctionAttemptsUsed, 3);
  assert.equal(threeState.mayCorrect, false);
  assert.equal(threeIntents.some(intent => intent.type === 'add-step'
    && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'finalize50'), false);
  assert.equal(threeIntents.some(intent => intent.type === 'add-step'
    && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId?.startsWith('correction45-attempt-')), false);
}));

test('validate40 rejects stale identity and tampered hashes before validation', async () => withProject(async () => {
  const task = await taskState(0);
  const stale = reconcile(task);
  stale.revisionId = 'rev-2';
  let calls = 0;
  const staleIntents = await beforeValidate40Step(context(task, stale), parent(), step(), 44, {
    validate: async () => { calls += 1; return result(task, 'publishable', 'checked'); },
  });
  assert.equal((staleIntents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((staleIntents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /identity differs/u);

  const tampered = reconcile(task);
  tampered.candidateHashes['module.defs.ts'] = 'sha256:tampered';
  const tamperedIntents = await beforeValidate40Step(context(task, tampered), parent(), step(), 45, {
    validate: async () => { calls += 1; return result(task, 'publishable', 'checked'); },
  });
  assert.equal((tamperedIntents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((tamperedIntents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /altered or is stale/u);
  assert.equal(calls, 0);
}));

test('validate40 resumes from the persisted correction chain without resetting the counter', async () => withProject(async () => {
  const task = await taskState(0);
  const reconciled = reconcile(task);
  const first = result(task, 'draft', 'error');
  const firstIntents = await beforeValidate40Step(context(task, reconciled), parent(), step(), 46, runtime(first));
  const invalidStep = (firstIntents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
  assert.equal(invalidStep.planning?.planId, 'validate40-private-terminal-0');
  const invalid = parseValidate40PrivateState(invalidStep.result);
  const corrected = correct45Directed(reconciled.base, reconciled.draft, invalid.validation, invalid.correctionState);
  assert.equal(corrected.attempted, true);
  const correction = {
    schemaVersion: CORRECTION45_PRIVATE_STATE_VERSION,
    project: reconciled.project, moduleName: reconciled.moduleName, baseId: reconciled.baseId,
    changeId: reconciled.changeId, revisionId: reconciled.revisionId, requestRevision: reconciled.requestRevision,
    originalHashes: { ...reconciled.originalHashes }, candidateHashes: { ...reconciled.candidateHashes },
    validationContextHash: reconciled.validationContextHash, sourceValidationPlanId: 'validate40-private-terminal-0',
    ...corrected,
  };
  const after = result(task, 'draft', 'checked');
  after.state = { requestKey: task.requestKey, correctionAttemptsUsed: 1 };
  after.draft = clone(corrected.draft);
  after.affectedAreas = [];
  after.publishable = false;
  after.mayCorrect = false;
  after.reasons = ['The correction removed the invalid change.'];
  let calls = 0;
  const intents = await beforeValidate40Step(context(task, reconciled, [
    invalidStep,
    stored('correction45-private-result-1', correction),
  ]), parent(), retryStep(1), 47, runtime(after, input => {
    calls += 1;
    assert.equal(input.state.correctionAttemptsUsed, 1);
    assert.deepEqual(input.proposal, corrected.draft);
  }));
  assert.equal(calls, 1);
  const resumed = parseValidate40PrivateState(((intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep).result);
  assert.equal(resumed.correctionState.correctionAttemptsUsed, 1);
  assert.deepEqual(resumed.draft, corrected.draft);

  const tampered = clone(correction);
  (tampered.draft['module.defs.ts'] as { title: string }).title = 'Injected';
  const refused = await beforeValidate40Step(context(task, reconciled, [
    invalidStep,
    stored('correction45-private-result-1', tampered),
  ]), parent(), retryStep(1), 48, runtime(after, () => { calls += 100; }));
  assert.equal((refused[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((refused[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /altered|does not match/u);
  assert.equal(calls, 1);
}));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
