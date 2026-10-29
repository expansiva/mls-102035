/// <mls fileReference="_102035_/l2/solution/candidate/moduleImplementation.ts" enhancement="_blank" />

import { readJson, readSourceText, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { readActiveL4Change, readSealedL4Candidate, withModuleWriter } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import type { ChangeEffortMerged, EffortAgentRef } from '/_102035_/l2/solution/poolPlan.js';

export const L4_IMPLEMENTATION_SCHEMA = '2026-10-08-nr-module-implementation-v1' as const;

export interface L4ImplementationPhase {
  name: string;
  attempt: 1 | 2;
  previousAttempts?: Omit<L4ImplementationPhase, 'previousAttempts'>[];
  changedDefs?: { path: string; status: 'changed' | 'added' | 'removed'; level: 1 | 2 }[];
  agent: string;
  command: string;
  taskId: string;
  threadId: string;
  messageId: string;
  status: 'running' | 'done' | 'failed';
  startedAt: string;
  endedAt?: string;
  error?: string;
  report?: string;
  /** Planner output or the immutable planning identity consumed by this phase. */
  plan?: InitialImplementationPlan;
}

export function implementationPhaseCommand(ref: EffortAgentRef, project: number, moduleName: string): EffortAgentRef {
  if (ref.agent !== 'agentAddLanguage' || !ref.command.startsWith('@@agentAddLanguage ')) throw new Error('implementation.invalid_command');
  let args: unknown;
  try { args = JSON.parse(ref.command.slice('@@agentAddLanguage '.length)); }
  catch { throw new Error('implementation.invalid_command'); }
  if (ref.command !== '@@agentAddLanguage ' + JSON.stringify(args)) throw new Error('implementation.invalid_command');
  if (!Array.isArray(args) || args.length !== 1 || !args[0] || typeof args[0] !== 'object' || Array.isArray(args[0])) throw new Error('implementation.invalid_command');
  const value = args[0] as Record<string, unknown>;
  if (Object.keys(value).sort().join(',') !== 'languages,moduleName,projectId'
    || value.projectId !== project || value.moduleName !== moduleName || !Array.isArray(value.languages)
    || !value.languages.every(language => language && typeof language === 'object' && !Array.isArray(language)
      && Object.keys(language).sort().join(',') === 'code,name'
      && typeof language.code === 'string' && typeof language.name === 'string')) throw new Error('implementation.invalid_command');
  return ref;
}

export interface MaterializeL1Request { scope: string }

/** Ordered phases from accepted maintenance effort or an initial generation plan. */
export function implementationCommands(record: Pick<L4ImplementationRecord, 'merged' | 'initial'>, project: number, moduleName: string): EffortAgentRef[] {
  if (record.initial) {
    const materialize: MaterializeL1Request = { scope: moduleName };
    return [
      ...(record.initial.replan ? [{ agent: 'agentPlannerL4', command: `@@agentPlannerL4 ${moduleName}` }] : []),
      { agent: 'agentDefsL2', command: `@@agentDefsL2 ${moduleName}` },
      { agent: 'agentDefsL1', command: `@@agentDefsL1 ${moduleName} /run` },
      { agent: 'agentMaterializeL2', command: `@@agentMaterializeL2 ${moduleName}` },
      { agent: 'agentMaterializeL1', command: '@@agentMaterializeL1 ' + JSON.stringify(materialize) },
    ];
  }
  const structural = record.merged.create.length || record.merged.regenerateDefs.length || record.merged.remove.length || record.merged.materialize.length;
  const materialize: MaterializeL1Request = { scope: moduleName };
  const commands: EffortAgentRef[] = structural ? [
    { agent: 'agentNewReleaseL2', command: `@@agentNewReleaseL2 ${moduleName}` },
    { agent: 'agentNewReleaseL1', command: `@@agentNewReleaseL1 ${moduleName}` },
    { agent: 'agentDefsL1', command: `@@agentDefsL1 ${moduleName} /run` },
    { agent: 'agentNewReleaseL1', command: `@@agentNewReleaseL1 ${moduleName} /compare` },
    { agent: 'agentMaterializeL1', command: '@@agentMaterializeL1 ' + JSON.stringify(materialize) },
  ] : [];
  return [...commands, ...record.merged.runAgents];
}

export interface L4ImplementationHashes {
  changeEffort?: string;
  plans?: InitialImplementationPlan['hashes'];
}

export interface L4ImplementationRecord {
  schemaVersion: typeof L4_IMPLEMENTATION_SCHEMA;
  changeId: string;
  revisionId: string;
  acceptedBy: string;
  acceptedAt: string;
  hashes: L4ImplementationHashes;
  /** Empty for initial generation; no maintenance effort was accepted. */
  merged: ChangeEffortMerged;
  initial?: { plan: InitialImplementationPlan; replan: boolean; promotedAt: string };
  phases: L4ImplementationPhase[];
}

export const INITIAL_PLAN_PATHS = ['pool/l2/web/menu.json', 'pool/l1/web/needs.json',
  'pool/l2/web/backend.json', 'pool/l2/web/effort.json'] as const;
export interface InitialImplementationPlan {
  project: number;
  moduleName: string;
  hashes: Record<typeof INITIAL_PLAN_PATHS[number], string>;
  l4Hashes: Record<string, string>;
  pipelines: Record<'l1' | 'l2', string>;
  fresh: boolean;
}
export interface InitialImplementationInput {
  kind: 'initial';
  revisionId: string;
  acceptedBy: string;
  plan: InitialImplementationPlan;
}

async function implementationHash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
function samePlanHashes(a: Record<string, string>, b: Record<string, string>): boolean {
  const paths = Object.keys(a).sort();
  return paths.length === Object.keys(b).length && paths.every(path => a[path] === b[path]);
}

/** Capture before promotion, which re-stamps the same source and pool bytes. */
export async function readInitialImplementationPlan(project: number, moduleName: string): Promise<InitialImplementationPlan> {
  const hashes = {} as InitialImplementationPlan['hashes'];
  const l4Hashes: Record<string, string> = {};
  const pipelines = {} as InitialImplementationPlan['pipelines'];
  const planDates: number[] = [];
  const sourceDates: number[] = [];
  const dateOf = (file: { updatedAt?: string }) => Date.parse(file.updatedAt ?? '');
  for (const path of INITIAL_PLAN_PATHS) {
    const slash = path.lastIndexOf('/');
    const info: Ns5FileInfo = { project, level: 4, folder: `${moduleName}/${path.slice(0, slash)}`,
      shortName: path.slice(slash + 1, -5), extension: '.json' };
    const file = mls.stor.files[mls.stor.getKeyToFile(info)];
    if (!file || file.status === 'deleted') throw new Error('l4.implementation_not_ready');
    const source = await readSourceText(info);
    const value = JSON.parse(source) as { moduleName?: string };
    if (!value || value.moduleName !== moduleName) throw new Error('l4.implementation_conflict');
    hashes[path] = await implementationHash(source);
    planDates.push(dateOf(file));
  }
  let thread = '';
  for (const side of ['l1', 'l2'] as const) {
    const info: Ns5FileInfo = { project, level: 4, folder: `${moduleName}/pool/${side}`, shortName: 'pipeline', extension: '.json' };
    const file = mls.stor.files[mls.stor.getKeyToFile(info)];
    if (!file || file.status === 'deleted') throw new Error('l4.implementation_not_ready');
    const source = await readSourceText(info);
    const value = JSON.parse(source) as { moduleName?: string; status?: string; thread?: string };
    if (!value || value.moduleName !== moduleName || value.status !== 'complete' || !value.thread
      || (thread && thread !== value.thread)) throw new Error('l4.implementation_not_ready');
    thread = value.thread;
    pipelines[side] = await implementationHash(source);
    planDates.push(dateOf(file));
  }
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted'
      || !(file.folder === moduleName || file.folder.startsWith(`${moduleName}/`))) continue;
    const path = `${file.folder.slice(moduleName.length + 1)}${file.folder === moduleName ? '' : '/'}${file.shortName}${file.extension}`;
    if (['pool/', 'pipeline/', 'tobe/'].some(prefix => path.startsWith(prefix))) continue;
    if (file.extension !== '.defs.ts' && !(file.extension === '.ts' && file.shortName.endsWith('.defs'))) continue;
    l4Hashes[path] = await implementationHash(await readSourceText(file));
    sourceDates.push(dateOf(file));
  }
  if (!sourceDates.length) throw new Error('l4.implementation_not_ready');
  const fresh = [...sourceDates, ...planDates].every(Number.isFinite)
    && Math.min(...planDates) >= Math.max(...sourceDates);
  return { project, moduleName, hashes, l4Hashes, pipelines, fresh };
}

