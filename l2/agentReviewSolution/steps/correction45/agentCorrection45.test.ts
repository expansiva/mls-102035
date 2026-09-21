/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/correction45/agentCorrection45.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReviewEntrySnapshot } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { buildReviewTaskState } from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import { unavailableCandidateCoverage } from '/_102035_/l2/newRelease/helpers/candidateValidation.js';
import {
  RECONCILE30_PRIVATE_STATE_VERSION,
  type Reconcile30PrivateState,
} from '/_102035_/l2/agentReviewSolution/steps/reconcile30/agentReconcile30.js';
import { REVIEW20_PRIVATE_STATE_VERSION } from '/_102035_/l2/agentReviewSolution/steps/review20/agentReview20.js';
import {
  VALIDATE40_PRIVATE_STATE_VERSION,
  type Validate40PrivateState,
} from '/_102035_/l2/agentReviewSolution/steps/validate40/agentValidate40.js';
import { correct45Directed, parseCorrection45PrivateState } from './correction45.js';
import { beforeCorrection45Step } from './agentCorrection45.js';

const invocation = {
  moduleName: 'agendaClinica', originalL4Path: 'l4/agendaClinica/pipeline/releases/base-1/l4',
  temporaryL4Path: 'l4/agendaClinica/tobe/plan', request: 'Change the title.', expectedRevisionId: 'rev-1',
};
const snapshot: ReviewEntrySnapshot = {
  project: 102047, moduleName: invocation.moduleName, originalL4Path: invocation.originalL4Path,
  temporaryL4Path: invocation.temporaryL4Path, request: invocation.request, baseId: 'base-1', changeId: 'change-1',
  revisionId: 'rev-1', requestRevision: 3, originalHashes: { 'module.defs.ts': 'sha256:base' },
  candidateHashes: { 'module.defs.ts': 'sha256:candidate' }, changedPaths: [],
};
const base = { 'module.defs.ts': { schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Agenda' } };
const draft = { 'module.defs.ts': { schemaVersion: 'v1', moduleName: 'agendaClinica', title: '' } };

function resultStep(planId: string, result: unknown): mls.msg.AIResultStep {
  return { type: 'result', stepId: 31, status: 'completed', interaction: null, nextSteps: [], result: JSON.stringify(result),
    planning: { planId, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } };
}

test('correction45 persists the incremented counter and schedules validation of the corrected draft', async () => {
  const task = await buildReviewTaskState(snapshot, { v2: { registryModuleNames: ['agendaClinica'] } }, 0);
  const reconciled: Reconcile30PrivateState = {
    schemaVersion: RECONCILE30_PRIVATE_STATE_VERSION, sourceReviewSchemaVersion: REVIEW20_PRIVATE_STATE_VERSION,
    project: snapshot.project, moduleName: snapshot.moduleName, baseId: snapshot.baseId, changeId: snapshot.changeId,
    revisionId: snapshot.revisionId, requestRevision: snapshot.requestRevision, originalHashes: { ...snapshot.originalHashes },
    candidateHashes: { ...snapshot.candidateHashes }, validationContextHash: task.validationContextHash,
    correctionState: { requestKey: task.requestKey, correctionAttemptsUsed: 0 }, status: 'ready', schemaFamily: 'v2',
    changedPaths: ['module.defs.ts'], directAreas: ['module'], dependencyAreas: ['module'],
    diagnostics: [{ area: 'module', status: 'checked', reason: 'Checked.', issues: [] }], clarification: '',
    base: clone(base), draft: clone(draft), mutations: [],
  };
  const coverage = unavailableCandidateCoverage('Not affected.');
  coverage.module = { status: 'error', reason: 'Title is invalid.' };
  const invalid: Validate40PrivateState = {
    schemaVersion: VALIDATE40_PRIVATE_STATE_VERSION, sourceReconcileSchemaVersion: RECONCILE30_PRIVATE_STATE_VERSION,
    project: snapshot.project, moduleName: snapshot.moduleName, baseId: snapshot.baseId, changeId: snapshot.changeId,
    revisionId: snapshot.revisionId, requestRevision: snapshot.requestRevision, originalHashes: { ...snapshot.originalHashes },
    candidateHashes: { ...snapshot.candidateHashes }, validationContextHash: task.validationContextHash,
    correctionState: { requestKey: task.requestKey, correctionAttemptsUsed: 0 }, status: 'invalid', coreStatus: 'draft',
    publishable: false, mayCorrect: true, schemaFamily: 'v2', affectedAreas: ['module'], unsupportedPaths: [],
    reasons: ['TEST_INVALID $.title: invalid'], draft: clone(draft),
    validation: { ok: false, oracle: null, coverage, issues: [{ artifact: 'module.defs.ts', path: '$.title',
      severity: 'error', code: 'TEST_INVALID', message: 'Invalid title.', source: 'gate' }] },
  };
  const context = {
    message: { orderAt: 'order', threadId: 'thread' },
    task: { PK: 'task', iaCompressed: { longMemory: {
      entrySnapshot: JSON.stringify(snapshot), reviewPrivateState: JSON.stringify(task),
    }, nextSteps: [resultStep('reconcile30-private-result', reconciled), resultStep('validate40-private-terminal-0', invalid)] } },
    isTest: true,
  } as unknown as mls.msg.ExecutionContext;
  const parent = { type: 'agent', agentName: 'agentReviewSolution', stepId: 10, status: 'in_progress',
    interaction: null, nextSteps: [], rags: [] } as mls.msg.AIAgentStep;
  const step = { type: 'agent', agentName: 'agentReviewSolution', stepId: 45, status: 'waiting_dependency',
    interaction: null, nextSteps: [], rags: [], prompt: JSON.stringify(invocation),
    planning: { planId: 'correction45-attempt-1', dependsOn: ['validate40-private-terminal-0'],
      executionMode: 'sequential', executionHost: 'client' } } as mls.msg.AIAgentStep;
  const previous = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls?: unknown }).mls = { actualProject: 102047 };
  try {
    const intents = await beforeCorrection45Step(context, parent, step, 45);
    assert.deepEqual(intents.map(intent => intent.type), ['add-step', 'add-step', 'update-status']);
    const storedStep = (intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
    assert.equal(storedStep.planning?.planId, 'correction45-private-result-1');
    const stored = parseCorrection45PrivateState(storedStep.result);
    assert.equal(stored.attempted, true);
    assert.equal(stored.state.correctionAttemptsUsed, 1);
    assert.equal((stored.draft['module.defs.ts'] as { title: string }).title, 'Agenda');
    const retry = (intents[1] as mls.msg.AgentIntentAddStep).step as mls.msg.AIAgentStep;
    assert.equal(retry.planning?.planId, 'validate40-attempt-1');
    assert.deepEqual(retry.planning?.dependsOn, ['correction45-private-result-1']);
  } finally {
    (globalThis as { mls?: unknown }).mls = previous;
  }
});

test('correction45 accepts the bare field paths emitted by the real validation gate', () => {
  const coverage = unavailableCandidateCoverage('Not affected.');
  coverage.module = { status: 'error', reason: 'Title is invalid.' };
  const result = correct45Directed(base, draft, {
    ok: false,
    oracle: null,
    coverage,
    issues: [{ artifact: 'module.defs.ts', path: 'title', severity: 'error', code: 'NS5_MODULE_TITLE',
      message: 'Module title is required.', source: 'gate' }],
  }, { requestKey: 'request-1', correctionAttemptsUsed: 0 });
  assert.equal(result.status, 'corrected');
  assert.equal(result.attempted, true);
  assert.equal(result.state.correctionAttemptsUsed, 1);
  assert.equal(result.mutations[0]?.pointer, '/title');
  assert.equal((result.draft['module.defs.ts'] as { title: string }).title, 'Agenda');
});

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
