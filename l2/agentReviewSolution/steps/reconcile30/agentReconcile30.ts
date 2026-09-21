/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/reconcile30/agentReconcile30.ts" enhancement="_blank" />

import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { parseReviewInvocation, type ReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';
import {
  reviewSnapshotFromContext,
  type ReviewEntrySnapshot,
} from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import {
  correctionStateOf,
  reviewTaskStateFromContext,
  type ReviewTaskState,
} from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import type { Validate40CorrectionState } from '/_102035_/l2/agentReviewSolution/steps/validate40/validate40.js';
import { tobeDiff, type NewReleaseDiffEntry } from '/_102035_/l2/newRelease/tobeDiff.js';
import {
  parseReview20PrivateState,
  REVIEW20_PRIVATE_STATE_VERSION,
  type Review20PrivateState,
} from '/_102035_/l2/agentReviewSolution/steps/review20/agentReview20.js';
import {
  reconcile30Private,
  type Reconcile30AreaDiagnostic,
  type Reconcile30Result,
} from '/_102035_/l2/agentReviewSolution/steps/reconcile30/reconcile30.js';

export const RECONCILE30_PRIVATE_STATE_VERSION = '2026-09-21-reconcile30-private-state-v1' as const;
export const MAX_RECONCILE30_PRIVATE_STATE_CHARS = 400_000;

export interface Reconcile30PrivateState {
  schemaVersion: typeof RECONCILE30_PRIVATE_STATE_VERSION;
  sourceReviewSchemaVersion: typeof REVIEW20_PRIVATE_STATE_VERSION;
  project: number;
  moduleName: string;
  baseId: string;
  changeId: string;
  revisionId: string;
  requestRevision: number;
  originalHashes: Record<string, string>;
  candidateHashes: Record<string, string>;
  validationContextHash: string;
  correctionState: Validate40CorrectionState;
  status: Reconcile30Result['status'];
  schemaFamily: Reconcile30Result['schemaFamily'];
  changedPaths: string[];
  directAreas: Reconcile30Result['directAreas'];
  dependencyAreas: Reconcile30Result['dependencyAreas'];
  diagnostics: Reconcile30AreaDiagnostic[];
  clarification: string;
  base: Record<string, unknown>;
  draft: Record<string, unknown>;
  mutations: [];
}

export interface Reconcile30Runtime {
  reconcile(base: Record<string, unknown>, proposal: Record<string, unknown>): Promise<Reconcile30Result>;
}

const defaultRuntime: Reconcile30Runtime = {
  reconcile: (base, proposal) => reconcile30Private(base, proposal),
};

export async function beforeReconcile30Step(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  runtime: Reconcile30Runtime = defaultRuntime,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const invocation = parseReviewInvocation(String(step.prompt || ''), mls.actualProject || 0);
    const frozen = reviewSnapshotFromContext(context);
    const taskState = await reviewTaskStateFromContext(context, frozen);
    const review = readPrivateReviewResult(context);
    assertReviewStateIntegrity(review, frozen, invocation, taskState);
    const baseBefore = JSON.stringify(review.base);
    const proposalBefore = JSON.stringify(review.proposal);
    const reconciled = await runtime.reconcile(review.base, review.proposal);
    if (JSON.stringify(review.base) !== baseBefore || JSON.stringify(review.proposal) !== proposalBefore
      || reconciled.mutations.length !== 0 || JSON.stringify(reconciled.draft) !== proposalBefore) {
      throw new Error('reconcile30 attempted an unsupported mutation.');
    }
    const privateState = buildPrivateState(review, reconciled);
    const serialized = JSON.stringify(privateState);
    if (serialized.length > MAX_RECONCILE30_PRIVATE_STATE_CHARS) {
      throw new Error('reconcile30 result exceeds the private task-state size limit.');
    }
    parseReconcile30PrivateState(serialized);
    const terminal = reconciled.status !== 'ready';
    const intents: mls.msg.AgentIntent[] = [addStep(context, parentStep, {
      type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
      stepTitle: terminal ? 'Private reconcile diagnostic' : 'Private reconciled draft', result: serialized,
      planning: {
        planId: terminal ? 'reconcile30-private-terminal' : 'reconcile30-private-result',
        dependsOn: [], executionMode: 'manual_later', executionHost: 'client',
      },
    } as mls.msg.AIResultStep)];
    if (reconciled.status === 'clarification') {
      intents.push(addStep(context, parentStep, {
        type: 'clarification', stepId: 0, status: 'waiting_human_input', interaction: null, nextSteps: [],
        stepTitle: 'Reconciliation needs clarification',
        json: JSON.stringify({ source: 'reconcile30', question: reconciled.clarification }),
        planning: { planId: 'reconcile30-clarification', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
      } as mls.msg.AIClarificationStep));
    }
    if (reconciled.status === 'ready') {
      intents.push(addStep(context, parentStep, {
        type: 'agent', stepId: 0, interaction: null, nextSteps: [], status: 'waiting_dependency',
        agentName: 'agentReviewSolution', stepTitle: 'Validate private L4 draft', prompt: String(step.prompt || ''), rags: [],
        planning: {
          planId: 'validate40', dependsOn: ['reconcile30-private-result'],
          executionMode: 'sequential', executionHost: 'client',
        },
      } as mls.msg.AIAgentStep));
    }
    intents.push(status(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      reconciled.status === 'ready'
        ? 'reconcile30 completed in private state; validate40 scheduled with the frozen task context.'
        : `reconcile30 ended as ${reconciled.status}; draft preserved without mutation.`,
    ));
    return intents;
  } catch (error) {
    return [status(context, parentStep, step, hookSequential, 'failed', errorMessage(error))];
  }
}

export function createReconcile30Step(invocationPrompt: string): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 0, interaction: null, nextSteps: [], status: 'waiting_dependency',
    agentName: 'agentReviewSolution', stepTitle: 'Check private L4 dependencies', prompt: invocationPrompt, rags: [],
    planning: { planId: 'reconcile30', dependsOn: ['review20-private-result'], executionMode: 'sequential', executionHost: 'client' },
  };
}

