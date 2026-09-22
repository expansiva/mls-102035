/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunWorker.ts" enhancement="_blank" />

export type ReviewWorkerPhase = 'review' | 'planner';
export const REVIEW_RUN_MAX_ATTEMPTS = 4;

export interface ReviewWorkerExecution {
  agentName: string;
  taskId: string;
  threadId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'disputed';
  attempt: number;
  provider: string | null;
  model: string | null;
  resultRunId: string | null;
  candidateRevisionId: string | null;
  startedAt: string;
  updatedAt: string;
}

export interface ReviewWorkerProgress {
  status: 'queued' | 'reviewing' | 'planning' | 'finalizing' | 'ready' | 'failed' | 'disputed';
  executions: ReviewWorkerExecution[];
  candidateResult?: unknown;
  plannerArtifacts?: unknown[];
  errorCode?: string | null;
  fallbackUsed?: boolean;
}

export interface PlatformReviewRun {
  runId: string;
  status: ReviewWorkerProgress['status'];
  attempt: number;
  binding: ReviewWorkerIdentity & {
    inputRevisionNumber: number;
    originalL4Path: string;
    temporaryL4Path: string;
    request?: string;
  };
  executions: ReviewWorkerExecution[];
  candidateResult: Record<string, unknown> | null;
  plannerArtifacts: unknown[];
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWorkerClaim {
  runId: string;
  project: number;
  moduleName: string;
  changeId: string;
  phase: ReviewWorkerPhase;
  attempt: number;
  claimId: string;
  workerId: string;
  command: string;
  commandHash: `sha256:${string}`;
  canonicalSnapshotHash: `sha256:${string}`;
  claimedAt: string;
  leaseExpiresAt: string;
  execution: ReviewWorkerExecution | null;
}

export interface ReviewWorkerIdentity {
  userId: string;
  project: number;
  moduleName: string;
  changeId: string;
  inputRevisionId: string;
  inputSnapshotHash: `sha256:${string}`;
  baseId: string;
  requestRevision: number;
  requestHash: `sha256:${string}`;
  runId: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type ReviewRunLookup = Pick<ReviewWorkerIdentity, 'project' | 'moduleName' | 'changeId' | 'inputRevisionId'>;

export function reviewRunLinkKey(identity: ReviewRunLookup): string {
  return `collab-new-release-review-link-v1/${identity.project}/${identity.moduleName}/${identity.changeId}/${identity.inputRevisionId}`;
}

export function reviewRunStableLinkKey(identity: Pick<ReviewRunLookup, 'project' | 'moduleName' | 'changeId'>): string {
  return `collab-new-release-review-link-v1/${identity.project}/${identity.moduleName}/${identity.changeId}`;
}

export function saveReviewRunLink(
  identity: ReviewWorkerIdentity,
  storage: KeyValueStorage = globalThis.localStorage,
  lookup: ReviewRunLookup = identity,
): void {
  const serialized = JSON.stringify(identity);
  storage.setItem(reviewRunLinkKey(lookup), serialized);
  storage.setItem(reviewRunStableLinkKey(lookup), serialized);
}

export function readReviewRunLink(
  identity: ReviewRunLookup,
  storage: KeyValueStorage = globalThis.localStorage,
): ReviewWorkerIdentity | null {
  try {
    const raw = storage.getItem(reviewRunLinkKey(identity))
      ?? storage.getItem(reviewRunStableLinkKey(identity));
    return raw ? JSON.parse(raw) as ReviewWorkerIdentity : null;
  } catch { return null; }
}

export interface ReviewWorkerClaimInput extends ReviewWorkerIdentity {
  workerId: string;
  canonicalSnapshotHash: `sha256:${string}`;
  candidateSnapshotHash?: `sha256:${string}`;
  pipelineStatus?: 'complete';
  pipelineSnapshotHash?: `sha256:${string}`;
}

export interface ReviewWorkerTransport<Run> {
  claim(input: ReviewWorkerClaimInput): Promise<ReviewWorkerClaim | null>;
  report(input: ReviewWorkerIdentity & {
    workerId: string;
    claimId: string;
    phase: ReviewWorkerPhase;
    attempt: number;
    commandHash: `sha256:${string}`;
    canonicalSnapshotHash: `sha256:${string}`;
    pipelineSnapshotHash?: `sha256:${string}`;
    progress: ReviewWorkerProgress;
  }): Promise<Run>;
}

/**
 * Studio owns the hooks. startOrGet must durably key the local task by claimId before returning;
 * a reload or lost acknowledgement therefore reattaches instead of creating another task.
 */
export interface ReviewStudioHost {
  startOrGet(claim: ReviewWorkerClaim): Promise<ReviewWorkerExecution>;
  observe(claim: ReviewWorkerClaim, execution: ReviewWorkerExecution): Promise<ReviewWorkerProgress | null>;
}

export interface ReviewRunStartInput extends Omit<ReviewWorkerIdentity, 'runId'> { retry?: boolean; }

export function outputRevisionIdForRun(run: Pick<PlatformReviewRun, 'candidateResult'>): string | null {
  const manifest = run.candidateResult?.manifest as Record<string, unknown> | undefined;
  const match = /^result-([a-f0-9]{32})$/u.exec(String(manifest?.runId || ''));
  return match ? `review-${match[1]}` : null;
}

export function reviewRunMatchesRevision(
  run: Pick<PlatformReviewRun, 'binding' | 'candidateResult'>,
  revisionId: string,
): boolean {
  return revisionId === run.binding.inputRevisionId || revisionId === outputRevisionIdForRun(run);
}

export function publishedCandidateMatchesRunRevision(
  run: Pick<PlatformReviewRun, 'binding'>,
  revisionId: string,
  candidate: unknown,
): boolean {
  const value = candidate as {
    status?: unknown;
    pointer?: Record<string, unknown> | null;
    result?: Record<string, unknown>;
  } | null;
  const pointer = value?.pointer;
  const result = value?.result;
  const manifest = result?.manifest as Record<string, unknown> | undefined;
  const match = /^result-([a-f0-9]{32})$/u.exec(String(manifest?.runId || ''));
  return value?.status === 'read' && !!pointer && !!result && !!manifest && !!match
    && pointer.changeId === run.binding.changeId
    && pointer.revisionId === revisionId
    && pointer.resultId === result.resultId
    && pointer.resultHash === result.resultHash
    && revisionId === `review-${match[1]}`
    && result.resultRevisionId === run.binding.inputRevisionId
    && result.resultSnapshotHash === run.binding.inputSnapshotHash.replace(/^sha256:/u, '')
    && result.resultRevisionNumber === run.binding.inputRevisionNumber
    && manifest.status === 'completed'
    && typeof manifest.taskId === 'string' && manifest.taskId.length > 0;
}

export function claimInputForRun(
  run: PlatformReviewRun,
  userId: string,
  workerId: string,
  canonicalSnapshotHash: `sha256:${string}`,
  candidate: { snapshotHash?: `sha256:${string}`; pipelineComplete?: boolean; pipelineSnapshotHash?: `sha256:${string}` } = {},
): ReviewWorkerClaimInput {
  return {
    userId,
    project: run.binding.project,
    moduleName: run.binding.moduleName,
    changeId: run.binding.changeId,
    inputRevisionId: run.binding.inputRevisionId,
    inputSnapshotHash: run.binding.inputSnapshotHash,
    baseId: run.binding.baseId,
    requestRevision: run.binding.requestRevision,
    requestHash: run.binding.requestHash,
    runId: run.runId,
    workerId,
    canonicalSnapshotHash,
    ...(candidate.snapshotHash ? { candidateSnapshotHash: candidate.snapshotHash } : {}),
    ...(candidate.pipelineComplete ? { pipelineStatus: 'complete' as const } : {}),
    ...(candidate.pipelineSnapshotHash ? { pipelineSnapshotHash: candidate.pipelineSnapshotHash } : {}),
  };
}


export { driveReviewRunWorker, type ReviewWorkerDriveResult } from './reviewRunWorkerCore.js';
