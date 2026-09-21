/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plCore.ts" enhancement="_blank"/>

import {
  diskFileInfo,
  displayPath,
  hostListFolder,
  listModuleFolders,
  moduleFile,
  normalizeModuleName,
  pipelineFile,
  readPipeline,
  writeJson,
  writePipeline,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import { readL5Config, writeL5Config } from '/_102035_/l2/solution/lib.js';
import {
  deletePoolMessage,
  listPoolBox,
  nextThread,
  POOL_BOXES,
  POOL_MAX_ROUND,
  readPoolMessage,
  readPoolTrace,
  tracePool,
  writePoolMessage,
  type PoolBox,
  type PoolMessage,
  type PoolTraceLine,
} from '/_102035_/l2/solution/pool.js';
import type { Ns5PipelineState } from '/_102035_/l2/solution/types.js';

export const PL_FLOW_ID = 'agentPlannerL4' as const;
export const PL_FLOW_VERSION = '2026-09-20-pl-flow-v3' as const;
export const PL_AGENT_NAME = 'agentPlannerL4' as const;

export const PL_STEP_IDS = ['entry10', 'dispatch20', 'loop30'] as const;
export type PlStepId = (typeof PL_STEP_IDS)[number];

export const PL_PLANNER_PROJECTS = ['102020', '102021'] as const;
export const PL_L2_AGENT = 'agentPlannerL2' as const;
export const PL_L1_AGENT = 'agentPlannerL1' as const;
export const PL_EXCLUDED_TOP = ['pipeline', 'tobe', 'pool'] as const;
export const PL_DISPATCH_BODY =
  'Evaluate and dispatch. The recipient decides what to do with these artifacts.';

export const PL_STEP_TITLES: Record<PlStepId, string> = {
  entry10: 'Entry',
  dispatch20: 'Dispatch',
  loop30: 'Loop',
};

export const PL_STEP_DEPENDS_ON: Record<PlStepId, readonly string[]> = {
  entry10: [],
  dispatch20: ['entry10-done'],
  loop30: ['dispatch20-done'],
};

const FAST_RE = /(^|\s)\/fast(?=\s|$)/i;
const ESTIMATE_RE = /(^|\s)\/estimate(?=\s|$)/i;

export interface PlParsedInvocation {
  fast: boolean;
  estimate: boolean;
  module: string;
}

export interface PlEntryFacts {
  moduleExists: boolean;
  pipelineStatus: string;
  l5ConfigExists: boolean;
}

export type PlInvokeSide = 'l2' | 'l1' | 'effort';

export interface PlOrchestrationRow {
  round: number;
  l2: string;
  l1: string;
  effort: string;
}

export function isPlStepId(value: string): value is PlStepId {
  return (PL_STEP_IDS as readonly string[]).includes(value);
}

export function ownerStepId(planId: string): PlStepId | '' {
  if (isPlStepId(planId)) return planId;
  for (const id of PL_STEP_IDS) {
    if (planId === `${id}-done` || planId.startsWith(`${id}-clarification`)) continue;
    if (planId.startsWith(`${id}-`)) return id;
  }
  return '';
}

export function moduleTokenOk(moduleName: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(moduleName);
}

export function parsePlInvocation(value: string): PlParsedInvocation {
  const raw = String(value || '').replace(/^@@agentPlannerL4\b/i, ' ').trim();
  const fast = FAST_RE.test(raw);
  const estimate = ESTIMATE_RE.test(raw);
  const stripped = raw
    .replace(new RegExp(FAST_RE.source, 'gi'), ' ')
    .replace(new RegExp(ESTIMATE_RE.source, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const token = stripped.split(' ')[0] || '';
  const module = moduleTokenOk(token) ? token : normalizeModuleName(token, '');
  return { fast, estimate, module };
}

export function existingModuleName(moduleName: string): string {
  const wanted = moduleName.toLowerCase();
  for (const name of listModuleFolders()) {
    if (name.toLowerCase() === wanted) return name;
  }
  return '';
}

/**
 * Every deterministic refusal of the invocation in one pure place. Empty string means
 * the run may continue. Texts are English (i18n default).
 */
export function plEntryRefusal(invocation: PlParsedInvocation, facts: PlEntryFacts): string {
  if (invocation.estimate) return 'not available yet';
  if (!invocation.module) return 'Provide the module name after @@agentPlannerL4 (lowerCamel).';
  if (!moduleTokenOk(invocation.module)) return 'Module name must be lowerCamel (example: stockControl).';
  if (!facts.moduleExists) return `Module "${invocation.module}" does not exist in l4/.`;
  if (facts.pipelineStatus !== 'complete') {
    return `Module "${invocation.module}" pipeline is not complete.`;
  }
  if (!facts.l5ConfigExists) return 'l5/config.json is missing.';
  return '';
}

export async function gatherPlEntryFacts(moduleName: string): Promise<PlEntryFacts> {
  const existing = moduleName ? existingModuleName(moduleName) : '';
  const pipeline = existing ? await readPipeline(existing) : null;
  const config = await readL5Config();
  return {
    moduleExists: !!existing,
    pipelineStatus: pipeline?.status || '',
    l5ConfigExists: config !== null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export interface PlL5AdjustResult {
  config: Record<string, unknown>;
  adjusted: string[];
}

/**
 * Append planner projects to workspaceDependencies (existing order kept) and fill
 * `projects[id] = { root: '../mls-<id>', type: 'lib' }` when missing. No-op when both
 * 102020 and 102021 are already declared — caller must not rewrite the file then.
 */
export function adjustL5PlannerDeps(config: Record<string, unknown>): PlL5AdjustResult {
  const deps = Array.isArray(config.workspaceDependencies) ? [...config.workspaceDependencies] : [];
  const projects = isRecord(config.projects) ? { ...config.projects } : {};
  const adjusted: string[] = [];
  for (const id of PL_PLANNER_PROJECTS) {
    if (!deps.some(entry => String(entry) === id)) {
      deps.push(id);
      adjusted.push(`workspaceDependencies:+${id}`);
    }
    if (!isRecord(projects[id])) {
      projects[id] = { root: `../mls-${id}`, type: 'lib' };
      adjusted.push(`projects:+${id}`);
    }
  }
  if (!adjusted.length) return { config, adjusted };
  return { config: { ...config, workspaceDependencies: deps, projects }, adjusted };
}

/** Writes only when something was missing. Records tokens on the module pipeline. */
export async function applyL5PlannerDeps(moduleName: string): Promise<string[]> {
  const config = await readL5Config();
  // entry10 already refuses when the file is missing; a silent no-op here would hide the day
  // another caller reaches this without that guard.
  if (!config) throw new Error('[agentPlannerL4] l5/config.json is missing — cannot adjust planner dependencies.');
  const { config: next, adjusted } = adjustL5PlannerDeps(config);
  if (!adjusted.length) return [];
  await writeL5Config(next);
  const pipeline = await readPipeline(moduleName);
  if (pipeline) {
    const nextPipeline: Ns5PipelineState = {
      ...pipeline,
      l5Adjusted: [...(pipeline.l5Adjusted || []), ...adjusted],
      updatedAt: new Date().toISOString(),
    };
    await writePipeline(nextPipeline);
  }
  return adjusted;
}

export function createPlAgentStep(stepId: PlStepId, moduleName: string): mls.msg.AIAgentStep {
  const dependsOn = [...PL_STEP_DEPENDS_ON[stepId]];
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: PL_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: PL_AGENT_NAME,
    prompt: JSON.stringify({ planId: stepId, moduleName }),
    rags: [],
    planning: {
      planId: stepId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function buildPlPlannedSteps(moduleName: string): mls.msg.AIAgentStep[] {
  return PL_STEP_IDS.map(stepId => createPlAgentStep(stepId, moduleName));
}

export function plDispatchSubject(moduleName: string): string {
  return `Changed artifacts of ${moduleName}`;
}

/**
 * Same lookup `getInstanceByName` uses (a `.ts` whose shortName is the agent), without
 * importing the module. Missing file ⇒ not available. File present ⇒ create the step;
 * a later host `Invalid agent` still surfaces if `createAgent` is absent.
 */
export function plannerAgentPresent(agentName: string): boolean {
  if (!agentName.startsWith('agent')) return false;
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.status === 'deleted') continue;
    if (file.extension !== '.ts') continue;
    if (String(file.shortName || '') !== agentName) continue;
    return true;
  }
  return false;
}

function topSegmentAfterModule(folder: string, moduleName: string): string {
  const rest = folder === moduleName
    ? ''
    : folder.startsWith(`${moduleName}/`)
      ? folder.slice(moduleName.length + 1)
      : folder;
  return rest.split('/').filter(Boolean)[0] || '';
}

function artifactRelPath(file: { folder?: string; shortName?: string; extension?: string }, moduleName: string): string {
  const folder = String(file.folder || '');
  const rest = folder === moduleName
    ? ''
    : folder.startsWith(`${moduleName}/`)
      ? folder.slice(moduleName.length + 1)
      : folder;
  const name = `${file.shortName || ''}${file.extension || ''}`;
  return rest ? `${rest}/${name}` : name;
}

/** Every file under `l4/<mod>/` except `pipeline/`, `tobe/`, `pool/`. Paths relative to the module. */
export function listPlArtifacts(moduleName: string): string[] {
  const module = normalizeModuleName(moduleName);
  const project = moduleFile(module).project;
  const files = mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>;
  const found = new Map<string, true>();

  const consider = (file: { folder?: string; shortName?: string; extension?: string; status?: string }) => {
    if (file.status === 'deleted' || !file.shortName) return;
    const folder = String(file.folder || '');
    const top = topSegmentAfterModule(folder, module);
    if ((PL_EXCLUDED_TOP as readonly string[]).includes(top)) return;
    const rel = artifactRelPath(file, module);
    if (rel) found.set(rel, true);
  };

  for (const file of Object.values(files)) {
    if (!file || file.project !== project || Number(file.level) !== 4) continue;
    const folder = String(file.folder || '');
    if (folder !== module && !folder.startsWith(`${module}/`)) continue;
    consider(file);
  }

  const listFolder = hostListFolder();
  if (listFolder) {
    for (const info of listFolder(project, 4, module)) {
      const key = mls.stor.getKeyToFile(info);
      const indexed = files[key];
      if (indexed?.status === 'deleted') continue;
      if (!indexed) files[key] = diskFileInfo(info);
      consider(indexed || info);
    }
  }

  return [...found.keys()].sort();
}

export function buildPlPoolMessage(
  moduleName: string,
  to: 'l1' | 'l2',
  thread: string,
  artifacts: string[],
): PoolMessage {
  return {
    from: 'l4',
    to,
    thread,
    round: 1,
    mode: 'implement',
    subject: plDispatchSubject(moduleName),
    artifacts: [...artifacts],
    body: PL_DISPATCH_BODY,
  };
}

export function invokePlanId(box: 'l1' | 'l2', thread: string, round: number): string {
  return `pool-${box}-${thread}-${round}`;
}

export function plRoundPlanId(side: PlInvokeSide, round: number): string {
  return side === 'effort' ? `l2-effort-r${round}` : `${side}-r${round}`;
}

export function plRoundTitle(side: PlInvokeSide, round: number): string {
  if (side === 'effort') return `L2 effort r${round}`;
  if (side === 'l1') return `L1 r${round}`;
  return `L2 r${round}`;
}

export function plStepPrompt(moduleName: string, thread: string, file: string): string {
  return JSON.stringify({ moduleName, thread, file });
}

export function createPlInvokeStep(args: {
  agentName: string;
  moduleName: string;
  thread: string;
  file: string;
  planId: string;
  dependsOn?: string[];
  stepTitle?: string;
}): mls.msg.AIAgentStep {
  const dependsOn = [...(args.dependsOn || [])];
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: args.stepTitle
      || (args.agentName === PL_L1_AGENT ? 'Planner L1' : 'Planner L2'),
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: args.agentName,
    prompt: plStepPrompt(args.moduleName, args.thread, args.file),
    rags: [],
    planning: {
      planId: args.planId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function createPlLoopWaitStep(moduleName: string, dependsOn: string[], tick: number): mls.msg.AIAgentStep {
  const planId = `loop30-wait-${tick}`;
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: PL_STEP_TITLES.loop30,
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: PL_AGENT_NAME,
    prompt: JSON.stringify({ planId, moduleName }),
    rags: [],
    planning: {
      planId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function nextLoopWaitTick(planId: string): number {
  const match = /^loop30-wait-(\d+)$/.exec(planId);
  return match ? Number(match[1]) + 1 : 1;
}

export interface PlDispatchRun {
  artifacts: string[];
  thread: string;
  l2File: Ns5FileInfo;
  l1File: Ns5FileInfo;
  l2Path: string;
  l1Path: string;
  invokeL2: boolean;
  invokeL1: boolean;
  status: string;
}

export async function runPlDispatch(moduleName: string, now: Date): Promise<PlDispatchRun> {
  const artifacts = listPlArtifacts(moduleName);
  const thread = nextThread(moduleName, now);
  const at = now.toISOString();
  const l2File = await writePoolMessage(moduleName, buildPlPoolMessage(moduleName, 'l2', thread, artifacts), now);
  const l1File = await writePoolMessage(moduleName, buildPlPoolMessage(moduleName, 'l1', thread, artifacts), now);
  const l2Path = displayPath(l2File);
  const l1Path = displayPath(l1File);
  const base = { at, thread, round: 1 as const, mode: 'implement' as const, from: 'l4' as const, outcome: 'delivered' as const };
  await tracePool(moduleName, { ...base, file: l2Path, to: 'l2' });
  await tracePool(moduleName, { ...base, file: l1Path, to: 'l1' });
  const invokeL2 = plannerAgentPresent(PL_L2_AGENT);
  const invokeL1 = plannerAgentPresent(PL_L1_AGENT);
  return { artifacts, thread, l2File, l1File, l2Path, l1Path, invokeL2, invokeL1, status: formatMissingPlannerStatus(1, invokeL2, invokeL1) };
}

export function createRound1InvokeSteps(moduleName: string, run: PlDispatchRun): mls.msg.AIAgentStep[] {
  if (!run.invokeL2) return [];
  return [createPlInvokeStep({
    agentName: PL_L2_AGENT,
    moduleName,
    thread: run.thread,
    file: run.l2Path,
    planId: plRoundPlanId('l2', 1),
    stepTitle: plRoundTitle('l2', 1),
  })];
}

function otherBox(box: PoolBox): PoolBox {
  return box === 'l4' ? 'l2' : 'l4';
}

function listIndexedPoolFiles(moduleName: string, folder: string): Ns5FileInfo[] {
  const module = normalizeModuleName(moduleName);
  const project = moduleFile(module).project;
  const files = mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>;
  const found = new Map<string, Ns5FileInfo>();
  const consider = (file: { folder?: string; shortName?: string; extension?: string; status?: string }) => {
    if (file.status === 'deleted' || !file.shortName) return;
    if (String(file.folder || '') !== folder) return;
    const info: Ns5FileInfo = {
      project, level: 4, folder, shortName: String(file.shortName), extension: String(file.extension || ''),
    };
    found.set(`${info.shortName}${info.extension}`, info);
  };
  for (const file of Object.values(files)) {
    if (!file || file.project !== project || Number(file.level) !== 4) continue;
    consider(file);
  }
  const listFolder = hostListFolder();
  if (listFolder) {
    for (const info of listFolder(project, 4, folder)) {
      const key = mls.stor.getKeyToFile(info);
      const indexed = files[key];
      if (indexed?.status === 'deleted') continue;
      if (!indexed) files[key] = diskFileInfo(info);
      consider(indexed || info);
    }
  }
  return [...found.values()];
}

/** `l4/<mod>/pool/<box>/web/**.json` — not pool messages (menu/needs/backend/effort). */
export function listPoolWebFiles(moduleName: string, box: PoolBox): Ns5FileInfo[] {
  const module = normalizeModuleName(moduleName);
  const folder = `${module}/pool/${box}/web`;
  return listIndexedPoolFiles(module, folder).filter(file => file.extension === '.json');
}

/**
 * se os artefatos do l4 mudarem, todo o planejamento dos pools deve ser refeito
 *
 * Wipes every mailbox of the module: pool messages (trace `processed` then
 * `deletePoolMessage`) and `web/*.json`. Records `poolWiped` on the l4 pipeline.
 * Trace outcome stays `processed` (the pool enum does not grow); the reason is
 * `pool wiped: l4 changed`.
 */
export async function wipeModulePool(moduleName: string, now: Date): Promise<string[]> {
  const wiped: string[] = [];
  const at = now.toISOString();
  const threadFallback = `${normalizeModuleName(moduleName)}-00000000000000`;
  for (const box of POOL_BOXES) {
    for (const file of listPoolBox(moduleName, box)) {
      const path = displayPath(file);
      let from: PoolBox = otherBox(box);
      let to: PoolBox = box;
      let thread = threadFallback;
      let round = 1;
      let mode: PoolMessage['mode'] = 'implement';
      try {
        const message = await readPoolMessage(file);
        from = message.from;
        to = message.to;
        thread = message.thread;
        round = message.round;
        mode = message.mode;
      } catch {
        // unreadable leftover: still wipe, with a synthetic trace so deletePoolMessage can run
      }
      await tracePool(moduleName, {
        at, file: path, from, to, thread, round, mode,
        outcome: 'processed',
      });
      await deletePoolMessage(moduleName, file, path);
      wiped.push(path);
    }
    for (const file of listPoolWebFiles(moduleName, box)) {
      const path = displayPath(file);
      const { deleteFile } = await import('/_102027_/l2/libStor.js');
      await deleteFile(diskFileInfo(file));
      wiped.push(path);
    }
  }
  const pipeline = await readPipeline(moduleName);
  if (pipeline) {
    await writeJson(pipelineFile(moduleName), { ...pipeline, poolWiped: wiped, updatedAt: at });
  }
  return wiped;
}

export async function findOldestBoxMessage(
  moduleName: string,
  box: PoolBox,
  from: PoolBox,
  thread: string,
): Promise<PlBoxMessage | null> {
  const items = await loadPlBoxMessages(moduleName, box);
  const match = items.filter(item => item.message.thread === thread && item.message.from === from);
  return match[0] || null;
}

function hasPoolWebJson(moduleName: string, box: PoolBox, shortName: string): boolean {
  return listPoolWebFiles(moduleName, box).some(file => file.shortName === shortName && file.extension === '.json');
}

/**
 * After an L2/L1 invoke, the table cell is `done` only when the planner produced.
 * L2: `pool/l2/web/menu.json` and a `l2→l1` message. L1: `l1→l2` message or `backend.json`.
 * No production → `no-output` (the loop fails the task with "<planId> ran without output").
 */
export async function plInvokeOutput(
  side: 'l2' | 'l1',
  moduleName: string,
  thread: string,
): Promise<'done' | 'no-output'> {
  if (side === 'l2') {
    const hasMenu = hasPoolWebJson(moduleName, 'l2', 'menu');
    const needs = await findOldestBoxMessage(moduleName, 'l1', 'l2', thread);
    return hasMenu && needs ? 'done' : 'no-output';
  }
  const reply = await findOldestBoxMessage(moduleName, 'l2', 'l1', thread);
  const hasBackend = hasPoolWebJson(moduleName, 'l2', 'backend');
  return reply || hasBackend ? 'done' : 'no-output';
}

export async function writePlOrchestration(
  moduleName: string,
  table: PlOrchestrationRow[],
): Promise<void> {
  const pipeline = await readPipeline(moduleName);
  if (!pipeline) return;
  await writeJson(pipelineFile(moduleName), {
    ...pipeline,
    plOrchestration: table,
    updatedAt: new Date().toISOString(),
  });
}

export function formatMissingPlannerStatus(round: number, l2Available: boolean, l1Available: boolean): string {
  const missing: string[] = [];
  if (!l2Available) missing.push('l2 pending (agentPlannerL2 not available)');
  if (!l1Available) missing.push('l1 pending (agentPlannerL1 not available)');
  if (!missing.length) return '';
  return `round ${round}/${POOL_MAX_ROUND} · ${missing.join('; ')}. Requests stayed in the box.`;
}

export interface PlBoxMessage {
  file: Ns5FileInfo;
  path: string;
  message: PoolMessage;
}

export async function loadPlBoxMessages(moduleName: string, box: PoolBox): Promise<PlBoxMessage[]> {
  const out: PlBoxMessage[] = [];
  for (const file of listPoolBox(moduleName, box)) {
    out.push({ file, path: displayPath(file), message: await readPoolMessage(file) });
  }
  return out;
}

export function plDeliveredRounds(trace: PoolTraceLine[], thread: string, to: PoolBox): number {
  return trace.filter(line => line.thread === thread && line.to === to && line.outcome === 'delivered').length;
}

export interface PlLoopInvoke {
  box: 'l1' | 'l2';
  agentName: string;
  file: Ns5FileInfo;
  path: string;
  thread: string;
  round: number;
  from: PoolBox;
  to: PoolBox;
  mode: PoolMessage['mode'];
}

export interface PlLoopDecision {
  invoke: PlLoopInvoke[];
  disputed: PlLoopInvoke[];
  stop: boolean;
  status: string;
  maxRound: number;
}

export function decidePlLoop(input: {
  thread: string;
  trace: PoolTraceLine[];
  l1: PlBoxMessage[];
  l2: PlBoxMessage[];
  l1Available: boolean;
  l2Available: boolean;
}): PlLoopDecision {
  const invoke: PlLoopInvoke[] = [];
  const disputed: PlLoopInvoke[] = [];
  const pendingUnavailable: string[] = [];
  const traced = new Set(input.trace.map(line => line.file));
  const alreadyDisputed = new Set(
    input.trace.filter(line => line.outcome === 'disputed').map(line => line.file),
  );

  const handle = (
    box: 'l1' | 'l2',
    items: PlBoxMessage[],
    available: boolean,
    agentName: string,
  ) => {
    const rounds = plDeliveredRounds(input.trace, input.thread, box);
    if (items.length && rounds >= POOL_MAX_ROUND) {
      for (const item of items) {
        if (alreadyDisputed.has(item.path)) continue;
        disputed.push(toInvoke(box, agentName, item));
      }
      return;
    }
    const fresh = items.filter(item => !traced.has(item.path));
    if (fresh.length && rounds < POOL_MAX_ROUND) {
      if (!available) {
        pendingUnavailable.push(box);
        return;
      }
      invoke.push(toInvoke(box, agentName, fresh[0]));
      return;
    }
    if (items.length && !available) pendingUnavailable.push(box);
  };

  handle('l2', input.l2, input.l2Available, PL_L2_AGENT);
  handle('l1', input.l1, input.l1Available, PL_L1_AGENT);

  const maxRound = Math.max(
    1,
    plDeliveredRounds(input.trace, input.thread, 'l2'),
    plDeliveredRounds(input.trace, input.thread, 'l1'),
    ...input.l1.map(item => item.message.round),
    ...input.l2.map(item => item.message.round),
  );
  const stop = invoke.length === 0;
  const status = stop
    ? formatLoopStopStatus(maxRound, disputed.length > 0, pendingUnavailable, input.l1.length + input.l2.length)
    : '';
  return { invoke, disputed, stop, status, maxRound };
}

function toInvoke(box: 'l1' | 'l2', agentName: string, item: PlBoxMessage): PlLoopInvoke {
  return {
    box,
    agentName,
    file: item.file,
    path: item.path,
    thread: item.message.thread,
    round: item.message.round,
    from: item.message.from,
    to: item.message.to,
    mode: item.message.mode,
  };
}

function formatLoopStopStatus(
  maxRound: number,
  disputed: boolean,
  pendingUnavailable: string[],
  pendingCount: number,
): string {
  if (disputed) {
    return `round ${maxRound}/${POOL_MAX_ROUND} · disputed. Messages were not deleted.`;
  }
  const missing: string[] = [];
  if (pendingUnavailable.includes('l2')) missing.push('l2 pending (agentPlannerL2 not available)');
  if (pendingUnavailable.includes('l1')) missing.push('l1 pending (agentPlannerL1 not available)');
  if (missing.length) {
    return `round ${maxRound}/${POOL_MAX_ROUND} · ${missing.join('; ')}. Requests stayed in the box.`;
  }
  if (pendingCount === 0) return `round ${maxRound}/${POOL_MAX_ROUND} · pool empty.`;
  return `round ${maxRound}/${POOL_MAX_ROUND} · pending.`;
}

export async function applyPlLoopDecision(moduleName: string, decision: PlLoopDecision, now: Date): Promise<void> {
  const at = now.toISOString();
  for (const item of decision.disputed) {
    await tracePool(moduleName, {
      at, file: item.path, from: item.from, to: item.to,
      thread: item.thread, round: item.round, mode: item.mode, outcome: 'disputed',
    });
  }
  for (const item of decision.invoke) {
    await tracePool(moduleName, {
      at, file: item.path, from: item.from, to: item.to,
      thread: item.thread, round: item.round, mode: item.mode, outcome: 'delivered',
    });
  }
}

export function latestDeliveredThread(trace: PoolTraceLine[]): string {
  for (let i = trace.length - 1; i >= 0; i -= 1) {
    if (trace[i].outcome === 'delivered' && trace[i].from === 'l4') return trace[i].thread;
  }
  return trace[trace.length - 1]?.thread || '';
}

export async function gatherPlLoopDecision(moduleName: string, thread?: string): Promise<PlLoopDecision> {
  const trace = await readPoolTrace(moduleName);
  const current = thread || latestDeliveredThread(trace);
  const l1 = (await loadPlBoxMessages(moduleName, 'l1')).filter(item => !current || item.message.thread === current);
  const l2 = (await loadPlBoxMessages(moduleName, 'l2')).filter(item => !current || item.message.thread === current);
  return decidePlLoop({
    thread: current,
    trace,
    l1,
    l2,
    l1Available: plannerAgentPresent(PL_L1_AGENT),
    l2Available: plannerAgentPresent(PL_L2_AGENT),
  });
}

export function invokeSideOf(item: PlLoopInvoke): PlInvokeSide {
  if (item.box === 'l1') return 'l1';
  if (item.from === 'l1') return 'effort';
  return 'l2';
}

export function createLoopInvokeStep(moduleName: string, item: PlLoopInvoke, dependsOn: string[] = []): mls.msg.AIAgentStep {
  const side = invokeSideOf(item);
  return createPlInvokeStep({
    agentName: item.agentName,
    moduleName,
    thread: item.thread,
    file: item.path,
    planId: plRoundPlanId(side, item.round),
    stepTitle: plRoundTitle(side, item.round),
    dependsOn,
  });
}
