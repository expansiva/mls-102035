/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewStart.ts" enhancement="_blank" />

import {
  buildCandidateSnapshot,
  candidatePublish,
  candidateRead,
  type CandidatePointer,
  type CandidatePublishInput,
  type CandidateSnapshot,
  type CandidateScope,
} from './candidateGateway.js';
import { readActiveSealedL4Candidate, type L4SealedCandidateSnapshot } from './moduleRevision.js';
import type { ReviewRunStartInput } from './reviewRunWorker.js';
import { sameReviewStartSnapshot } from '../widgets/reviewModel.js';

export interface ReviewStartContext {
  project: number;
  moduleName: string;
  changeId: string | null;
  revisionId: string | null;
  request: string;
  userId: string | null;
  loaded: L4SealedCandidateSnapshot | null;
}

export interface PreparedReviewStart {
  input: ReviewRunStartInput;
  userId: string;
}

export interface ReviewStartDependencies {
  readActive?: (project: number, moduleName: string) => Promise<L4SealedCandidateSnapshot | null>;
  buildSnapshot?: (input: Parameters<typeof buildCandidateSnapshot>[0]) => Promise<CandidateSnapshot>;
  readCandidate?: (scope: CandidateScope) => Promise<{ pointer: CandidatePointer | null }>;
  publishCandidate?: (input: CandidatePublishInput) => Promise<{
    status: 'committed' | 'conflict';
    pointer: CandidatePointer | null;
  }>;
}

export async function prepareReviewStartInput(
  context: ReviewStartContext,
  dependencies: ReviewStartDependencies = {},
): Promise<PreparedReviewStart> {
  const { project, moduleName, changeId, revisionId, request, userId, loaded } = structuredClone(context);
  if (!changeId || !revisionId || !userId || !request.trim()) throw new Error('review-run.invalid_request');
  const sealed = await (dependencies.readActive ?? readActiveSealedL4Candidate)(project, moduleName);
  if (!sealed || sealed.request !== request || !sealed.manifest.requestHash
    || sealed.manifest.changeId !== changeId || sealed.manifest.revisionId !== revisionId
    || !sameReviewStartSnapshot(loaded, sealed)) {
    throw new Error('review-run.revision_mismatch');
  }
  const snapshot = await (dependencies.buildSnapshot ?? buildCandidateSnapshot)({
    baseId: sealed.manifest.baseId,
    requestRevision: sealed.manifest.requestRevision,
    request: sealed.request,
    sources: sealed.sources,
  });
  const candidate = await (dependencies.readCandidate ?? candidateRead)({ project, moduleName });
  const pointer = candidate.pointer;
  if (!pointer) {
    const published = await (dependencies.publishCandidate ?? candidatePublish)({
      project,
      moduleName,
      expectedRevisionId: null,
      requestId: `review-start-${revisionId}`,
      changeId,
      revisionId,
      snapshot,
    });
    if (published.status === 'conflict') throw new Error('review-run.hub_publish_conflict');
    if (published.status !== 'committed' || published.pointer?.revisionId !== revisionId
      || published.pointer.snapshotHash !== snapshot.hash) {
      throw new Error('review-run.hub_publish_conflict');
    }
  } else if (pointer.changeId !== changeId || pointer.revisionId !== revisionId
    || pointer.snapshotHash !== snapshot.hash) {
    throw new Error('review-run.hub_revision_differs');
  }
  return {
    userId,
    input: {
      userId,
      project,
      moduleName,
      changeId,
      inputRevisionId: revisionId,
      inputSnapshotHash: `sha256:${snapshot.hash}`,
      baseId: sealed.manifest.baseId,
      requestRevision: sealed.manifest.requestRevision,
      requestHash: sealed.manifest.requestHash as `sha256:${string}`,
    },
  };
}

/** Exact handler seam: start is unreachable when authoritative preparation refuses the click. */
export async function executePreparedReviewStart<Run>(
  prepare: () => Promise<PreparedReviewStart>,
  start: (input: ReviewRunStartInput) => Promise<Run>,
): Promise<{ prepared: PreparedReviewStart; run: Run }> {
  const prepared = await prepare();
  return { prepared, run: await start(prepared.input) };
}
