/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRun.ts" enhancement="_blank" />

import type { Finalize50PrivateResult } from '/_102035_/l2/agentReviewSolution/steps/finalize50/agentFinalize50.js';
import type { CandidateResultRef } from './candidateGateway.js';

export const REVIEW_RUN_SCHEMA = '2026-09-21-review-run-v4' as const;
export type CanonicalSha256 = `sha256:${string}`;

export type ReviewRunStatus = 'planning' | 'running' | 'ready' | 'failed' | 'disputed';
export type ReviewRunPhase = 'reviewing' | 'planning' | 'finalizing';

export interface ReviewRunBinding {
  project: number;
  moduleName: string;
  changeId: string;
  inputRevisionId: string;
  inputRevisionNumber: number;
  inputSnapshotHash: CanonicalSha256;
  baseId: string;
  requestRevision: number;
  requestHash: CanonicalSha256;
  originalL4Path: string;
  temporaryL4Path: string;
}

export type ReviewRunCreateBinding = Omit<ReviewRunBinding, 'requestHash'>;

export interface ReviewCandidateTerminalEvidence {
  finalize50: Finalize50PrivateResult;
  result: CandidateResultRef;
  /** Exact metadata of the CandidateSnapshot that finalize50 published. */
  snapshotArtifacts: Array<{ path: string; sha256: string }>;
}

export interface ReviewRunOutputRef {
  kind: 'finalize50-candidate-result';
  finalize50: Finalize50PrivateResult;
  result: CandidateResultRef;
  snapshotArtifacts: Array<{ path: string; sha256: string }>;
  canonical: {
    outputSnapshotHash: CanonicalSha256;
    resultHash: CanonicalSha256;
    traceHash: CanonicalSha256;
  };
}

export interface ReviewRunRecord {
  schemaVersion: typeof REVIEW_RUN_SCHEMA;
  binding: ReviewRunBinding;
  request: string;
  runId: string;
  requestId: string;
  status: ReviewRunStatus;
  phase: ReviewRunPhase;
  /** Orthogonal archive marker: once true it never returns to false. */
  superseded: boolean;
  storeRevision: number;
  attemptsUsed: number;
  taskId: string | null;
  threadId: string | null;
  output: ReviewRunOutputRef | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAgentInvocation {
  agentName: 'agentReviewSolution';
  project: number;
  runId: string;
  requestId: string;
  input: {
    moduleName: string;
    originalL4Path: string;
    temporaryL4Path: string;
    request: string;
    expectedRevisionId: string;
  };
  prompt: string;
}

export const REVIEW_READINESS_REQUIREMENTS = [
  'execCandidateRoute', 'cbeCandidateContract', 'candidateWorkspace', 'plannerHandoff', 'writeFence',
] as const;
export type ReviewReadinessRequirement = typeof REVIEW_READINESS_REQUIREMENTS[number];
export type ReviewReadinessProof = Partial<Record<ReviewReadinessRequirement, { verified: true; evidence: string }>>;
export interface ReviewReadinessResult { ready: boolean; missing: ReviewReadinessRequirement[]; }

export type ReviewTaskStatus = 'queued' | 'running' | 'completed' | 'failed';
export type ReviewObservedPhase = 'reviewing' | 'planning' | 'finalizing';
export interface ReviewTerminalObservation {
  currentRevisionId: string;
  taskStatus: ReviewTaskStatus;
  phase: ReviewObservedPhase;
  /** Studio/messages task used only to reattach the execution channel. */
  channelTaskId?: string;
  /** Studio/messages thread used only to reattach the execution channel. */
  channelThreadId?: string;
  /** CandidateResultManifest.runId observed from the same terminal channel event. */
  resultRunId?: string;
  disputed?: boolean;
  finalize50?: Finalize50PrivateResult;
  candidateResult?: Omit<ReviewCandidateTerminalEvidence, 'finalize50'>;
  errorCode?: string;
}
export interface ReviewTerminalDecision {
  status: ReviewRunStatus;
  phase: ReviewRunPhase;
  superseded: boolean;
  output: ReviewRunOutputRef | null;
  errorCode: string | null;
}

const TOKEN = /^[A-Za-z0-9_-]{1,120}$/u;
const MODULE = /^[a-z][A-Za-z0-9]{0,59}$/u;
const BARE_HASH = /^[a-f0-9]{64}$/u;
const CANONICAL_HASH = /^sha256:[a-f0-9]{64}$/u;
const CORE_PATHS = [
  'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
] as const;
const MAX_ATTEMPTS = 3;
const STATUSES = new Set<ReviewRunStatus>([
  'planning', 'running', 'ready', 'failed', 'disputed',
]);
const PHASES = new Set<ReviewRunPhase>(['reviewing', 'planning', 'finalizing']);

function isToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN.test(value);
}

