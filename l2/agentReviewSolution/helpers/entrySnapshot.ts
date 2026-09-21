/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/entrySnapshot.ts" enhancement="_blank" />

import { fileExists, readSourceText } from '/_102035_/l2/solution/fs.js';
import { readActiveL4Change, readL4Release, readL4Revision, originalL4FileInfo, type L4CandidateManifest, type L4ChangeRecord, type L4HashMap, type L4ReleaseManifest } from '/_102035_/l2/newRelease/helpers/moduleRevision.js';
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

function sameMap(left: L4HashMap, right: L4HashMap): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
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
