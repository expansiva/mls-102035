/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/validate40/agentValidate40.ts" enhancement="_blank" />

import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { parseReviewInvocation, type ReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';
import { reviewSnapshotFromContext, type ReviewEntrySnapshot } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import {
  correctionStateOf,
  reviewTaskStateFromContext,
  type ReviewTaskState,
} from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import { stableStringifyTobe } from '/_102035_/l2/newRelease/tobeDiff.js';
import { createFinalize50Step } from '/_102035_/l2/agentReviewSolution/steps/finalize50/agentFinalize50.js';
import {
  parseReconcile30PrivateState,
  RECONCILE30_PRIVATE_STATE_VERSION,
  type Reconcile30PrivateState,
} from '/_102035_/l2/agentReviewSolution/steps/reconcile30/agentReconcile30.js';
import {
  validate40AffectedAreas,
  validate40Private,
  type Validate40CorrectionState,
  type Validate40Input,
  type Validate40Result,
} from '/_102035_/l2/agentReviewSolution/steps/validate40/validate40.js';
import type { CandidateArea } from '/_102035_/l2/newRelease/helpers/candidateValidation.js';
import type { NewReleaseOverlayValidation } from '/_102035_/l2/newRelease/tobe.js';

export const VALIDATE40_PRIVATE_STATE_VERSION = '2026-09-21-validate40-private-state-v1' as const;
export const MAX_VALIDATE40_PRIVATE_STATE_CHARS = 550_000;

export type Validate40PrivateStatus = 'ready' | 'clarification' | 'unsupported' | 'invalid';

export interface Validate40PrivateState {
  schemaVersion: typeof VALIDATE40_PRIVATE_STATE_VERSION;
  sourceReconcileSchemaVersion: typeof RECONCILE30_PRIVATE_STATE_VERSION;
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
  status: Validate40PrivateStatus;
  coreStatus: Validate40Result['status'];
  publishable: boolean;
  mayCorrect: boolean;
  schemaFamily: Validate40Result['schemaFamily'];
  affectedAreas: CandidateArea[];
  unsupportedPaths: string[];
  reasons: string[];
  draft: Record<string, unknown>;
  validation: NewReleaseOverlayValidation | null;
}

export interface Validate40Runtime {
  validate(input: Validate40Input): Promise<Validate40Result>;
}

const defaultRuntime: Validate40Runtime = { validate: validate40Private };

export async function beforeValidate40Step(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  runtime: Validate40Runtime = defaultRuntime,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const invocation = parseReviewInvocation(String(step.prompt || ''), mls.actualProject || 0);
    const frozen = reviewSnapshotFromContext(context);
    const taskState = await reviewTaskStateFromContext(context, frozen);
    const reconciled = readPrivateReconcileResult(context);
    assertReconcileStateIntegrity(reconciled, frozen, invocation, taskState);
    const baseBefore = JSON.stringify(reconciled.base);
    const draftBefore = JSON.stringify(reconciled.draft);
    const correctionBefore = JSON.stringify(reconciled.correctionState);
    const validated = await runtime.validate({
      requestKey: reconciled.correctionState.requestKey,
      state: { ...reconciled.correctionState },
      base: reconciled.base,
      proposal: reconciled.draft,
      context: taskState.validationContext,
    });
    if (JSON.stringify(reconciled.base) !== baseBefore || JSON.stringify(reconciled.draft) !== draftBefore
      || JSON.stringify(validated.draft) !== draftBefore || JSON.stringify(validated.state) !== correctionBefore) {
      throw new Error('validate40 mutated the draft or consumed a correction attempt without a correction.');
    }
    const affected = validate40AffectedAreas(reconciled.base, reconciled.draft);
    if (!sameJson(validated.affectedAreas, affected.areas)
      || !sameJson(validated.unsupportedPaths, affected.unsupportedPaths)) {
      throw new Error('validate40 result does not match the affected draft areas.');
    }
    const privateState = buildPrivateState(reconciled, validated);
    const serialized = JSON.stringify(privateState);
    if (serialized.length > MAX_VALIDATE40_PRIVATE_STATE_CHARS) {
      throw new Error('validate40 result exceeds the private task-state size limit.');
    }
    parseValidate40PrivateState(serialized);
    const ready = privateState.status === 'ready';
    const intents: mls.msg.AgentIntent[] = [addStep(context, parentStep, {
      type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
      stepTitle: ready ? 'Private validated draft' : 'Private validation diagnostic', result: serialized,
      planning: {
        planId: ready ? 'validate40-private-result' : 'validate40-private-terminal',
        dependsOn: [], executionMode: 'manual_later', executionHost: 'client',
      },
    } as mls.msg.AIResultStep)];
    if (ready) {
      intents.push(addStep(context, parentStep, createFinalize50Step(String(step.prompt || ''))));
    } else if (privateState.status === 'clarification') {
      intents.push(addStep(context, parentStep, {
        type: 'clarification', stepId: 0, status: 'waiting_human_input', interaction: null, nextSteps: [],
        stepTitle: 'Validation needs clarification',
        json: JSON.stringify({ source: 'validate40', question: privateState.reasons.join('\n') || 'Clarify the requested L4 change.' }),
        planning: { planId: 'validate40-clarification', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
      } as mls.msg.AIClarificationStep));
    }
    intents.push(status(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      ready
        ? 'validate40 passed all affected gates; finalize50 scheduled to mark exact output bytes without publishing.'
        : `validate40 ended as ${privateState.status}; draft and correction counter preserved.`,
    ));
    return intents;
  } catch (error) {
    return [status(context, parentStep, step, hookSequential, 'failed', errorMessage(error))];
  }
}

export function createValidate40Step(invocationPrompt: string): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 0, interaction: null, nextSteps: [], status: 'waiting_dependency',
    agentName: 'agentReviewSolution', stepTitle: 'Validate private L4 draft', prompt: invocationPrompt, rags: [],
    planning: { planId: 'validate40', dependsOn: ['reconcile30-private-result'], executionMode: 'sequential', executionHost: 'client' },
  };
}