function isBareHash(value: unknown): value is string {
  return typeof value === 'string' && BARE_HASH.test(value);
}

function requireToken(value: string, label: string): void {
  if (!isToken(value)) throw new Error(`review-run.invalid_${label}`);
}

function requireCanonicalHash(value: string, label: string): asserts value is CanonicalSha256 {
  if (typeof value !== 'string' || !CANONICAL_HASH.test(value)) throw new Error(`review-run.invalid_${label}`);
}

function requirePositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error(`review-run.invalid_${label}`);
}

function requireNullableRef(value: unknown, label: string): asserts value is string | null {
  if (value !== null && (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 256)) {
    throw new Error(`review-run.invalid_${label}`);
  }
}

function compareCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Stable JSON used only for equality; wire hashes use their real contract order below. */
export function stableCanonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableCanonicalJson).join(',')}]`;
  if (!isRecord(value)) throw new Error('review-run.noncanonical_value');
  return `{${Object.keys(value).sort(compareCodeUnit).map(key => `${JSON.stringify(key)}:${stableCanonicalJson(value[key])}`).join(',')}}`;
}

function stableEqual(left: unknown, right: unknown): boolean {
  return stableCanonicalJson(left) === stableCanonicalJson(right);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  }
  return value;
}

async function bareSha256(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function canonicalSha256(source: string): Promise<CanonicalSha256> {
  return `sha256:${await bareSha256(source)}`;
}

export function canonicalFromBareSha256(value: string): CanonicalSha256 {
  if (!BARE_HASH.test(value)) throw new Error('review-run.invalid_bare_hash');
  return `sha256:${value}`;
}

function bareFromCanonical(value: CanonicalSha256): string {
  requireCanonicalHash(value, 'canonical_hash');
  return value.slice('sha256:'.length);
}

export function reviewRunKey(binding: Pick<ReviewRunBinding, 'project' | 'moduleName' | 'changeId' | 'inputRevisionId'>): string {
  if (!Number.isSafeInteger(binding.project) || binding.project <= 0 || !MODULE.test(binding.moduleName)) {
    throw new Error('review-run.invalid_scope');
  }
  requireToken(binding.changeId, 'change_id');
  requireToken(binding.inputRevisionId, 'revision_id');
  return `review-runs/${binding.project}/${binding.moduleName}/${binding.changeId}/${binding.inputRevisionId}`;
}

/** Clones and freezes every caller-owned byte before hashing yields. */
export async function createReviewRun(
  binding: ReviewRunCreateBinding,
  identity: { runId: string; requestId: string; now: string },
  request: string,
): Promise<ReviewRunRecord> {
  const fixed = deepFreeze(structuredClone({ binding, identity, request }));
  reviewRunKey(fixed.binding);
  requireToken(fixed.identity.runId, 'run_id');
  requireToken(fixed.identity.requestId, 'request_id');
  requireToken(fixed.binding.baseId, 'base_id');
  requireCanonicalHash(fixed.binding.inputSnapshotHash, 'input_hash');
  const exactRequest = fixed.request;
  if (!exactRequest || exactRequest !== exactRequest.trim() || !fixed.identity.now) {
    throw new Error('review-run.invalid_request');
  }
  if (fixed.binding.originalL4Path !== `l4/${fixed.binding.moduleName}/pipeline/releases/${fixed.binding.baseId}/l4`
    || fixed.binding.temporaryL4Path !== `l4/${fixed.binding.moduleName}/tobe/plan`) {
    throw new Error('review-run.invalid_l4_reference');
  }
  if (!Number.isSafeInteger(fixed.binding.inputRevisionNumber) || fixed.binding.inputRevisionNumber < 1
    || !Number.isSafeInteger(fixed.binding.requestRevision) || fixed.binding.requestRevision < 1) {
    throw new Error('review-run.invalid_revision');
  }
  const requestHash = await canonicalSha256(exactRequest);
  return {
    schemaVersion: REVIEW_RUN_SCHEMA,
    binding: { ...structuredClone(fixed.binding), requestHash },
    request: exactRequest,
    runId: fixed.identity.runId,
    requestId: fixed.identity.requestId,
    status: 'planning',
    phase: 'reviewing',
    superseded: false,
    storeRevision: 1,
    attemptsUsed: 0,
    taskId: null,
    threadId: null,
    output: null,
    errorCode: null,
    createdAt: fixed.identity.now,
    updatedAt: fixed.identity.now,
  };
}

export async function verifyReviewRunDraft(run: ReviewRunRecord): Promise<void> {
  await verifyReviewRunRecord(run);
  if (run.status !== 'planning' || run.phase !== 'reviewing' || run.superseded || run.storeRevision !== 1
    || run.attemptsUsed !== 0 || run.taskId !== null || run.threadId !== null || run.output !== null
    || run.errorCode !== null || run.createdAt !== run.updatedAt) {
    throw new Error('review-run.invalid_draft');
  }
}

export function reviewRunBindingEquals(left: ReviewRunBinding, right: ReviewRunBinding): boolean {
  return left.project === right.project && left.moduleName === right.moduleName && left.changeId === right.changeId
    && left.inputRevisionId === right.inputRevisionId && left.inputRevisionNumber === right.inputRevisionNumber
    && left.inputSnapshotHash === right.inputSnapshotHash && left.baseId === right.baseId
    && left.requestRevision === right.requestRevision && left.requestHash === right.requestHash
    && left.originalL4Path === right.originalL4Path && left.temporaryL4Path === right.temporaryL4Path;
}

/** Pure builder for the exact text persisted and hashed by createReviewRun. */
export function buildReviewAgentInvocation(run: ReviewRunRecord): ReviewAgentInvocation {
  const input = {
    moduleName: run.binding.moduleName,
    originalL4Path: run.binding.originalL4Path,
    temporaryL4Path: run.binding.temporaryL4Path,
    request: run.request,
    expectedRevisionId: run.binding.inputRevisionId,
  };
  return {
    agentName: 'agentReviewSolution', project: run.binding.project, runId: run.runId, requestId: run.requestId,
    input, prompt: `@@agentReviewSolution ${JSON.stringify(input)}`,
  };
}

export function evaluateReviewReadiness(proof: ReviewReadinessProof = {}): ReviewReadinessResult {
  const missing = REVIEW_READINESS_REQUIREMENTS.filter(key => {
    const item = proof[key];
    return !item || item.verified !== true || !item.evidence.trim();
  });
  return { ready: missing.length === 0, missing };
}

function normalizedArtifacts(artifacts: readonly { path: string; sha256: string }[]): Array<{ path: string; sha256: string }> {
  return artifacts.map(item => ({ path: item.path, sha256: item.sha256 })).sort((left, right) => compareCodeUnit(left.path, right.path));
}

async function candidateManifestBareHash(result: CandidateResultRef): Promise<string> {
  const manifest = result.manifest;
  const normalized = {
    runId: manifest.runId,
    taskId: manifest.taskId,
    status: manifest.status,
    outputSnapshotHash: manifest.outputSnapshotHash,
    artifacts: normalizedArtifacts(manifest.artifacts),
    traceHash: manifest.traceHash,
  };
  return bareSha256(JSON.stringify(normalized));
}

async function validateTerminalEvidence(
  run: ReviewRunRecord,
  evidence: ReviewCandidateTerminalEvidence,
  refs: { channelTaskId: string | null; channelThreadId: string | null; resultRunId: string | null },
): Promise<ReviewRunOutputRef | null> {
  const fixed = structuredClone(evidence);
  if (!isRecord(fixed) || !isRecord(fixed.finalize50) || !isRecord(fixed.result)
    || !isRecord(fixed.result.manifest) || !isRecord(fixed.finalize50.pointer)
    || !isRecord(fixed.finalize50.correctionState) || !isRecord(fixed.finalize50.summary)
    || !Array.isArray(fixed.snapshotArtifacts) || !Array.isArray(fixed.result.manifest.artifacts)
    || !Array.isArray(fixed.finalize50.summary.changedPaths)) return null;
  const finalize = fixed.finalize50;
  const result = fixed.result;
  const manifest = result.manifest;
  const artifactShape = (item: unknown): item is { path: string; sha256: string } => isRecord(item)
    && typeof item.path === 'string' && !!item.path && item.path === item.path.trim()
    && isBareHash(item.sha256);
  if (!fixed.snapshotArtifacts.every(artifactShape) || !manifest.artifacts.every(artifactShape)
    || !finalize.summary.changedPaths.every(path => typeof path === 'string' && !!path && path === path.trim())) return null;
  const snapshotArtifacts = normalizedArtifacts(fixed.snapshotArtifacts);
  const manifestArtifacts = normalizedArtifacts(manifest.artifacts);
  const artifactPaths = new Set(snapshotArtifacts.map(item => item.path));
  const manifestPaths = new Set(manifestArtifacts.map(item => item.path));
  const changedPaths = finalize.summary.changedPaths as string[];
  const resultIdentity = /^result-([a-f0-9]{32})$/u.exec(manifest.runId);
  if (!refs.channelTaskId || !refs.channelThreadId || !refs.resultRunId
    || finalize.schemaVersion !== '2026-09-21-finalize50-private-result-v3'
    || finalize.project !== run.binding.project || finalize.moduleName !== run.binding.moduleName
    || finalize.changeId !== run.binding.changeId || finalize.inputRevisionId !== run.binding.inputRevisionId
    || !isToken(finalize.outputRevisionId) || !isBareHash(finalize.outputSnapshotHash)
    || finalize.correctionState.requestKey !== `${run.binding.changeId}/request-${run.binding.requestRevision}`
    || !Number.isSafeInteger(finalize.correctionState.correctionAttemptsUsed)
    || finalize.correctionState.correctionAttemptsUsed < 0 || finalize.correctionState.correctionAttemptsUsed > 3
    || finalize.pointer.changeId !== run.binding.changeId || finalize.pointer.revisionId !== finalize.outputRevisionId
    || finalize.pointer.snapshotHash !== finalize.outputSnapshotHash
    || !Number.isSafeInteger(finalize.pointer.revisionNumber) || finalize.pointer.revisionNumber < 1
    || (finalize.pointer.resultRevisionId !== undefined && !isToken(finalize.pointer.resultRevisionId))
    || (finalize.pointer.resultSnapshotHash !== undefined && !isBareHash(finalize.pointer.resultSnapshotHash))
    || (finalize.pointer.resultRevisionNumber !== undefined
      && (!Number.isSafeInteger(finalize.pointer.resultRevisionNumber) || finalize.pointer.resultRevisionNumber < 1))
    || (finalize.pointer.resultId !== undefined && !isToken(finalize.pointer.resultId))
    || (finalize.pointer.resultHash !== undefined && !isBareHash(finalize.pointer.resultHash))
    || result.resultRevisionId !== run.binding.inputRevisionId
    || result.resultSnapshotHash !== bareFromCanonical(run.binding.inputSnapshotHash)
    || result.resultRevisionNumber !== run.binding.inputRevisionNumber
    || manifest.runId !== refs.resultRunId || !resultIdentity
    || manifest.taskId !== `task-${resultIdentity[1]}`
    || finalize.outputRevisionId !== `review-${resultIdentity[1]}`
    || result.resultId !== manifest.runId || result.resultHash !== await candidateManifestBareHash(result)
    || manifest.status !== 'completed' || manifest.outputSnapshotHash !== finalize.outputSnapshotHash
    || !isBareHash(result.resultSnapshotHash) || !isBareHash(result.resultHash)
    || !isBareHash(manifest.outputSnapshotHash) || !isBareHash(manifest.traceHash)
    || !isToken(result.resultId) || !isToken(manifest.runId) || !isToken(manifest.taskId)
    || !Number.isSafeInteger(finalize.summary.fileCount) || finalize.summary.fileCount < 0
    || finalize.summary.fileCount !== snapshotArtifacts.length
    || !stableEqual(snapshotArtifacts, manifestArtifacts)
    || artifactPaths.size !== snapshotArtifacts.length || manifestPaths.size !== manifestArtifacts.length
    || new Set(changedPaths).size !== changedPaths.length
    || CORE_PATHS.some(path => !artifactPaths.has(path))
    || changedPaths.some(path => !artifactPaths.has(path))) return null;
  return {
    kind: 'finalize50-candidate-result', finalize50: finalize, result, snapshotArtifacts,
    canonical: {
      outputSnapshotHash: canonicalFromBareSha256(manifest.outputSnapshotHash),
      resultHash: canonicalFromBareSha256(result.resultHash),
      traceHash: canonicalFromBareSha256(manifest.traceHash),
    },
  };
}

/** No generic planner completion exists: only the exact finalize50+CBE evidence can become ready. */
export async function evaluateReviewTerminality(run: ReviewRunRecord, observation: ReviewTerminalObservation): Promise<ReviewTerminalDecision> {
  const refs = {
    channelTaskId: run.taskId ?? observation.channelTaskId ?? null,
    channelThreadId: run.threadId ?? observation.channelThreadId ?? null,
    resultRunId: observation.resultRunId ?? null,
  };
  const hasCompleteEvidence = !!observation.finalize50 && !!observation.candidateResult;
  const output = hasCompleteEvidence ? await validateTerminalEvidence(run, {
    finalize50: observation.finalize50!,
    result: observation.candidateResult!.result,
    snapshotArtifacts: observation.candidateResult!.snapshotArtifacts,
  }, refs) : null;
  const superseded = run.superseded || observation.currentRevisionId !== run.binding.inputRevisionId;
  if (run.status === 'ready' || run.status === 'failed' || run.status === 'disputed') {
    return {
      status: run.status,
      phase: run.phase,
      superseded,
      output: run.output,
      errorCode: run.errorCode,
    };
  }
  if (observation.taskStatus === 'failed') {
    return { status: 'failed', phase: observation.phase, superseded, output: null, errorCode: observation.errorCode || 'review-run.task_failed' };
  }
  if (observation.disputed) {
    return { status: 'disputed', phase: observation.phase, superseded, output: null, errorCode: observation.errorCode || 'review-run.planner_disputed' };
  }
  if (hasCompleteEvidence && !output) {
    return { status: 'failed', phase: observation.phase, superseded, output: null, errorCode: 'review-run.invalid_terminal_result' };
  }
  if (observation.taskStatus === 'completed') {
    return output
      ? { status: 'ready', phase: 'finalizing', superseded, output, errorCode: null }
      : { status: 'running', phase: 'planning', superseded, output: null, errorCode: 'review-run.planner_result_contract_pending' };
  }
  return { status: 'running', phase: observation.phase, superseded, output: null, errorCode: null };
}

const TRANSITIONS: Record<ReviewRunStatus, readonly ReviewRunStatus[]> = {
  planning: ['planning', 'running'],
  running: ['running', 'ready', 'failed', 'disputed'],
  ready: ['ready'],
  failed: ['failed'],
  disputed: ['disputed'],
};

export function assertReviewRunUpdate(current: ReviewRunRecord, next: ReviewRunRecord): void {
  if (current.schemaVersion !== REVIEW_RUN_SCHEMA || next.schemaVersion !== REVIEW_RUN_SCHEMA
    || !reviewRunBindingEquals(current.binding, next.binding) || current.request !== next.request
    || current.runId !== next.runId || current.requestId !== next.requestId || current.createdAt !== next.createdAt) {
    throw new Error('review-run.immutable_identity_changed');
  }
  if (next.storeRevision !== current.storeRevision + 1) throw new Error('review-run.invalid_store_revision');
  if (!TRANSITIONS[current.status].includes(next.status)) throw new Error('review-run.invalid_status_transition');
  const submission = current.status === 'planning' && next.status === 'running';
  const transportRetry = current.status === 'running' && next.status === 'running'
    && current.errorCode !== null && next.errorCode === null;
  if (next.attemptsUsed !== current.attemptsUsed + (submission || transportRetry ? 1 : 0)
    || next.attemptsUsed < 0 || next.attemptsUsed > MAX_ATTEMPTS) throw new Error('review-run.invalid_attempt_counter');
  if (current.taskId !== null && next.taskId !== current.taskId) throw new Error('review-run.immutable_task_ref_changed');
  if (current.threadId !== null && next.threadId !== current.threadId) throw new Error('review-run.immutable_thread_ref_changed');
  if (current.output && (!next.output || !stableEqual(current.output, next.output))) throw new Error('review-run.immutable_output_ref_changed');
  if (current.superseded && !next.superseded) throw new Error('review-run.superseded_cleared');
  if ((next.taskId !== null && (!next.taskId.trim() || next.taskId.length > 256))
    || (next.threadId !== null && (!next.threadId.trim() || next.threadId.length > 256))
    || !next.updatedAt || (next.errorCode !== null && (!next.errorCode.trim() || next.errorCode.length > 256))) {
    throw new Error('review-run.invalid_mutable_state');
  }
  if (next.status === 'ready' && !next.output) throw new Error('review-run.ready_without_output');
  if (next.output && next.status !== 'ready') throw new Error('review-run.output_before_ready');
  if (submission && (next.output !== null || next.errorCode !== null)) throw new Error('review-run.invalid_submission_state');
  if (transportRetry && (next.output !== null || next.errorCode !== null)) throw new Error('review-run.invalid_retry_state');
}

export async function verifyReviewRunRecord(run: ReviewRunRecord): Promise<void> {
  if (!isRecord(run) || run.schemaVersion !== REVIEW_RUN_SCHEMA || !isRecord(run.binding)) {
    throw new Error('review-run.invalid_record');
  }
  const binding = run.binding;
  reviewRunKey(binding);
  requireToken(binding.baseId, 'base_id');
  requireCanonicalHash(binding.inputSnapshotHash, 'input_hash');
  requireCanonicalHash(binding.requestHash, 'request_hash');
  requirePositiveInteger(binding.inputRevisionNumber, 'input_revision_number');
  requirePositiveInteger(binding.requestRevision, 'request_revision');
  if (binding.originalL4Path !== `l4/${binding.moduleName}/pipeline/releases/${binding.baseId}/l4`
    || binding.temporaryL4Path !== `l4/${binding.moduleName}/tobe/plan`) {
    throw new Error('review-run.invalid_l4_reference');
  }
  requireToken(run.runId, 'run_id');
  requireToken(run.requestId, 'request_id');
  if (typeof run.request !== 'string' || !run.request || run.request !== run.request.trim()) {
    throw new Error('review-run.invalid_request');
  }
  if (!STATUSES.has(run.status)) throw new Error('review-run.invalid_status');
  if (!PHASES.has(run.phase) || typeof run.superseded !== 'boolean') throw new Error('review-run.invalid_phase');
  requirePositiveInteger(run.storeRevision, 'store_revision');
  if (!Number.isSafeInteger(run.attemptsUsed) || run.attemptsUsed < 0 || run.attemptsUsed > MAX_ATTEMPTS) {
    throw new Error('review-run.invalid_attempt_counter');
  }
  requireNullableRef(run.taskId, 'task_id');
  requireNullableRef(run.threadId, 'thread_id');
  requireNullableRef(run.errorCode, 'error_code');
  if (typeof run.createdAt !== 'string' || !run.createdAt
    || typeof run.updatedAt !== 'string' || !run.updatedAt) throw new Error('review-run.invalid_record_metadata');
  if ((run.status === 'planning' && run.attemptsUsed !== 0) || (run.status !== 'planning' && run.attemptsUsed < 1)) {
    throw new Error('review-run.invalid_attempt_counter');
  }
  if (run.storeRevision <= run.attemptsUsed) throw new Error('review-run.invalid_store_revision');
  if (run.status === 'planning' && (run.storeRevision !== 1 || run.taskId !== null || run.threadId !== null
    || run.output !== null || run.errorCode !== null || run.createdAt !== run.updatedAt)) {
    throw new Error('review-run.invalid_planning_draft');
  }
  if (run.status === 'running' && run.output !== null) throw new Error('review-run.invalid_running_state');
  if (run.status === 'ready' && (!run.output || !run.taskId || !run.threadId || run.errorCode !== null)) {
    throw new Error('review-run.invalid_ready_state');
  }
  if (run.output !== null && !isRecord(run.output)) throw new Error('review-run.invalid_output_ref');
  if (run.output && run.status !== 'ready') throw new Error('review-run.output_before_ready');
  if (!run.output && run.status === 'ready') throw new Error('review-run.missing_output_ref');
  if ((run.status === 'failed' || run.status === 'disputed') && (!run.errorCode || run.output)) {
    throw new Error('review-run.invalid_terminal_state');
  }
  if (await canonicalSha256(run.request) !== binding.requestHash) throw new Error('review-run.request_binding_mismatch');
  if (run.output) {
    const verified = await validateTerminalEvidence(run, {
      finalize50: run.output.finalize50, result: run.output.result, snapshotArtifacts: run.output.snapshotArtifacts,
    }, { channelTaskId: run.taskId, channelThreadId: run.threadId, resultRunId: run.output.result.manifest.runId });
    if (!verified || !stableEqual(verified, run.output)) throw new Error('review-run.invalid_output_ref');
  }
}

export async function applyReviewObservation(run: ReviewRunRecord, observation: ReviewTerminalObservation, now: string): Promise<ReviewRunRecord> {
  const fixed = structuredClone(observation);
  if (run.taskId && fixed.channelTaskId && run.taskId !== fixed.channelTaskId) throw new Error('review-run.task_binding_mismatch');
  if (run.threadId && fixed.channelThreadId && run.threadId !== fixed.channelThreadId) throw new Error('review-run.thread_binding_mismatch');
  const decision = await evaluateReviewTerminality(run, fixed);
  const next: ReviewRunRecord = {
    ...structuredClone(run), status: decision.status, phase: decision.phase, superseded: decision.superseded,
    storeRevision: run.storeRevision + 1,
    taskId: run.taskId ?? fixed.channelTaskId ?? null, threadId: run.threadId ?? fixed.channelThreadId ?? null,
    output: decision.output ?? run.output, errorCode: decision.errorCode, updatedAt: now,
  };
  assertReviewRunUpdate(run, next);
  return next;
}

export function submittingReviewRun(run: ReviewRunRecord, now: string): ReviewRunRecord {
  const next = {
    ...structuredClone(run), status: 'running' as const, phase: 'reviewing' as const,
    storeRevision: run.storeRevision + 1, attemptsUsed: run.attemptsUsed + 1,
    errorCode: null, output: null, updatedAt: now,
  };
  assertReviewRunUpdate(run, next);
  return next;
}

export function supersedeReviewRun(run: ReviewRunRecord, now: string): ReviewRunRecord {
  if (run.superseded) return structuredClone(run);
  const next = {
    ...structuredClone(run), superseded: true, storeRevision: run.storeRevision + 1, updatedAt: now,
  };
  assertReviewRunUpdate(run, next);
  return next;
}

export function recordReviewTransportFailure(run: ReviewRunRecord, code: string, now: string): ReviewRunRecord {
  if (run.status !== 'running' || !code.trim()) throw new Error('review-run.transport_failure_requires_running');
  const next = {
    ...structuredClone(run), storeRevision: run.storeRevision + 1, errorCode: code, updatedAt: now,
  };
  assertReviewRunUpdate(run, next);
  return next;
}

export function retryReviewTransport(run: ReviewRunRecord, now: string): ReviewRunRecord {
  if (run.status !== 'running' || run.errorCode === null) throw new Error('review-run.retry_requires_transport_error');
  if (run.attemptsUsed >= MAX_ATTEMPTS) throw new Error('review-run.retry_limit');
  return submittingReviewRun(run, now);
}

export function assertBoundReviewResult(
  run: ReviewRunRecord,
  expected: Pick<ReviewRunBinding, 'changeId' | 'inputRevisionId'> & { runId: string; outputSnapshotHash: CanonicalSha256 },
): ReviewRunOutputRef {
  if (run.status !== 'ready' || run.superseded || !run.output || run.runId !== expected.runId
    || run.binding.changeId !== expected.changeId || run.binding.inputRevisionId !== expected.inputRevisionId
    || run.output.canonical.outputSnapshotHash !== expected.outputSnapshotHash) {
    throw new Error('review-run.result_binding_mismatch');
  }
  return structuredClone(run.output);
}
