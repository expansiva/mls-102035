/// <mls fileReference="_102035_/l2/newRelease/helpers/revisionSelection.ts" enhancement="_blank" />

import { readJson, readSourceText, writeSourceText } from '/_102035_/l2/solution/fs.js';
import { historicalReleaseId, type NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import {
  deactivateL4Change,
  editL4Candidate,
  originalL4FileInfo,
  prepareL4Change,
  readActiveL4Change,
  readL4Release,
  sealL4Revision,
  type L4ReleaseCatalog,
  type L4ReleaseManifest,
} from '/_102035_/l2/newRelease/helpers/moduleRevision.js';
import { normalizeTobeArtifactPath, tobeArtifactFileInfo, type Ns5TobeManifest } from '/_102035_/l2/newRelease/tobe.js';

export interface ReleaseChoice {
  version: `release:${string}`;
  baseId: string;
  createdAt: string;
  provenance: L4ReleaseManifest['provenance'];
}

export class ChangeRequestDrafts {
  private drafts = new Map<string, { text: string; saved: string }>();

  static key(project: number, moduleName: string, changeId: string | null): string {
    return `${project}/${moduleName}/${changeId ?? 'new'}`;
  }

  remember(key: string | null, text: string, saved: string): void {
    if (key && text !== saved) this.drafts.set(key, { text, saved });
  }

  restore(key: string, persisted: string): string | null {
    const draft = this.drafts.get(key);
    if (!draft) return null;
    if (draft.saved !== persisted) {
      this.drafts.delete(key);
      return null;
    }
    return draft.text;
  }

  forget(key: string | null): void {
    if (key) this.drafts.delete(key);
  }

  move(from: string, to: string): void {
    if (from === to) return;
    const draft = this.drafts.get(from);
    if (!draft) return;
    if (!this.drafts.has(to)) this.drafts.set(to, draft);
    this.drafts.delete(from);
  }
}

export function revisionsForKnob(releases: readonly ReleaseChoice[]): NewReleaseVersion[] {
  return ['asis', 'tobe', ...releases.map(release => release.version)];
}

export function selectedRevisionIndex(versions: readonly NewReleaseVersion[], selected: NewReleaseVersion): number {
  const index = versions.indexOf(selected);
  return index < 0 ? 1 : index + 1;
}

export function contextStillCurrent(
  expected: { project: number; moduleName: string; version: NewReleaseVersion },
  current: { project: number; moduleName: string; version: NewReleaseVersion },
): boolean {
  return expected.project === current.project && expected.moduleName === current.moduleName && expected.version === current.version;
}

export async function listReleaseChoices(project: number, moduleName: string): Promise<ReleaseChoice[]> {
  const catalog = await readJson<L4ReleaseCatalog>({ project, level: 4, folder: `${moduleName}/pipeline/releases`, shortName: 'index', extension: '.json' });
  const valid = await Promise.all((catalog?.releases ?? []).map(async entry => {
    const release = await readL4Release(project, moduleName, entry.baseId);
    return release ? { version: `release:${release.baseId}` as const, baseId: release.baseId, createdAt: release.createdAt, provenance: release.provenance } : null;
  }));
  return valid.filter((release): release is ReleaseChoice => release !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.baseId.localeCompare(b.baseId));
}

export async function readChangeRequest(project: number, moduleName: string): Promise<{ changeId: string; revisionId: string | null; text: string; resultCurrent: boolean } | null> {
  const change = await readActiveL4Change(project, moduleName);
  if (!change) return null;
  const stored = change.requestRevision ? await readJson<{ request: string }>({
    project, level: 4, folder: `${moduleName}/pipeline/changes/${change.changeId}/requests`,
    shortName: `request-${change.requestRevision}`, extension: '.json',
  }) : null;
  if (change.requestRevision && typeof stored?.request !== 'string') throw new Error('Change request is incomplete.');
  return {
    changeId: change.changeId,
    revisionId: change.activeRevisionId,
    text: stored?.request ?? '',
    resultCurrent: change.resultRevisionId !== null && change.resultRevisionId === change.activeRevisionId,
  };
}

export async function saveChangeRequest(
  project: number,
  moduleName: string,
  text: string,
  expectedChangeId: string | null,
  expectedRevisionId: string | null,
): Promise<{ changeId: string; revisionId: string }> {
  const legacy = await readJson<Ns5TobeManifest>({ project, level: 4, folder: `${moduleName}/tobe/plan`, shortName: 'tobe', extension: '.json' });
  const prepared = await prepareL4Change(project, moduleName, legacy);
  if ((prepared.created && expectedChangeId !== null) || (!prepared.created && prepared.change.changeId !== expectedChangeId)) {
    throw new Error('L4 change conflict: reload before saving.');
  }
  if (prepared.change.activeRevisionId !== expectedRevisionId) throw new Error('L4 revision conflict: reload before saving.');
  const revision = await sealL4Revision(project, moduleName, expectedRevisionId, text);
  return { changeId: prepared.change.changeId, revisionId: revision.revisionId };
}

/** Reuse a verified local snapshot as a new candidate relative to the current base, never as publication. */
export async function reuseHistoricalRelease(project: number, moduleName: string, version: NewReleaseVersion): Promise<string> {
  const baseId = historicalReleaseId(version);
  if (!baseId) throw new Error('Select a historical release.');
  const historical = await readL4Release(project, moduleName, baseId);
  if (!historical) throw new Error('Historical release is incomplete.');
  if (await readActiveL4Change(project, moduleName)) throw new Error('Discard the active candidate before reusing a historical release.');
  const prepared = await prepareL4Change(project, moduleName);
  const currentPaths = Object.keys(prepared.release.files).sort();
  if (JSON.stringify(Object.keys(historical.files).sort()) !== JSON.stringify(currentPaths)) {
    if (prepared.created) await deactivateL4Change(project, moduleName);
    throw new Error('Historical inventory differs from the current base; reconcile before reuse.');
  }
  const { revision } = await editL4Candidate(project, moduleName, null, prepared.change.changeId, async () => {
    for (const rawPath of currentPaths) {
      const path = normalizeTobeArtifactPath(rawPath);
      await writeSourceText(tobeArtifactFileInfo(project, moduleName, path, 'tobe'),
        await readSourceText(originalL4FileInfo(project, moduleName, baseId, path)));
    }
  });
  return revision.revisionId;
}
