/// <mls fileReference="_102035_/l2/solution/candidate/tobeCompletion.ts" enhancement="_blank" />

import { implementationCommands, readL4Implementation } from '/_102035_/l2/solution/candidate/moduleImplementation.js';
import { captureConfirmedL4Release, deactivateL4Change, readActiveL4Change } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { writeJson } from '/_102035_/l2/solution/fs.js';

type FileRecord = Record<string, (mls.stor.IFileInfo & {
  getContent?: () => Promise<unknown>;
}) | undefined>;

export function listedPlanFiles(project: number, moduleName: string): mls.stor.IFileInfo[] {
  return listedTobeFolder(project, `${moduleName}/tobe/plan`);
}

export function listedCandidateFiles(project: number, moduleName: string): mls.stor.IFileInfo[] {
  return listedTobeFolder(project, `${moduleName}/tobe/candidate`);
}

export function listedTobeFolder(project: number, folder: string): mls.stor.IFileInfo[] {
  const files = mls.stor.files as FileRecord;
  const keys = new Set<string>();
  for (const [key, file] of Object.entries(files)) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.folder === folder || file.folder?.startsWith(`${folder}/`)) keys.add(key);
  }
  return [...keys].map(key => files[key]).filter((file): file is mls.stor.IFileInfo => !!file && file.status !== 'deleted');
}

export async function deleteInventory(files: mls.stor.IFileInfo[]): Promise<void> {
  if (!files.length) return;
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  for (const file of files) await deleteFile(file);
}

/**
 * Retire only the successfully applied revision, keeping its immutable history: the release is confirmed, the edited
 * version is deleted and the change goes inactive. The screen announces the update after this; a command has no one to tell.
 */
export async function completeL4Implementation(project: number, moduleName: string, changeId: string, revisionId: string, confirmedBy = ''): Promise<void> {
  await deactivateL4Change(project, moduleName, async () => {
    const active = await readActiveL4Change(project, moduleName);
    if (active?.changeId !== changeId || active.activeRevisionId !== revisionId || active.promotedRevisionId !== revisionId) {
      throw new Error('l4.implementation_conflict');
    }
    const record = await readL4Implementation(project, moduleName);
    if (!record || record.revisionId !== revisionId || !implementationCommands(record, project, moduleName).every((_, index) => record.phases.some(phase => phase.name === `runAgents:${index}` && phase.status === 'done'))) {
      throw new Error('implementation.not_complete');
    }
    const confirmedAt = new Date().toISOString();
    await captureConfirmedL4Release(project, moduleName, changeId, revisionId, active.baseId, confirmedAt, confirmedBy);
    await deleteInventory([...listedPlanFiles(project, moduleName), ...listedCandidateFiles(project, moduleName), ...listedTobeFolder(project, `${moduleName}/tobe/operations`)]);
    await writeJson({ project, level: 4, folder: `${moduleName}/pipeline/changes/${changeId}`, shortName: 'confirmation', extension: '.json' },
      { changeId, revisionId, confirmedAt, confirmedBy });
  });
}
