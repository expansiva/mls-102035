/// <mls fileReference="_102035_/l2/solution/candidate/reviewStart.ts" enhancement="_blank" />

import {
  buildCandidateSnapshot,
  candidatePublish,
  candidateRead,
  type CandidatePointer,
  type CandidatePublishInput,
  type CandidateSnapshot,
  type CandidateScope,
} from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { readActiveSealedL4Candidate, type L4SealedCandidateSnapshot } from '/_102035_/l2/solution/candidate/moduleRevision.js';

/** What the review run needs to start. The same fields the New Release screen sends to the review run (l4_p4_165). */
export interface ReviewStartInput {
  userId: string;
  project: number;
  moduleName: string;
  changeId: string;
  inputRevisionId: string;
  inputSnapshotHash: `sha256:${string}`;
  baseId: string;
  requestRevision: number;
  requestHash: `sha256:${string}`;
  /** Sealed pointer revision, read from stor. */
  inputRevisionNumber: number;
  /** Exact request text that produced requestHash. No trim on the way out. */
  request: string;
  retry?: boolean;
}

export interface ReviewStartSealedRevision {
  request: string;
  sources: readonly { path: string; source: string }[];
  manifest: {
    project: number;
    moduleName: string;
    changeId: string;
    revisionId: string;
    baseId: string;
    requestRevision: number;
    requestHash?: string;
    files: Readonly<Record<string, string>>;
  };
}

function sortedEntries(record: Readonly<Record<string, string>>): Array<readonly [string, string]> {
  return Object.entries(record).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
}

/** Full fence between the snapshot rendered by preflight and the authoritative click reread. */
export function sameReviewStartSnapshot(
  loaded: ReviewStartSealedRevision | null,
  fresh: ReviewStartSealedRevision | null,
): boolean {
  if (!loaded || !fresh) return false;
  const left = loaded.manifest;
  const right = fresh.manifest;
  if (loaded.request !== fresh.request
    || left.project !== right.project || left.moduleName !== right.moduleName
    || left.changeId !== right.changeId || left.revisionId !== right.revisionId
    || left.baseId !== right.baseId || left.requestRevision !== right.requestRevision
    || left.requestHash !== right.requestHash
    || JSON.stringify(sortedEntries(left.files)) !== JSON.stringify(sortedEntries(right.files))) return false;
  const normalize = (sources: ReviewStartSealedRevision['sources']) => [...sources]
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
    .map(item => [item.path, item.source] as const);
  return JSON.stringify(normalize(loaded.sources)) === JSON.stringify(normalize(fresh.sources));
}

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
  input: ReviewStartInput;
  userId: string;
  supersededRevisionId?: string;
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
  let supersededRevisionId: string | undefined;
  let publishedPointer: CandidatePointer | null = null;
  if (!pointer || pointer.changeId !== changeId || pointer.revisionId !== revisionId
    || pointer.snapshotHash !== snapshot.hash) {
    const published = await (dependencies.publishCandidate ?? candidatePublish)({
      project,
      moduleName,
      expectedRevisionId: pointer?.revisionId ?? null,
      requestId: `review-start-${revisionId}`,
      changeId,
      revisionId,
      snapshot,
      ...(pointer ? { supersede: { changeId: pointer.changeId, revisionId: pointer.revisionId } } : {}),
    });
    if (published.status === 'conflict') throw new Error('review-run.hub_publish_conflict');
    if (published.status !== 'committed' || published.pointer?.changeId !== changeId
      || published.pointer.revisionId !== revisionId
      || published.pointer.snapshotHash !== snapshot.hash) {
      throw new Error('review-run.hub_publish_conflict');
    }
    if (pointer) {
      const prior = published.pointer.supersedes;
      if (!prior || prior.changeId !== pointer.changeId || prior.revisionId !== pointer.revisionId
        || prior.revisionNumber !== pointer.revisionNumber) throw new Error('review-run.hub_publish_conflict');
      supersededRevisionId = prior.revisionId;
    }
    publishedPointer = published.pointer;
  }
  const activePointer = pointer && pointer.changeId === changeId && pointer.revisionId === revisionId
    && pointer.snapshotHash === snapshot.hash
    ? pointer
    : publishedPointer;
  if (!activePointer || !Number.isSafeInteger(activePointer.revisionNumber) || activePointer.revisionNumber < 1
    || sealed.request.length > 65_536) {
    throw new Error('review-run.invalid_request');
  }
  return {
    userId,
    ...(supersededRevisionId ? { supersededRevisionId } : {}),
    input: {
      userId,
      project,
      moduleName,
      changeId,
      inputRevisionId: revisionId,
      inputRevisionNumber: activePointer.revisionNumber,
      inputSnapshotHash: `sha256:${snapshot.hash}`,
      baseId: sealed.manifest.baseId,
      requestRevision: sealed.manifest.requestRevision,
      requestHash: sealed.manifest.requestHash as `sha256:${string}`,
      request: sealed.request,
    },
  };
}