export function parseValidate40PrivateState(raw: string): Validate40PrivateState {
  if (raw.length > MAX_VALIDATE40_PRIVATE_STATE_CHARS) throw new Error('validate40 private state exceeds its size limit.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('validate40 private state is invalid JSON.'); }
  const keys = ['schemaVersion', 'sourceReconcileSchemaVersion', 'project', 'moduleName', 'baseId', 'changeId', 'revisionId',
    'requestRevision', 'originalHashes', 'candidateHashes', 'validationContextHash', 'correctionState', 'status',
    'coreStatus', 'publishable', 'mayCorrect', 'schemaFamily', 'affectedAreas', 'unsupportedPaths', 'reasons',
    'draft', 'validation'].sort();
  if (!isRecord(parsed) || Object.keys(parsed).length !== keys.length
    || Object.keys(parsed).sort().some((key, index) => key !== keys[index])
    || parsed.schemaVersion !== VALIDATE40_PRIVATE_STATE_VERSION
    || parsed.sourceReconcileSchemaVersion !== RECONCILE30_PRIVATE_STATE_VERSION
    || !Number.isSafeInteger(parsed.project) || Number(parsed.project) <= 0
    || typeof parsed.moduleName !== 'string' || !parsed.moduleName || typeof parsed.baseId !== 'string' || !parsed.baseId
    || typeof parsed.changeId !== 'string' || !parsed.changeId || typeof parsed.revisionId !== 'string' || !parsed.revisionId
    || !Number.isSafeInteger(parsed.requestRevision) || Number(parsed.requestRevision) < 1
    || !isHashMap(parsed.originalHashes) || !isHashMap(parsed.candidateHashes)
    || typeof parsed.validationContextHash !== 'string' || !/^sha256:[a-f0-9]{64}$/u.test(parsed.validationContextHash)
    || !isCorrectionState(parsed.correctionState)
    || (parsed.status !== 'ready' && parsed.status !== 'clarification' && parsed.status !== 'unsupported' && parsed.status !== 'invalid')
    || (parsed.coreStatus !== 'publishable' && parsed.coreStatus !== 'draft' && parsed.coreStatus !== 'attempt-limit')
    || typeof parsed.publishable !== 'boolean' || typeof parsed.mayCorrect !== 'boolean'
    || (parsed.schemaFamily !== 'v2' && parsed.schemaFamily !== 'v3' && parsed.schemaFamily !== 'unknown')
    || !isCandidateAreaArray(parsed.affectedAreas) || !isStringArray(parsed.unsupportedPaths) || !isStringArray(parsed.reasons)
    || !isInventory(parsed.draft) || (parsed.validation !== null && !isRecord(parsed.validation))) {
    throw new Error('validate40 private state has an invalid shape.');
  }
  return parsed as unknown as Validate40PrivateState;
}

function readPrivateReconcileResult(context: mls.msg.ExecutionContext): Reconcile30PrivateState {
  const matches = getAllSteps(context.task?.iaCompressed?.nextSteps).filter((item): item is mls.msg.AIResultStep =>
    item.type === 'result' && item.status === 'completed' && item.planning?.planId === 'reconcile30-private-result');
  if (matches.length !== 1) throw new Error('Expected exactly one completed private reconcile30 result.');
  const state = parseReconcile30PrivateState(matches[0].result);
  if (state.status !== 'ready') throw new Error('validate40 requires a ready private reconcile30 result.');
  return state;
}

function assertReconcileStateIntegrity(
  state: Reconcile30PrivateState,
  snapshot: ReviewEntrySnapshot,
  invocation: ReviewInvocation,
  taskState: ReviewTaskState,
): void {
  if (state.project !== snapshot.project || state.moduleName !== snapshot.moduleName || state.baseId !== snapshot.baseId
    || state.changeId !== snapshot.changeId || state.revisionId !== snapshot.revisionId
    || state.requestRevision !== snapshot.requestRevision || invocation.project !== snapshot.project
    || invocation.moduleName !== snapshot.moduleName || invocation.baseId !== snapshot.baseId
    || invocation.originalL4Path !== snapshot.originalL4Path || invocation.temporaryL4Path !== snapshot.temporaryL4Path
    || invocation.request !== snapshot.request
    || (invocation.expectedRevisionId !== undefined && invocation.expectedRevisionId !== snapshot.revisionId)) {
    throw new Error('reconcile30 private result identity differs from the frozen entry snapshot.');
  }
  if (!sameJson(state.originalHashes, snapshot.originalHashes) || !sameJson(state.candidateHashes, snapshot.candidateHashes)
    || state.validationContextHash !== taskState.validationContextHash
    || !sameJson(state.correctionState, correctionStateOf(taskState))) {
    throw new Error('reconcile30 private validation state was altered or is stale.');
  }
  const affected = validate40AffectedAreas(state.base, state.draft);
  const changedPaths = changedPathsOf(state.base, state.draft);
  if (!sameJson(affected.areas, state.directAreas) || !sameJson(changedPaths, state.changedPaths)) {
    throw new Error('reconcile30 private result does not match its base and draft.');
  }
}

function buildPrivateState(reconciled: Reconcile30PrivateState, result: Validate40Result): Validate40PrivateState {
  const mappedStatus = classify(result);
  const state: Validate40PrivateState = {
    schemaVersion: VALIDATE40_PRIVATE_STATE_VERSION,
    sourceReconcileSchemaVersion: reconciled.schemaVersion,
    project: reconciled.project,
    moduleName: reconciled.moduleName,
    baseId: reconciled.baseId,
    changeId: reconciled.changeId,
    revisionId: reconciled.revisionId,
    requestRevision: reconciled.requestRevision,
    originalHashes: { ...reconciled.originalHashes },
    candidateHashes: { ...reconciled.candidateHashes },
    validationContextHash: reconciled.validationContextHash,
    correctionState: { ...result.state },
    status: mappedStatus,
    coreStatus: result.status,
    publishable: result.publishable,
    mayCorrect: result.mayCorrect,
    schemaFamily: result.schemaFamily,
    affectedAreas: result.affectedAreas,
    unsupportedPaths: result.unsupportedPaths,
    reasons: result.reasons,
    draft: result.draft,
    validation: result.validation,
  };
  if ((mappedStatus === 'ready') !== allAffectedChecked(state)) {
    throw new Error('validate40 publishable result is inconsistent with affected gate coverage.');
  }
  return state;
}

function classify(result: Validate40Result): Validate40PrivateStatus {
  if (result.publishable && result.status === 'publishable') return 'ready';
  const affectedUnsupported = result.unsupportedPaths.length > 0 || result.affectedAreas.some(area =>
    result.validation?.coverage[area]?.status === 'unsupported');
  const operational = result.validation?.issues.some(issue =>
    issue.code === 'REVIEW_VALIDATE40_EXCEPTION' || issue.code === 'NR_GATE_EXCEPTION') || false;
  if (affectedUnsupported || operational) return 'unsupported';
  const invalid = result.status === 'attempt-limit' || result.mayCorrect
    || result.validation?.issues.some(issue => issue.severity === 'error');
  if (invalid) return 'invalid';
  return 'clarification';
}

function allAffectedChecked(state: Pick<Validate40PrivateState, 'publishable' | 'affectedAreas' | 'unsupportedPaths' | 'validation'>): boolean {
  return state.publishable && state.affectedAreas.length > 0 && state.unsupportedPaths.length === 0 && !!state.validation
    && state.affectedAreas.every(area => state.validation!.coverage[area].status === 'checked')
    && !state.validation.issues.some(issue => issue.severity === 'error');
}

function changedPathsOf(base: Record<string, unknown>, draft: Record<string, unknown>): string[] {
  return [...new Set([...Object.keys(base), ...Object.keys(draft)])].sort()
    .filter(path => stableStringifyTobe(base[path]) !== stableStringifyTobe(draft[path]));
}

function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
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

function isInventory(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Object.values(value).every(isRecord);
}

function isHashMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(hash => typeof hash === 'string' && hash.startsWith('sha256:'));
}

function isCorrectionState(value: unknown): value is Validate40CorrectionState {
  return isRecord(value) && Object.keys(value).length === 2 && typeof value.requestKey === 'string' && value.requestKey.length > 0
    && Number.isSafeInteger(value.correctionAttemptsUsed) && Number(value.correctionAttemptsUsed) >= 0
    && Number(value.correctionAttemptsUsed) <= 3;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

const CANDIDATE_AREAS = new Set<CandidateArea>([
  'module', 'journeys', 'ontologyAssembly', 'ontologyEntities', 'rules', 'workflows', 'access', 'integration', 'oracle',
]);

function isCandidateAreaArray(value: unknown): value is CandidateArea[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && CANDIDATE_AREAS.has(item as CandidateArea));
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function sha256(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
