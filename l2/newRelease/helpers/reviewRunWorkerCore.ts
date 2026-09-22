/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunWorkerCore.ts" enhancement="_blank" />

import type {
  ReviewStudioHost,
  ReviewWorkerClaim,
  ReviewWorkerClaimInput,
  ReviewWorkerExecution,
  ReviewWorkerIdentity,
  ReviewWorkerTransport,
} from './reviewRunWorker.js';

export type ReviewWorkerDriveResult<Run> =
  | { state: 'idle' }
  | { state: 'running'; claim: ReviewWorkerClaim; execution: ReviewWorkerExecution }
  | { state: 'reported'; claim: ReviewWorkerClaim; execution: ReviewWorkerExecution | null; run: Run };

/** One bounded worker tick. The caller schedules later ticks; this function never polls forever. */
export async function driveReviewRunWorker<Run>(
  transport: ReviewWorkerTransport<Run>,
  host: ReviewStudioHost,
  input: ReviewWorkerClaimInput,
): Promise<ReviewWorkerDriveResult<Run>> {
  const claim = await transport.claim(input);
  if (!claim) return { state: 'idle' };
  assertClaimMatchesInput(claim, input);

  let execution: ReviewWorkerExecution;
  try {
    execution = await host.startOrGet(claim);
    assertExecutionMatchesClaim(execution, claim);
  } catch {
    const run = await reportProgress(transport, input, claim, {
      status: 'failed', executions: [], errorCode: 'review-run.worker_start_failed', fallbackUsed: false,
    });
    return { state: 'reported', claim, execution: null, run };
  }
  let progress;
  try {
    progress = await host.observe(claim, execution);
  } catch {
    const failedExecution = { ...execution, status: 'failed' as const, updatedAt: new Date().toISOString() };
    const run = await reportProgress(transport, input, claim, {
      status: 'failed', executions: [failedExecution], errorCode: 'review-run.worker_observe_failed', fallbackUsed: false,
    });
    return { state: 'reported', claim, execution: failedExecution, run };
  }
  if (!progress) return { state: 'running', claim, execution };

  const run = await reportProgress(transport, input, claim, progress);
  return { state: 'reported', claim, execution, run };
}

function reportProgress<Run>(
  transport: ReviewWorkerTransport<Run>,
  input: ReviewWorkerClaimInput,
  claim: ReviewWorkerClaim,
  progress: Parameters<ReviewWorkerTransport<Run>['report']>[0]['progress'],
): Promise<Run> {
  return transport.report({
    ...identityOf(input), workerId: claim.workerId, claimId: claim.claimId,
    phase: claim.phase, attempt: claim.attempt, commandHash: claim.commandHash,
    canonicalSnapshotHash: claim.canonicalSnapshotHash,
    ...(input.pipelineSnapshotHash ? { pipelineSnapshotHash: input.pipelineSnapshotHash } : {}),
    progress,
  });
}

function identityOf(input: ReviewWorkerClaimInput): ReviewWorkerIdentity {
  const {
    userId, project, moduleName, changeId, inputRevisionId, inputSnapshotHash,
    baseId, requestRevision, requestHash, runId,
  } = input;
  return { userId, project, moduleName, changeId, inputRevisionId, inputSnapshotHash, baseId, requestRevision, requestHash, runId };
}

function assertClaimMatchesInput(claim: ReviewWorkerClaim, input: ReviewWorkerClaimInput): void {
  if (claim.runId !== input.runId || claim.workerId !== input.workerId
    || claim.canonicalSnapshotHash !== input.canonicalSnapshotHash
    || claim.attempt < 1 || !claim.command.trim() || !claim.claimId) {
    throw new Error('review-worker.claim_mismatch');
  }
}

function assertExecutionMatchesClaim(execution: ReviewWorkerExecution, claim: ReviewWorkerClaim): void {
  const expectedAgent = claim.phase === 'review' ? 'agentReviewSolution' : 'agentPlannerL4';
  if (execution.agentName !== expectedAgent || execution.attempt !== claim.attempt
    || !execution.taskId || !execution.threadId) {
    throw new Error('review-worker.execution_mismatch');
  }
}
