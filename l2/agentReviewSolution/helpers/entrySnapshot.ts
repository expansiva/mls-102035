/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/entrySnapshot.ts" enhancement="_blank" />

import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import { fileExists, readSourceText } from '/_102035_/l2/solution/fs.js';
import { readActiveL4Change, readL4Release, readL4Revision, originalL4FileInfo, type L4CandidateManifest, type L4ChangeRecord, type L4HashMap, type L4ReleaseManifest } from '/_102035_/l2/newRelease/helpers/moduleRevision.js';
import { readChangeRequest } from '/_102035_/l2/newRelease/helpers/revisionSelection.js';
import { normalizeTobeArtifactPath, tobeArtifactFileInfo } from '/_102035_/l2/newRelease/tobe.js';
import type { ReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';

export interface ReviewEntrySnapshot {
  project: number;
  moduleName: string;
  originalL4Path: string;
  temporaryL4Path: string;
  request: string;
  baseId: string;
  changeId: string;
  revisionId: string;
  requestRevision: number;
  originalHashes: L4HashMap;
  candidateHashes: L4HashMap;
  changedPaths: string[];
}

export interface ReviewInventories {
  snapshot: ReviewEntrySnapshot;
  persistedRequest: { revision: number; request: string };
  base: Record<string, unknown>;
  candidate: Record<string, unknown>;
}

export interface ReviewInventoryRuntime {
  readSnapshot(invocation: ReviewInvocation): Promise<ReviewEntrySnapshot>;
  readRequest(project: number, moduleName: string): ReturnType<typeof readChangeRequest>;
  readOriginalSource(snapshot: ReviewEntrySnapshot, path: string): Promise<string>;
  readCandidateSource(snapshot: ReviewEntrySnapshot, path: string): Promise<string>;
}

function sameMap(left: L4HashMap, right: L4HashMap): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function assertReviewSnapshotMatches(expected: ReviewEntrySnapshot, actual: ReviewEntrySnapshot): void {
  if (expected.project !== actual.project || expected.moduleName !== actual.moduleName
    || expected.originalL4Path !== actual.originalL4Path || expected.temporaryL4Path !== actual.temporaryL4Path
    || expected.request !== actual.request || expected.baseId !== actual.baseId || expected.changeId !== actual.changeId
    || expected.revisionId !== actual.revisionId || expected.requestRevision !== actual.requestRevision
    || !sameMap(expected.originalHashes, actual.originalHashes) || !sameMap(expected.candidateHashes, actual.candidateHashes)
    || !sameStrings(expected.changedPaths, actual.changedPaths)) {
    throw new Error('L4 revision conflict: candidate changed after the review task was created.');
  }
}

export function reviewSnapshotFromContext(context: mls.msg.ExecutionContext): ReviewEntrySnapshot {
  const raw = context.task?.iaCompressed?.longMemory?.entrySnapshot;
  if (typeof raw !== 'string') throw new Error('Review entry snapshot is missing from the task.');
  let snapshot: unknown;
  try { snapshot = JSON.parse(raw); }
  catch { throw new Error('Review entry snapshot is invalid.'); }
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Review entry snapshot is invalid.');
  }
  return snapshot as ReviewEntrySnapshot;
}

/** Pure identity/integrity decision; storage is injected by readReviewEntrySnapshot. */
export function freezeReviewEntry(
  invocation: ReviewInvocation,
  change: L4ChangeRecord | null,
  release: L4ReleaseManifest | null,
  revision: L4CandidateManifest | null,
  temporaryHashes: L4HashMap,
): ReviewEntrySnapshot {
  if (!change || change.project !== invocation.project || change.moduleName !== invocation.moduleName || change.baseId !== invocation.baseId) {
    throw new Error('The selected module has no matching active change.');
  }
  if (!change.activeRevisionId) throw new Error('Save the request to seal a candidate revision before review.');
  if (invocation.expectedRevisionId !== undefined && invocation.expectedRevisionId !== change.activeRevisionId) {
    throw new Error('L4 revision conflict: reload before reviewing.');
  }
  if (!release || release.project !== invocation.project || release.moduleName !== invocation.moduleName || release.baseId !== invocation.baseId) {
    throw new Error('Captured L4 base is missing or incomplete.');
  }
  if (!revision || revision.project !== invocation.project || revision.moduleName !== invocation.moduleName
    || revision.changeId !== change.changeId || revision.baseId !== change.baseId || revision.revisionId !== change.activeRevisionId
    || revision.requestRevision !== change.requestRevision) {
    throw new Error('Candidate snapshot is missing, stale or incomplete.');
  }
  if (!sameMap(release.files, revision.files) && Object.keys(release.files).sort().join('|') !== Object.keys(revision.files).sort().join('|')) {
    throw new Error('Candidate source inventory differs from the captured base.');
  }
  if (!sameMap(revision.files, temporaryHashes)) throw new Error('Temporary L4 bytes differ from the selected revision; save and retry.');
  return {
    project: invocation.project, moduleName: invocation.moduleName,
    originalL4Path: invocation.originalL4Path, temporaryL4Path: invocation.temporaryL4Path,
    request: invocation.request, baseId: change.baseId, changeId: change.changeId,
    revisionId: change.activeRevisionId, requestRevision: change.requestRevision,
    originalHashes: { ...release.files }, candidateHashes: { ...revision.files }, changedPaths: [...revision.changedPaths],
  };
}