export function parseReconcile30PrivateState(raw: string): Reconcile30PrivateState {
  if (raw.length > MAX_RECONCILE30_PRIVATE_STATE_CHARS) throw new Error('reconcile30 private state exceeds its size limit.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('reconcile30 private state is invalid JSON.'); }
  const keys = ['schemaVersion', 'sourceReviewSchemaVersion', 'project', 'moduleName', 'baseId', 'changeId', 'revisionId',
    'requestRevision', 'originalHashes', 'candidateHashes', 'validationContextHash', 'correctionState', 'status', 'schemaFamily',
    'changedPaths', 'directAreas', 'dependencyAreas', 'diagnostics',
    'clarification', 'base', 'draft', 'mutations'].sort();
  if (!isRecord(parsed) || Object.keys(parsed).length !== keys.length
    || Object.keys(parsed).sort().some((key, index) => key !== keys[index])
    || parsed.schemaVersion !== RECONCILE30_PRIVATE_STATE_VERSION
    || parsed.sourceReviewSchemaVersion !== REVIEW20_PRIVATE_STATE_VERSION
    || !Number.isSafeInteger(parsed.project) || Number(parsed.project) <= 0
    || typeof parsed.moduleName !== 'string' || !parsed.moduleName || typeof parsed.baseId !== 'string' || !parsed.baseId
    || typeof parsed.changeId !== 'string' || !parsed.changeId || typeof parsed.revisionId !== 'string' || !parsed.revisionId
    || !Number.isSafeInteger(parsed.requestRevision) || Number(parsed.requestRevision) < 1
    || !isHashMap(parsed.originalHashes) || !isHashMap(parsed.candidateHashes)
    || typeof parsed.validationContextHash !== 'string' || !/^sha256:[a-f0-9]{64}$/u.test(parsed.validationContextHash)
    || !isCorrectionState(parsed.correctionState)
    || (parsed.status !== 'ready' && parsed.status !== 'clarification' && parsed.status !== 'unsupported')
    || (parsed.schemaFamily !== 'v2' && parsed.schemaFamily !== 'v3' && parsed.schemaFamily !== 'unknown')
    || !isStringArray(parsed.changedPaths) || !isStringArray(parsed.directAreas) || !isStringArray(parsed.dependencyAreas)
    || !Array.isArray(parsed.diagnostics) || parsed.diagnostics.some(item => !isDiagnostic(item))
    || typeof parsed.clarification !== 'string' || !isInventory(parsed.base) || !isInventory(parsed.draft)
    || !Array.isArray(parsed.mutations) || parsed.mutations.length !== 0) {
    throw new Error('reconcile30 private state has an invalid shape.');
  }
  return parsed as unknown as Reconcile30PrivateState;
}

function readPrivateReviewResult(context: mls.msg.ExecutionContext): Review20PrivateState {
  const matches = getAllSteps(context.task?.iaCompressed?.nextSteps).filter((item): item is mls.msg.AIResultStep =>
    item.type === 'result' && item.status === 'completed' && item.planning?.planId === 'review20-private-result');
  if (matches.length !== 1) throw new Error('Expected exactly one completed private review20 result.');
  return parseReview20PrivateState(matches[0].result);
}

function assertReviewStateIntegrity(
  review: Review20PrivateState,
  snapshot: ReviewEntrySnapshot,
  invocation: ReviewInvocation,
  taskState: ReviewTaskState,
): void {
  if (review.project !== snapshot.project || review.moduleName !== snapshot.moduleName || review.baseId !== snapshot.baseId
    || review.changeId !== snapshot.changeId || review.revisionId !== snapshot.revisionId
    || review.requestRevision !== snapshot.requestRevision || invocation.project !== snapshot.project
    || invocation.moduleName !== snapshot.moduleName || invocation.baseId !== snapshot.baseId
    || invocation.originalL4Path !== snapshot.originalL4Path || invocation.temporaryL4Path !== snapshot.temporaryL4Path
    || invocation.request !== snapshot.request
    || (invocation.expectedRevisionId !== undefined && invocation.expectedRevisionId !== snapshot.revisionId)) {
    throw new Error('review20 private result identity differs from the frozen entry snapshot.');
  }
  if (!sameJson(review.originalHashes, snapshot.originalHashes)
    || !sameJson(review.candidateHashes, snapshot.candidateHashes)) {
    throw new Error('review20 private result hashes differ from the frozen entry snapshot.');
  }
  if (review.validationContextHash !== taskState.validationContextHash
    || !sameJson(review.correctionState, correctionStateOf(taskState))) {
    throw new Error('review20 private validation state differs from the task state.');
  }
  const basePaths = Object.keys(review.base).sort();
  const proposalPaths = Object.keys(review.proposal).sort();
  if (!sameStrings(basePaths, proposalPaths)
    || !sameJson(review.proposedDiff, diffMaps(review.base, review.proposal))) {
    throw new Error('review20 private result was altered or does not match the sealed inventories.');
  }
}

function buildPrivateState(review: Review20PrivateState, result: Reconcile30Result): Reconcile30PrivateState {
  return {
    schemaVersion: RECONCILE30_PRIVATE_STATE_VERSION,
    sourceReviewSchemaVersion: review.schemaVersion,
    project: review.project,
    moduleName: review.moduleName,
    baseId: review.baseId,
    changeId: review.changeId,
    revisionId: review.revisionId,
    requestRevision: review.requestRevision,
    originalHashes: { ...review.originalHashes },
    candidateHashes: { ...review.candidateHashes },
    validationContextHash: review.validationContextHash,
    correctionState: { ...review.correctionState },
    status: result.status,
    schemaFamily: result.schemaFamily,
    changedPaths: result.changedPaths,
    directAreas: result.directAreas,
    dependencyAreas: result.dependencyAreas,
    diagnostics: result.diagnostics,
    clarification: result.clarification,
    base: JSON.parse(JSON.stringify(review.base)) as Record<string, unknown>,
    draft: result.draft,
    mutations: [],
  };
}

function diffMaps(base: Record<string, unknown>, next: Record<string, unknown>): Record<string, NewReleaseDiffEntry[]> {
  const result: Record<string, NewReleaseDiffEntry[]> = {};
  for (const path of [...new Set([...Object.keys(base), ...Object.keys(next)])].sort()) {
    const entries = tobeDiff(base[path], next[path]);
    if (entries.length) result[path] = entries;
  }
  return result;
}

function addStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIPayload,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step,
  };
}

function status(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  statusValue: mls.msg.AIStepStatus,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId,
    hookSequential, status: statusValue, cleaner: 'input_output', traceMsg,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isDiagnostic(value: unknown): boolean {
  return isRecord(value) && typeof value.area === 'string'
    && (value.status === 'checked' || value.status === 'clarification' || value.status === 'unsupported')
    && typeof value.reason === 'string' && Array.isArray(value.issues);
}

function isCorrectionState(value: unknown): value is Validate40CorrectionState {
  return isRecord(value) && Object.keys(value).length === 2
    && typeof value.requestKey === 'string' && value.requestKey.length > 0
    && Number.isSafeInteger(value.correctionAttemptsUsed) && Number(value.correctionAttemptsUsed) >= 0
    && Number(value.correctionAttemptsUsed) <= 3;
}

function isHashMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(hash => typeof hash === 'string' && hash.startsWith('sha256:'));
}

function isInventory(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Object.values(value).every(isRecord);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