async function acceptInitialImplementation(project: number, moduleName: string, input: InitialImplementationInput): Promise<L4ImplementationRecord> {
  const change = await readActiveL4Change(project, moduleName);
  if (!change || change.activeRevisionId !== input.revisionId || change.promotedRevisionId !== input.revisionId
    || !change.promotedAt || !Number.isFinite(Date.parse(change.promotedAt)) || !input.acceptedBy) throw new Error('l4.implementation_not_ready');
  const sealed = await readSealedL4Candidate(project, moduleName, change.changeId, input.revisionId);
  if (!sealed || sealed.manifest.baseId !== change.baseId) throw new Error('l4.implementation_not_ready');
  const current = await readInitialImplementationPlan(project, moduleName);
  if (input.plan.project !== project || input.plan.moduleName !== moduleName
    || !samePlanHashes(current.hashes, input.plan.hashes) || !samePlanHashes(current.pipelines, input.plan.pipelines)
    || !samePlanHashes(current.l4Hashes, sealed.manifest.files)) throw new Error('l4.implementation_conflict');
  // An edited revision cannot reuse an estimate of the base, even if promotion copied its pool.
  const replan = sealed.manifest.changedPaths.length > 0 || !input.plan.fresh
    || !samePlanHashes(input.plan.l4Hashes, sealed.manifest.files);
  const info = implementationInfo(project, moduleName, change.changeId);
  const existing = await readJson<L4ImplementationRecord>(info);
  if (existing) {
    if (existing.revisionId !== input.revisionId || !existing.initial
      || existing.initial.replan !== replan || !samePlanHashes(existing.initial.plan.hashes, current.hashes)
      || !samePlanHashes(existing.initial.plan.pipelines, current.pipelines)) throw new Error('l4.implementation_conflict');
    return existing;
  }
  const record: L4ImplementationRecord = {
    schemaVersion: L4_IMPLEMENTATION_SCHEMA, changeId: change.changeId, revisionId: input.revisionId,
    acceptedBy: input.acceptedBy, acceptedAt: new Date().toISOString(), hashes: { plans: current.hashes },
    merged: { create: [], regenerateDefs: [], remove: [], materialize: [], runAgents: [], abend: [] },
    initial: { plan: structuredClone(input.plan), replan, promotedAt: change.promotedAt }, phases: [],
  };
  await writeJson(info, record);
  return record;
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
      const index = Number(phase.name.slice('runAgents:'.length));
      if (!phase.name.startsWith('runAgents:') || !Number.isSafeInteger(index) || index < 0 || `runAgents:${index}` !== phase.name) throw new Error('implementation.invalid_phase');
      const ref = implementationCommands(record, project, moduleName)[index];
      if (!ref) throw new Error('implementation.invalid_phase');
      const expected = ref.agent === 'agentAddLanguage' ? implementationPhaseCommand(ref, project, moduleName) : ref;
      if (phase.agent !== expected.agent || phase.command !== expected.command) throw new Error('implementation.invalid_command');
      const phaseIndex = record.phases.findIndex(item => item.name === phase.name);
      if (phaseIndex < 0) record.phases.push({ ...phase });
      else record.phases[phaseIndex] = { ...phase };
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
  input: { revisionId: string; acceptedBy: string; hashes: L4ImplementationHashes; kind?: 'maintenance' } | InitialImplementationInput,
): Promise<L4ImplementationRecord> {
  return withModuleWriter(project, moduleName, async () => {
    if (input.kind === 'initial') return acceptInitialImplementation(project, moduleName, input);
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
      merged: checked.file.merged,
      phases: [],
    };
    await writeJson(info, record);
    return record;
  });
}

export async function readLatestCompletedL4Implementation(project: number, moduleName: string): Promise<L4ImplementationRecord | null> {
  const records = await Promise.all(Object.values(mls.stor.files).filter(file => file && file.project === project && file.level === 4
    && file.folder.startsWith(`${moduleName}/pipeline/changes/`) && file.shortName === 'implementation'
    && file.extension === '.json' && file.status !== 'deleted').map(file => readJson<L4ImplementationRecord>(file)));
  return records.filter((record): record is L4ImplementationRecord => !!record
    && record.schemaVersion === L4_IMPLEMENTATION_SCHEMA
    && implementationCommands(record, project, moduleName).every((_, index) => record.phases.some(phase => phase.name === `runAgents:${index}` && phase.status === 'done')))
    .sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt))[0] ?? null;
}