async function sha256(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** Read-only. Both path families are resolved by mr_01 helpers for the explicit project/module. */
export async function readReviewEntrySnapshot(invocation: ReviewInvocation): Promise<ReviewEntrySnapshot> {
  const { project, moduleName, baseId } = invocation;
  const change = await readActiveL4Change(project, moduleName);
  if (!change || change.baseId !== baseId || !change.activeRevisionId) {
    return freezeReviewEntry(invocation, change, null, null, {});
  }
  const release = await readL4Release(project, moduleName, baseId);
  const revision = await readL4Revision(project, moduleName, change.changeId, change.activeRevisionId);
  if (!release || !revision) return freezeReviewEntry(invocation, change, release, revision, {});
  const temporaryHashes: L4HashMap = {};
  for (const rawPath of Object.keys(release.files)) {
    const path = normalizeTobeArtifactPath(rawPath);
    const original = originalL4FileInfo(project, moduleName, baseId, path);
    const temporary = tobeArtifactFileInfo(project, moduleName, path, 'tobe');
    if (!fileExists(original) || !fileExists(temporary)) throw new Error(`Missing L4 artifact: ${path}`);
    temporaryHashes[path] = await sha256(await readSourceText(temporary));
  }
  const root = `${moduleName}/tobe/plan`;
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.status === 'deleted' || file.project !== project || file.level !== 4 || file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    if (folder !== root && !folder.startsWith(`${root}/`)) continue;
    const relative = `${folder === root ? '' : `${folder.slice(root.length + 1)}/`}${file.shortName}${file.extension}`;
    const path = normalizeTobeArtifactPath(relative);
    if (!(path in release.files)) throw new Error(`Unexpected temporary L4 artifact: ${path}`);
  }
  return freezeReviewEntry(invocation, change, release, revision, temporaryHashes);
}

const reviewInventoryRuntime: ReviewInventoryRuntime = {
  readSnapshot: readReviewEntrySnapshot,
  readRequest: readChangeRequest,
  readOriginalSource: (snapshot, path) => readSourceText(originalL4FileInfo(
    snapshot.project, snapshot.moduleName, snapshot.baseId, normalizeTobeArtifactPath(path),
  )),
  readCandidateSource: (snapshot, path) => readSourceText(tobeArtifactFileInfo(
    snapshot.project, snapshot.moduleName, normalizeTobeArtifactPath(path), 'tobe',
  )),
};

/**
 * Read the exact base/candidate pair bound to the task. The second snapshot read rejects a
 * revision or byte change that races the inventory read. No storage is mutated.
 */
export async function readReviewInventories(
  invocation: ReviewInvocation,
  runtime: ReviewInventoryRuntime = reviewInventoryRuntime,
): Promise<ReviewInventories> {
  const before = await runtime.readSnapshot(invocation);
  const stored = await runtime.readRequest(before.project, before.moduleName);
  if (!stored || stored.changeId !== before.changeId || stored.revisionId !== before.revisionId
    || stored.text !== before.request) {
    throw new Error('Review request differs from the persisted candidate revision.');
  }
  const base: Record<string, unknown> = {};
  const candidate: Record<string, unknown> = {};
  for (const rawPath of Object.keys(before.originalHashes).sort()) {
    const path = normalizeTobeArtifactPath(rawPath);
    const [baseSource, candidateSource] = await Promise.all([
      runtime.readOriginalSource(before, path),
      runtime.readCandidateSource(before, path),
    ]);
    if (await sha256(baseSource) !== before.originalHashes[path]) {
      throw new Error(`Captured L4 base bytes changed without a matching release manifest: ${path}`);
    }
    if (await sha256(candidateSource) !== before.candidateHashes[path]) {
      throw new Error(`Temporary L4 bytes changed without a matching candidate revision: ${path}`);
    }
    const baseArtifact = parseNs4ClassicDefsSource<unknown>(baseSource);
    const candidateArtifact = parseNs4ClassicDefsSource<unknown>(candidateSource);
    if (!baseArtifact || typeof baseArtifact !== 'object' || Array.isArray(baseArtifact)
      || !candidateArtifact || typeof candidateArtifact !== 'object' || Array.isArray(candidateArtifact)) {
      throw new Error(`Invalid L4 artifact: ${path}`);
    }
    base[path] = baseArtifact;
    candidate[path] = candidateArtifact;
  }
  const after = await runtime.readSnapshot(invocation);
  assertReviewSnapshotMatches(before, after);
  return {
    snapshot: after,
    persistedRequest: { revision: after.requestRevision, request: stored.text },
    base,
    candidate,
  };
}
