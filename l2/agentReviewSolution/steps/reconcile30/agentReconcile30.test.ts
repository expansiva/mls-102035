/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/reconcile30/agentReconcile30.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReviewEntrySnapshot, ReviewInventories } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { buildReviewTaskState, type ReviewTaskState } from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import {
  REVIEW20_PRIVATE_STATE_VERSION,
  type Review20PrivateState,
} from '/_102035_/l2/agentReviewSolution/steps/review20/agentReview20.js';
import {
  REVIEW20_SCHEMA_VERSION,
  stageReview20,
} from '/_102035_/l2/agentReviewSolution/steps/review20/review20.js';
import type { Reconcile30Result } from '/_102035_/l2/agentReviewSolution/steps/reconcile30/reconcile30.js';
import {
  beforeReconcile30Step,
  createReconcile30Step,
  parseReconcile30PrivateState,
  type Reconcile30Runtime,
} from './agentReconcile30.js';

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
const inventories: ReviewInventories = {
  snapshot,
  persistedRequest: { revision: 3, request: invocation.request },
  base: { 'module.defs.ts': { schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Old title' } },
  candidate: { 'module.defs.ts': { schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Old title' } },
};

async function taskState(frozen: ReviewEntrySnapshot = snapshot): Promise<ReviewTaskState> {
  return buildReviewTaskState(frozen, {
    v3: { registryModuleNames: ['agendaClinica'] },
    v2: { registryModuleNames: ['agendaClinica'] },
  }, 0);
}

async function reviewState(frozen: ReviewEntrySnapshot = snapshot): Promise<Review20PrivateState> {
  const staged = stageReview20(snapshot, inventories.persistedRequest, inventories.base, inventories.candidate, {
    schemaVersion: REVIEW20_SCHEMA_VERSION,
    decision: 'apply',
    clarification: '',
    operations: [{
      artifactPath: 'module.defs.ts', op: 'replace', pointer: '/title', basis: 'base-unchanged',
      expectedJson: '"Old title"', valueJson: '"New title"', reason: 'The request changes the title.',
    }],
  });
  assert.equal(staged.status, 'staged');
  const task = await taskState(frozen);
  return {
    schemaVersion: REVIEW20_PRIVATE_STATE_VERSION,
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
    base: JSON.parse(JSON.stringify(inventories.base)) as Record<string, unknown>,
    ...staged,
  };
}

async function result(status: Reconcile30Result['status'], draft?: Record<string, unknown>): Promise<Reconcile30Result> {
  const proposal = draft || (await reviewState()).proposal;
  const reason = status === 'ready' ? 'Pure gate checked the supplied inventory.' : 'A referenced artifact is unavailable.';
  return {
    status,
    schemaFamily: 'v2',
    changedPaths: ['module.defs.ts'],
    directAreas: ['module'],
    dependencyAreas: ['module'],
    diagnostics: [{
      area: 'module', status: status === 'ready' ? 'checked' : status,
      reason, issues: [],
    }],
    clarification: status === 'ready' ? '' : `module: ${reason}`,
    draft: JSON.parse(JSON.stringify(proposal)) as Record<string, unknown>,
    mutations: [],
    validation: null,
  };
}

function runtime(reconciled: Reconcile30Result): Reconcile30Runtime {
  return { reconcile: async () => reconciled };
}

async function context(state?: Review20PrivateState, frozen: ReviewEntrySnapshot = snapshot): Promise<mls.msg.ExecutionContext> {
  const task = await taskState(frozen);
  const resolvedState = state || await reviewState(frozen);
  const reviewResult: mls.msg.AIResultStep = {
    type: 'result', stepId: 21, status: 'completed', interaction: null, nextSteps: [],
    result: JSON.stringify(resolvedState),
    planning: { planId: 'review20-private-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'order', threadId: 'thread' },
    task: {
      PK: 'task',
      iaCompressed: { longMemory: {
        entrySnapshot: JSON.stringify(frozen), reviewPrivateState: JSON.stringify(task),
      }, nextSteps: [reviewResult] },
    },
    isTest: true,
  } as unknown as mls.msg.ExecutionContext;
}

function parent(): mls.msg.AIAgentStep {
  return { type: 'agent', agentName: 'agentReviewSolution', stepId: 10, status: 'in_progress', interaction: null, nextSteps: [], rags: [] };
}

function step(): mls.msg.AIAgentStep {
  return { ...createReconcile30Step(JSON.stringify({
    moduleName: invocation.moduleName,
    originalL4Path: invocation.originalL4Path,
    temporaryL4Path: invocation.temporaryL4Path,
    request: invocation.request,
    expectedRevisionId: invocation.expectedRevisionId,
  })), stepId: 30, status: 'waiting_human_input' };
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

test('reconcile30 stores a bounded ready draft privately and schedules validate40', async () => withProject(async () => {
  const intents = await beforeReconcile30Step(await context(), parent(), step(), 30, runtime(await result('ready')));
  assert.deepEqual(intents.map(intent => intent.type), ['add-step', 'add-step', 'update-status']);
  const privateResult = (intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
  assert.equal(privateResult.planning?.planId, 'reconcile30-private-result');
  const state = parseReconcile30PrivateState(privateResult.result);
  assert.equal(state.status, 'ready');
  assert.equal((state.draft['module.defs.ts'] as Record<string, unknown>).title, 'New title');
  const validate = (intents[1] as mls.msg.AgentIntentAddStep).step as mls.msg.AIAgentStep;
  assert.equal(validate.planning?.planId, 'validate40');
  assert.deepEqual(validate.planning?.dependsOn, ['reconcile30-private-result']);
}));

test('reconcile30 refuses stale snapshots and tampered private review results', async () => withProject(async () => {
  const stale = { ...snapshot, revisionId: 'rev-2' };
  const staleIntents = await beforeReconcile30Step(await context(await reviewState(), stale), parent(), step(), 31, runtime(await result('ready')));
  assert.equal((staleIntents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((staleIntents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /identity differs/u);

  const tampered = await reviewState();
  (tampered.proposal['module.defs.ts'] as Record<string, unknown>).title = 'Tampered title';
  const tamperedIntents = await beforeReconcile30Step(await context(tampered), parent(), step(), 32, runtime(await result('ready')));
  assert.equal((tamperedIntents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((tamperedIntents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /altered/u);

  const hashTampered = await reviewState();
  hashTampered.candidateHashes['module.defs.ts'] = 'sha256:tampered';
  const hashIntents = await beforeReconcile30Step(await context(hashTampered), parent(), step(), 33, runtime(await result('ready')));
  assert.equal((hashIntents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((hashIntents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /hashes differ/u);
}));

test('reconcile30 turns a mechanical contradiction into waiting_human_input and preserves the draft', async () => withProject(async () => {
  const intents = await beforeReconcile30Step(await context(), parent(), step(), 34, runtime(await result('clarification')));
  assert.deepEqual(intents.map(intent => intent.type), ['add-step', 'add-step', 'update-status']);
  const terminal = (intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
  assert.equal(terminal.planning?.planId, 'reconcile30-private-terminal');
  assert.equal(parseReconcile30PrivateState(terminal.result).status, 'clarification');
  const clarification = (intents[1] as mls.msg.AgentIntentAddStep).step as mls.msg.AIClarificationStep;
  assert.equal(clarification.status, 'waiting_human_input');
  assert.match(String(clarification.json), /referenced artifact is unavailable/u);
}));

test('reconcile30 records unsupported as a terminal private result without mutation', async () => withProject(async () => {
  const intents = await beforeReconcile30Step(await context(), parent(), step(), 35, runtime(await result('unsupported')));
  assert.deepEqual(intents.map(intent => intent.type), ['add-step', 'update-status']);
  const terminal = (intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
  assert.equal(terminal.planning?.planId, 'reconcile30-private-terminal');
  assert.equal(parseReconcile30PrivateState(terminal.result).status, 'unsupported');
}));
