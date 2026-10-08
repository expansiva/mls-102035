/// <mls fileReference="_102035_/l2/solution/candidate/moduleImplementation.ts" enhancement="_blank" />

import { readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { readActiveL4Change, withModuleWriter } from '/_102035_/l2/solution/candidate/moduleRevision.js';

export const L4_IMPLEMENTATION_SCHEMA = '2026-10-08-nr-module-implementation-v1' as const;

export interface L4ImplementationHashes {
  menu: string;
  backend: string;
  effort: string;
}

export interface L4ImplementationRecord {
  schemaVersion: typeof L4_IMPLEMENTATION_SCHEMA;
  changeId: string;
  revisionId: string;
  acceptedBy: string;
  acceptedAt: string;
  hashes: L4ImplementationHashes;
  phases: unknown[];
}

function implementationInfo(project: number, moduleName: string, changeId: string): Ns5FileInfo {
  return { project, level: 4, folder: `${moduleName}/pipeline/changes/${changeId}`, shortName: 'implementation', extension: '.json' };
}

export async function readL4Implementation(project: number, moduleName: string): Promise<L4ImplementationRecord | null> {
  const change = await readActiveL4Change(project, moduleName);
  return change ? readJson<L4ImplementationRecord>(implementationInfo(project, moduleName, change.changeId)) : null;
}

export async function acceptL4Implementation(
  project: number,
  moduleName: string,
  input: { revisionId: string; acceptedBy: string; hashes: L4ImplementationHashes },
): Promise<L4ImplementationRecord> {
  return withModuleWriter(project, moduleName, async () => {
    const change = await readActiveL4Change(project, moduleName);
    if (!change || !input.revisionId || change.activeRevisionId !== input.revisionId || change.resultRevisionId !== input.revisionId) {
      throw new Error('l4.implementation_not_ready');
    }
    const info = implementationInfo(project, moduleName, change.changeId);
    const existing = await readJson<L4ImplementationRecord>(info);
    if (existing) {
      if (existing.revisionId !== input.revisionId
        || existing.hashes.menu !== input.hashes.menu
        || existing.hashes.backend !== input.hashes.backend
        || existing.hashes.effort !== input.hashes.effort) {
        throw new Error('l4.implementation_conflict');
      }
      return existing;
    }
    const record: L4ImplementationRecord = {
      schemaVersion: L4_IMPLEMENTATION_SCHEMA,
      changeId: change.changeId,
      revisionId: input.revisionId,
      acceptedBy: input.acceptedBy,
      acceptedAt: new Date().toISOString(),
      hashes: { ...input.hashes },
      phases: [],
    };
    await writeJson(info, record);
    return record;
  });
}
