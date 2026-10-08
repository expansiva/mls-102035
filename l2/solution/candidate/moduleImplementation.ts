/// <mls fileReference="_102035_/l2/solution/candidate/moduleImplementation.ts" enhancement="_blank" />

import { readJson, readSourceText, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { readActiveL4Change, withModuleWriter } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';

export const L4_IMPLEMENTATION_SCHEMA = '2026-10-08-nr-module-implementation-v1' as const;

export interface L4ImplementationPhase {
  name: 'defsL2' | 'defsL1';
  attempt: 1 | 2;
  previousAttempts?: Omit<L4ImplementationPhase, 'previousAttempts'>[];
  changedDefs?: { path: string; status: 'changed' | 'added' | 'removed' }[];
  agent: string;
  command: string;
  taskId: string;
  threadId: string;
  messageId: string;
  status: 'running' | 'done' | 'failed';
  startedAt: string;
  endedAt?: string;
  error?: string;
}

export function implementationPhaseCommand(name: L4ImplementationPhase['name'], moduleName: string): { agent: string; command: string } {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/u.test(moduleName)) throw new Error('implementation.invalid_module');
  if (name === 'defsL2') return { agent: 'agentDefsL2', command: `@@agentDefsL2 ${moduleName}` };
  if (name === 'defsL1') return { agent: 'agentDefsL1', command: `@@agentDefsL1 ${moduleName} /run` };
  throw new Error('implementation.invalid_phase');
}

export interface L4ImplementationHashes {
  changeEffort: string;
}

export interface L4ImplementationRecord {
  schemaVersion: typeof L4_IMPLEMENTATION_SCHEMA;
  changeId: string;
  revisionId: string;
  acceptedBy: string;
  acceptedAt: string;
  hashes: L4ImplementationHashes;
  phases: L4ImplementationPhase[];
}

function implementationInfo(project: number, moduleName: string, changeId: string): Ns5FileInfo {
  return { project, level: 4, folder: `${moduleName}/pipeline/changes/${changeId}`, shortName: 'implementation', extension: '.json' };
}

export async function readL4Implementation(project: number, moduleName: string): Promise<L4ImplementationRecord | null> {
  const change = await readActiveL4Change(project, moduleName);
  return change ? readJson<L4ImplementationRecord>(implementationInfo(project, moduleName, change.changeId)) : null;
}

/** Keeps the fresh read, reservation and canonical task identity in the same module writer. */
export async function withL4ImplementationWriter<T>(project: number, moduleName: string,
  work: (record: L4ImplementationRecord, save: (phase: L4ImplementationPhase) => Promise<void>) => Promise<T>,
): Promise<T> {
  return withModuleWriter(project, moduleName, async () => {
    const record = await readL4Implementation(project, moduleName);
    if (!record) throw new Error('implementation.not_accepted');
    return work(record, async phase => {
      const expected = implementationPhaseCommand(phase.name, moduleName);
      if (phase.agent !== expected.agent || phase.command !== expected.command) throw new Error('implementation.invalid_command');
      const index = record.phases.findIndex(item => item.name === phase.name);
      if (index < 0) record.phases.push({ ...phase });
      else record.phases[index] = { ...phase };
      await writeJson(implementationInfo(project, moduleName, record.changeId), record);
    });
  });
}

export async function recordL4ImplementationPhase(project: number, moduleName: string, phase: L4ImplementationPhase): Promise<L4ImplementationRecord> {
  return withL4ImplementationWriter(project, moduleName, async (record, save) => {
    await save(phase);
    return record;
  });
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
    const effortInfo: Ns5FileInfo = {
      project,
      level: 4,
      folder: `${moduleName}/pipeline/changes/${change.changeId}/revisions/${input.revisionId}/l4/pool/l4`,
      shortName: 'changeEffort',
      extension: '.json',
    };
    const stored = mls.stor.files[mls.stor.getKeyToFile(effortInfo)] as { status?: string } | undefined;
    if (!stored || stored.status === 'deleted') throw new Error('l4.implementation_not_ready');
    let source: string;
    try { source = await readSourceText(effortInfo); }
    catch { throw new Error('l4.implementation_not_ready'); }
    let value: unknown;
    try { value = JSON.parse(source); }
    catch { throw new Error('l4.implementation_not_ready'); }
    const checked = validateChangeEffort(value);
    if (!checked.ok || checked.file.module !== moduleName) throw new Error('l4.implementation_not_ready');
    if (checked.file.status === 'blocked') throw new Error('l4.implementation_blocked');
    if (checked.file.merged.regenerateDefs.length) throw new Error('l4.implementation_regenerate_unsupported');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    const hash = `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
    if (input.hashes.changeEffort !== hash) throw new Error('l4.implementation_conflict');
    const info = implementationInfo(project, moduleName, change.changeId);
    const existing = await readJson<L4ImplementationRecord>(info);
    if (existing) {
      if (existing.revisionId !== input.revisionId
        || existing.hashes.changeEffort !== hash) {
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
      hashes: { changeEffort: hash },
      phases: [],
    };
    await writeJson(info, record);
    return record;
  });
}
