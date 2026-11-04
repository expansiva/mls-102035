/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/write50/write50.ts" enhancement="_blank" />

import { NRP_AGENT_NAME, NRP_CANDIDATE_REL } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import {
  nrpFreshIssues,
  nrpMayWrite,
  nrpRepairRoundCounts,
  type NrpAppliedEdit,
  type NrpGateIssue,
  type NrpGateKind,
  type NrpRepairRound,
} from '/_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.js';
import { nrpFreeTextHits } from '/_102035_/l2/agentNewReleasePrompt/helpers/mechanical.js';
import type { NrpTriage } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';
import {
  accessFile,
  integrationFile,
  journeyFile,
  journeyIndexFile,
  ontologyEntityFile,
  ontologyIndexFile,
  fileExists,
  indexedFile,
  pipelineJsonFileForProject,
  readSourceText,
  rulesFile,
  setModuleRoot,
  workflowsFile,
  writeJson,
  writeSourceText,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import { scanNs4ClassicJsonObject } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { ns5OntologyEntityIds } from '/_102035_/l2/solution/ontologyView.js';
import { tobeDiff } from '/_102035_/l2/solution/candidate/tobeDiff.js';
import { promptAssumptionsLine, promptChangeSummary, promptNothingChangedSummary, type PromptSummaryFile } from '/_102035_/l2/agentNewReleasePrompt/helpers/promptSummary.js';

export interface NrpWritePayload {
  moduleName: string;
  project: number;
  request: string;
  triage: NrpTriage;
  artifacts: NrpModuleArtifacts;
  applied: NrpAppliedEdit[];
  issues: NrpGateIssue[];
  allowWrite: boolean;
  modelCalls: number;
  repairRounds?: NrpRepairRound[];
  /** Decisions the code took after the edit (for example who sees a new field). */
  notes?: string[];
}

export interface NrpFileState {
  path: string;
  state: 'added' | 'changed' | 'removed';
}

export interface NrpPersistPlan {
  written: boolean;
  reason: string | null;
  files: string[];
}

export interface NrpPersistResult {
  files: string[];
  fileStates: NrpFileState[];
  reason: string | null;
  summary: string;
}

export interface NrpOperationChange {
  file: string;
  jsonPath: string;
}

export interface NrpOperationRecord {
  source: 'prompt';
  at: string;
  request: string;
  taskId: string;
  changes: NrpOperationChange[];
}

/** Classify each written file, plus journeys or entities the new index no longer names. */
export function nrpFileStates(
  written: ReadonlyArray<{ path: string; existed: boolean }>,
  removed: readonly string[],
): NrpFileState[] {
  const states: NrpFileState[] = written.map(item => ({ path: item.path, state: item.existed ? 'changed' : 'added' }));
  for (const path of removed) states.push({ path, state: 'removed' });
  return states;
}

export function planNrpPersistence(allowWrite: boolean, files: readonly string[]): NrpPersistPlan {
  if (!allowWrite || !nrpMayWrite('write')) {
    return { written: false, reason: 'Verification failed. Nothing was written.', files: [] };
  }
  return { written: true, reason: null, files: [...files] };
}

export function createWrite50Step(payload: NrpWritePayload): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    nextSteps: [],
    status: 'waiting_human_input',
    agentName: NRP_AGENT_NAME,
    stepTitle: 'Write the edited version',
    prompt: JSON.stringify({ nrpWrite: payload }),
    rags: [],
    planning: { planId: 'write50', dependsOn: ['gate40-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

export async function beforeNrpWriteStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const base = {
    messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
  };
  try {
    const payload = readPayload(step.prompt);
    const planned = planNrpPersistence(payload.allowWrite, fileNames(payload));
    const persisted = planned.written
      ? await persistNrp(payload, context.task?.PK || '')
      : { files: [] as string[], fileStates: [] as NrpFileState[], reason: planned.reason, summary: '' };
    const written = persisted.files.length > 0;
    const outcome = { written, reason: persisted.reason, files: persisted.files };
    const listed = persisted.fileStates.map(item => `${item.path} ${item.state}`).join(', ');
    return [
      {
        type: 'add-step', ...base, step: {
          type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
          stepTitle: written ? 'Version written' : 'Version not written',
          result: JSON.stringify({
            written, reason: outcome.reason, files: persisted.files, fileStates: persisted.fileStates,
            summary: persisted.summary, report: nrpReport(payload, outcome, persisted.summary),
          }),
          planning: { planId: 'write50-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
        } as mls.msg.AIResultStep,
      },
      {
        type: 'update-status', ...base, stepId: step.stepId, hookSequential,
        status: 'completed', cleaner: 'input_output',
        traceMsg: written ? `write50 wrote ${listed}.` : `write50 wrote nothing: ${persisted.reason || 'verification failed.'}`,
      },
    ];
  } catch (error) {
    console.error('[agentNewReleasePrompt] write50 failed', error);
    return [{
      type: 'update-status', ...base, stepId: step.stepId, hookSequential,
      status: 'failed', cleaner: 'input_output',
      traceMsg: error instanceof Error ? error.message : String(error),
    }];
  }
}

export async function persistNrp(payload: NrpWritePayload, taskId = ''): Promise<NrpPersistResult> {
  setModuleRoot(payload.moduleName, `${payload.moduleName}/${NRP_CANDIDATE_REL}`);
  const written: string[] = [];
  const moduleName = payload.moduleName;
  const jobs: Array<{ info: Ns5FileInfo; value: unknown; newId: string | null }> = [];
  const entities = payload.artifacts.entities;
  for (const entityId of ns5OntologyEntityIds(payload.artifacts.ontologyIndex)) {
    const entity = entities.find(item => item.entityId === entityId);
    if (!entity) continue;
    jobs.push({ info: ontologyEntityFile(moduleName, entityId), value: entity, newId: entityId });
  }
  jobs.push({ info: ontologyIndexFile(moduleName), value: payload.artifacts.ontologyIndex, newId: null });
  for (const journey of payload.artifacts.journeys) {
    jobs.push({ info: journeyFile(moduleName, journey.journeyId), value: journey, newId: journey.journeyId });
  }
  jobs.push({ info: journeyIndexFile(moduleName), value: payload.artifacts.journeyIndex, newId: null });
  jobs.push({ info: rulesFile(moduleName), value: payload.artifacts.rules, newId: null });
  jobs.push({ info: accessFile(moduleName), value: payload.artifacts.access, newId: null });
  jobs.push({ info: workflowsFile(moduleName), value: payload.artifacts.workflows, newId: null });
  jobs.push({ info: integrationFile(moduleName), value: payload.artifacts.integration, newId: null });
  const siblings = new Map<string, string>();
  const missing: typeof jobs = [];
  const pending: Array<{ info: Ns5FileInfo; text: string; label: string; existed: boolean; before: unknown; after: unknown }> = [];
  const removed: string[] = [];
  for (const job of jobs) {
    let current = '';
    if (fileExists(job.info)) {
      try { current = await readSourceText(job.info); }
      catch (error) {
        console.error('[agentNewReleasePrompt] write50 read failed', error);
      }
    }
    const label = `${job.info.folder}/${job.info.shortName}${job.info.extension}`;
    if (!current) {
      missing.push(job);
      continue;
    }
    if (!siblings.has(job.info.folder)) siblings.set(job.info.folder, current);
    if (job.info.shortName === 'index' && job.info.folder.endsWith('/journeys')) {
      removed.push(...droppedIndexIds(current, job.value, 'journeys', 'journeyId', 'journeys'));
    }
    if (job.info.shortName === 'index' && job.info.folder.endsWith('/ontology')) {
      removed.push(...droppedIndexIds(current, job.value, 'entities', 'entityId', 'ontology'));
    }
    if (sameDefsJson(current, job.value)) continue;
    const text = replaceDefsJsonLiteral(current, job.value);
    const mismatch = nrpDefsRoundTripError(text, job.value);
    if (mismatch) return nothingWritten(`${label}: ${mismatch}`);
    pending.push({ info: job.info, text, label, existed: true, before: defsJson(current), after: job.value });
  }
  for (const job of missing) {
    const siblingSource = siblings.get(job.info.folder) || '';
    const label = `${job.info.folder}/${job.info.shortName}${job.info.extension}`;
    if (!siblingSource) throw new Error(`No sibling defs file to copy for ${job.info.shortName}.`);
    const nextId = job.newId || job.info.shortName;
    const text = defsSourceFromSibling(siblingSource, siblingIdOf(siblingSource, nextId), nextId, job.value);
    const mismatch = nrpDefsRoundTripError(text, job.value);
    if (mismatch) return nothingWritten(`${label}: ${mismatch}`);
    pending.push({ info: job.info, text, label, existed: false, before: undefined, after: job.value });
  }
  const removedBodies: Array<{ path: string; before: unknown }> = [];
  const deleteError = await deleteDroppedTobeFiles(moduleName, removed, removedBodies);
  if (deleteError) return nothingWritten(deleteError);
  for (const job of pending) {
    await writeSourceText(job.info, job.text);
    written.push(job.label);
  }
  const touched: PromptSummaryFile[] = pending.map(job => ({
    file: candidateRelative(job.info, moduleName),
    state: job.existed ? 'changed' as const : 'added' as const,
    before: job.before,
    after: job.after,
    diffs: tobeDiff(job.before, job.after),
  }));
  for (const item of removedBodies) {
    touched.push({
      file: item.path,
      state: 'removed',
      before: item.before,
      diffs: tobeDiff(item.before, undefined),
    });
  }
  const fileStates = nrpFileStates(pending.map(job => ({ path: candidateRelative(job.info, moduleName), existed: job.existed })), removed);
  const userLanguage = payload.artifacts.module && 'userLanguage' in payload.artifacts.module
    ? payload.artifacts.module.userLanguage
    : undefined;
  const notes = [...(payload.notes || []), ...payload.applied.flatMap(edit => edit.reasons || [])];
  if (!touched.length) {
    return {
      files: [], fileStates: [], reason: 'No artifact changed. Nothing was written.',
      summary: promptNothingChangedSummary(userLanguage, notes),
    };
  }
  const summary = [promptChangeSummary(userLanguage, touched), promptAssumptionsLine(userLanguage, notes), payload.triage.l3Notice].filter(Boolean).join('\n');
  if (touched.length) {
    const at = new Date();
    const record: NrpOperationRecord = {
      source: 'prompt',
      at: at.toISOString(),
      request: payload.request,
      taskId,
      changes: touched.flatMap(item => item.diffs.map(diff => ({ file: item.file, jsonPath: diff.jsonPath }))),
    };
    const operation = {
      project: payload.project,
      level: 4 as const,
      folder: `${moduleName}/tobe/operations`,
      shortName: operationStamp(at, taskId),
      extension: '.json',
    };
    written.push(await writeJson(operation, record));
  }
  const reportFile = pipelineJsonFileForProject(payload.project, payload.moduleName, 'newReleasePrompt');
  if (reportFile.folder.startsWith(`${payload.moduleName}/${NRP_CANDIDATE_REL}`)) {
    reportFile.folder = `${payload.moduleName}/pipeline`;
  }
  written.push(await writeJson(reportFile, nrpReport(payload, { written: true, reason: null, files: written }, summary)));
  return { files: written, fileStates, reason: null, summary };
}

function nothingWritten(reason: string): NrpPersistResult {
  return { files: [], fileStates: [], reason, summary: '' };
}

/** `<yyyymmddhhmmss>-<taskId>`. A dot in the task id becomes a hyphen so the short name stays valid. */
export function operationStamp(at: Date, taskId: string): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}`;
  const id = taskId.replaceAll('.', '-') || 'none';
  return `${stamp}-${id}`;
}

const DROPPED_TOBE_FILE = /^(journeys|ontology)\/([A-Za-z][A-Za-z0-9]*)\.defs\.ts$/u;

/** Deletes journey or entity files the new index dropped. Only under `l4/<mod>/tobe/plan`. */
async function deleteDroppedTobeFiles(
  moduleName: string,
  paths: readonly string[],
  removedBodies: Array<{ path: string; before: unknown }>,
): Promise<string | null> {
  const prefix = `${moduleName}/${NRP_CANDIDATE_REL}/`;
  const planned: Array<{ info: Ns5FileInfo; indexed: mls.stor.IFileInfo; text: string; path: string }> = [];
  for (const path of paths) {
    const match = DROPPED_TOBE_FILE.exec(path);
    if (!match) return `Could not delete ${path}: not a journey or entity in the edited version.`;
    const info = match[1] === 'journeys' ? journeyFile(moduleName, match[2]) : ontologyEntityFile(moduleName, match[2]);
    if (!info.folder.startsWith(prefix)) return `Could not delete ${path}: outside the edited version.`;
    const indexed = indexedFile(info);
    if (!indexed || indexed.status === 'deleted') return `Could not delete ${path}: the file is not in the edited version.`;
    let text = '';
    try { text = await readSourceText(info); }
    catch (error) {
      console.error('[agentNewReleasePrompt] write50 delete read failed', error);
      return `Could not delete ${path}: the file could not be read.`;
    }
    if (!text) return `Could not delete ${path}: the file is empty.`;
    removedBodies.push({ path, before: defsJson(text) });
    planned.push({ info, indexed, text, path });
  }
  if (!planned.length) return null;
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  const gone: typeof planned = [];
  for (const job of planned) {
    try { await deleteFile(job.indexed); }
    catch (error) {
      console.error('[agentNewReleasePrompt] write50 delete failed', error);
      await restoreDroppedTobeFiles(gone);
      const detail = error instanceof Error ? error.message : String(error);
      return `Could not delete ${job.path}: ${detail}`;
    }
    if (fileExists(job.info)) {
      await restoreDroppedTobeFiles(gone);
      return `Could not delete ${job.path}: the file is still there.`;
    }
    gone.push(job);
  }
  return null;
}

async function restoreDroppedTobeFiles(jobs: ReadonlyArray<{ info: Ns5FileInfo; text: string }>): Promise<void> {
  for (const job of jobs) await writeSourceText(job.info, job.text);
}

export function candidateRelative(info: Ns5FileInfo, moduleName: string): string {
  const root = `${moduleName}/${NRP_CANDIDATE_REL}`;
  const folder = info.folder === root ? '' : info.folder.startsWith(`${root}/`) ? info.folder.slice(root.length + 1) : info.folder;
  return `${folder ? `${folder}/` : ''}${info.shortName}${info.extension}`;
}

function droppedIndexIds(current: string, next: unknown, listKey: 'journeys' | 'entities', idKey: 'journeyId' | 'entityId', prefix: string): string[] {
  if (!current || !isRecord(next) || !Array.isArray(next[listKey])) return [];
  const bounds = scanNs4ClassicJsonObject(current);
  if (!bounds) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(current.slice(bounds.start, bounds.end)); }
  catch (error) {
    console.error('[agentNewReleasePrompt] write50 index JSON is not readable', error);
    return [];
  }
  if (!isRecord(parsed) || !Array.isArray(parsed[listKey])) return [];
  const nextIds = new Set(parsedIds(next[listKey], idKey));
  const removed: string[] = [];
  for (const id of parsedIds(parsed[listKey], idKey)) {
    if (!nextIds.has(id)) removed.push(`${prefix}/${id}.defs.ts`);
  }
  return removed;
}

function parsedIds(rows: unknown, idKey: 'journeyId' | 'entityId'): string[] {
  if (!Array.isArray(rows)) return [];
  const ids: string[] = [];
  for (const item of rows) {
    const id = isRecord(item) ? item[idKey] : item;
    if (typeof id === 'string' && id) ids.push(id);
  }
  return ids;
}

function defsJson(source: string): unknown {
  const bounds = scanNs4ClassicJsonObject(source);
  if (!bounds) return undefined;
  try { return JSON.parse(source.slice(bounds.start, bounds.end)); }
  catch (error) {
    console.error('[agentNewReleasePrompt] write50 defs JSON is not readable', error);
    return undefined;
  }
}

function sameDefsJson(source: string, value: unknown): boolean {
  const bounds = scanNs4ClassicJsonObject(source);
  if (!bounds) return false;
  try {
    return JSON.stringify(JSON.parse(source.slice(bounds.start, bounds.end))) === JSON.stringify(value);
  } catch (error) {
    console.error('[agentNewReleasePrompt] write50 defs JSON is not readable', error);
    return false;
  }
}

function siblingIdOf(source: string, fallback: string | null): string {
  const match = source.match(/fileReference="[^"]+\/([A-Za-z0-9_]+)\.defs\.ts"/u);
  return match?.[1] || fallback || '';
}

function fileNames(payload: NrpWritePayload): string[] {
  const names: string[] = [];
  for (const kind of payload.triage.artifacts) {
    if (kind === 'journeys') names.push('journeys/index.defs.ts');
    else if (kind === 'ontology') names.push('ontology/index.defs.ts');
    else names.push(`${kind === 'rules' ? 'rules' : kind}.defs.ts`);
  }
  names.push('pipeline/newReleasePrompt.json');
  return names;
}

const CHECK_KINDS: NrpGateKind[] = ['rules', 'journeys', 'access', 'workflows', 'integration', 'coherence'];

export function nrpCheckRows(issues: readonly NrpGateIssue[]): Array<{ kind: NrpGateKind; result: 'passed' | 'failed'; baseline: boolean }> {
  return CHECK_KINDS.map(kind => {
    const rows = issues.filter(issue => issue.kind === kind);
    return {
      kind,
      result: rows.some(issue => !issue.baseline) ? 'failed' as const : 'passed' as const,
      baseline: rows.some(issue => issue.baseline === true),
    };
  });
}

/** Reads the JSON literal back from the text the way `readDefsJson` does, and compares it to the gated value. */
export function nrpDefsRoundTripError(source: string, value: unknown): string | null {
  const bounds = scanNs4ClassicJsonObject(source);
  if (!bounds) return 'the text has no JSON object';
  let parsed: unknown;
  try { parsed = JSON.parse(source.slice(bounds.start, bounds.end)); }
  catch (error) {
    console.error('[agentNewReleasePrompt] write50 rewritten JSON does not parse', error);
    return 'the JSON does not parse';
  }
  if (!sameValue(parsed, value)) return 'the JSON differs from the gated artifact';
  return null;
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => sameValue(item, right[index]));
  }
  if (isRecord(left) && isRecord(right)) {
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) return false;
    return keys.every(key => Object.prototype.hasOwnProperty.call(right, key) && sameValue(left[key], right[key]));
  }
  return false;
}

/** Replaces the JSON literal and leaves the file header and the export names as they are. */
export function replaceDefsJsonLiteral(source: string, value: unknown): string {
  const bounds = scanNs4ClassicJsonObject(source);
  if (!bounds) throw new Error('Defs file has no JSON object.');
  const objectSource = source.slice(bounds.start, bounds.end);
  let current: unknown;
  try { current = JSON.parse(objectSource); }
  catch (error) {
    console.error('[agentNewReleasePrompt] write50 defs JSON is not readable', error);
    throw new Error('Defs JSON is not readable.');
  }
  const next = patchJsonText(objectSource, current, value);
  return `${source.slice(0, bounds.start)}${next}${source.slice(bounds.end)}`;
}

/** Keeps every unchanged token. A changed scalar replaces only its literal. */
function patchJsonText(source: string, current: unknown, next: unknown): string {
  if (JSON.stringify(current) === JSON.stringify(next)) return source;
  if (isRecord(current) && isRecord(next)) return patchObject(source, current, next);
  if (Array.isArray(current) && Array.isArray(next)) return patchArray(source, current, next);
  return JSON.stringify(next);
}

function patchObject(source: string, current: Record<string, unknown>, next: Record<string, unknown>): string {
  const entries = objectEntries(source);
  const dropped = entries.filter(entry => !Object.prototype.hasOwnProperty.call(next, entry.key));
  let working = source;
  let currentNow = current;
  if (dropped.length) {
    working = omitSpans(source, dropped.map(entry => removalSpan(source, entry.keyStart, entry.valueEnd)));
    currentNow = {};
    for (const key of Object.keys(current)) {
      if (Object.prototype.hasOwnProperty.call(next, key)) currentNow[key] = current[key];
    }
  }
  return patchObjectKept(working, currentNow, next);
}

function patchObjectKept(source: string, current: Record<string, unknown>, next: Record<string, unknown>): string {
  const entries = objectEntries(source);
  let cursor = 0;
  let out = '';
  for (const entry of entries) {
    out += source.slice(cursor, entry.valueStart);
    out += patchJsonText(source.slice(entry.valueStart, entry.valueEnd), current[entry.key], next[entry.key]);
    cursor = entry.valueEnd;
  }
  out += source.slice(cursor);
  const extra = Object.keys(next).filter(key => !Object.prototype.hasOwnProperty.call(current, key));
  if (!extra.length) return out;
  return insertObjectKeys(out, entries.length > 0, extra, next);
}

/** Adds keys on their own lines, at the indent of the sibling keys. The keys already there stay as they are. */
function insertObjectKeys(source: string, hasSiblings: boolean, keys: readonly string[], next: Record<string, unknown>): string {
  const close = source.lastIndexOf('}');
  if (close < 0) return source;
  const indent = objectKeyIndent(source, close);
  const blocks = keys.map(key => formatKey(key, next[key], indent));
  let end = close;
  while (end > 0 && /\s/u.test(source[end - 1])) end -= 1;
  const needsComma = hasSiblings && source[end - 1] !== ',' && source[end - 1] !== '{';
  const head = `${source.slice(0, end)}${needsComma ? ',' : ''}`;
  const closeLine = source.lastIndexOf('\n', close);
  const closeIndent = closeLine >= 0 ? source.slice(closeLine + 1, close) : '';
  return `${head}\n${blocks.join(',\n')}\n${closeIndent}}${source.slice(close + 1)}`;
}

function objectKeyIndent(source: string, close: number): string {
  const entries = objectEntries(source);
  if (entries.length) {
    const lineStart = source.lastIndexOf('\n', entries[0].keyStart - 1) + 1;
    const spaces = source.slice(lineStart, entries[0].keyStart);
    if (/^ *$/u.test(spaces)) return spaces;
  }
  const lineStart = source.lastIndexOf('\n', close) + 1;
  const spaces = source.slice(lineStart, close).match(/^ */u)?.[0] || '';
  return `${spaces}  `;
}

function patchArray(source: string, current: unknown[], next: unknown[]): string {
  if (current.length !== next.length) {
    const drop = current.length > next.length ? pureDrops(current, next) : null;
    if (drop) {
      const items = arrayItems(source);
      return omitSpans(source, drop.map(index => removalSpan(source, items[index].start, items[index].end)));
    }
    const added = next.length > current.length ? pureAdds(current, next) : null;
    if (added) return insertArrayItems(source, next, added);
    return patchArrayMixed(source, current, next);
  }
  const items = arrayItems(source);
  let cursor = 0;
  let out = '';
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    out += source.slice(cursor, item.start);
    out += patchJsonText(source.slice(item.start, item.end), current[index], next[index]);
    cursor = item.end;
  }
  out += source.slice(cursor);
  return out;
}

/**
 * A set whose list is not a pure append still rewrites only the items that differ.
 * Unchanged items stay byte for byte. New and changed items use the file indent.
 */
function patchArrayMixed(source: string, current: unknown[], next: unknown[]): string {
  const kept = lcsKeep(current, next);
  if (!kept.length) return prettyArray(source, next);
  const items = arrayItems(source);
  const indent = arrayItemIndent(source, items);
  const close = source.lastIndexOf(']');
  const closeLine = source.lastIndexOf('\n', close);
  const closeIndent = closeLine >= 0 ? source.slice(closeLine + 1, close) : '';
  const bracket = source.indexOf('[');
  let out = source.slice(0, bracket + 1);
  let wrote = false;
  let lastKeptEnd: number | null = null;
  let currentIndex = 0;
  let nextIndex = 0;
  let pair = 0;
  while (nextIndex < next.length || currentIndex < current.length) {
    const keep = kept[pair];
    if (keep && keep.current === currentIndex && keep.next === nextIndex) {
      const item = items[currentIndex];
      if (lastKeptEnd !== null && lastKeptEnd <= item.start) out += source.slice(lastKeptEnd, item.end);
      else if (!wrote) out += source.slice(bracket + 1, item.end);
      else {
        if (!out.trimEnd().endsWith(',')) out += ',';
        const lineStart = source.lastIndexOf('\n', item.start - 1);
        const prefix = lineStart >= 0 ? source.slice(lineStart, item.start) : `\n${indent}`;
        out += `${prefix}${source.slice(item.start, item.end)}`;
      }
      lastKeptEnd = item.end;
      wrote = true;
      currentIndex += 1;
      nextIndex += 1;
      pair += 1;
      continue;
    }
    if (keep && keep.current === currentIndex) {
      currentIndex += 1;
      lastKeptEnd = null;
      continue;
    }
    if (nextIndex < next.length) {
      if (wrote && !out.trimEnd().endsWith(',')) out += ',';
      out += `\n${formatBlock(next[nextIndex], indent)}`;
      lastKeptEnd = null;
      wrote = true;
      nextIndex += 1;
    } else currentIndex += 1;
  }
  if (lastKeptEnd !== null) return `${out}${source.slice(lastKeptEnd)}`;
  return `${out}\n${closeIndent}]${source.slice(close + 1)}`;
}

function prettyArray(source: string, value: unknown[]): string {
  const indent = arrayItemIndent(source, arrayItems(source));
  const close = source.lastIndexOf(']');
  const closeLine = close >= 0 ? source.lastIndexOf('\n', close) : -1;
  const closeIndent = closeLine >= 0 ? source.slice(closeLine + 1, close) : '';
  if (!value.length) return '[]';
  const blocks = value.map(item => formatBlock(item, indent));
  return `[\n${blocks.join(',\n')}\n${closeIndent}]`;
}

function lcsKeep(current: unknown[], next: unknown[]): Array<{ current: number; next: number }> {
  const rows = current.length + 1;
  const cols = next.length + 1;
  const score: number[] = new Array(rows * cols).fill(0);
  const at = (row: number, col: number) => row * cols + col;
  for (let row = current.length - 1; row >= 0; row -= 1) {
    for (let col = next.length - 1; col >= 0; col -= 1) {
      score[at(row, col)] = JSON.stringify(current[row]) === JSON.stringify(next[col])
        ? score[at(row + 1, col + 1)] + 1
        : Math.max(score[at(row + 1, col)], score[at(row, col + 1)]);
    }
  }
  const kept: Array<{ current: number; next: number }> = [];
  let row = 0;
  let col = 0;
  while (row < current.length && col < next.length) {
    if (JSON.stringify(current[row]) === JSON.stringify(next[col])) {
      kept.push({ current: row, next: col });
      row += 1;
      col += 1;
    } else if (score[at(row + 1, col)] >= score[at(row, col + 1)]) row += 1;
    else col += 1;
  }
  return kept;
}

/** Indexes in `next` that are new, when every current item is still there, unchanged and in order. */
function pureAdds(current: unknown[], next: unknown[]): number[] | null {
  const added: number[] = [];
  let matched = 0;
  for (let index = 0; index < next.length; index += 1) {
    if (matched < current.length && JSON.stringify(current[matched]) === JSON.stringify(next[index])) matched += 1;
    else added.push(index);
  }
  return matched === current.length ? added : null;
}

/** Inserts new elements on their own lines. The elements already there stay byte for byte, plus a comma on the previous one. */
function insertArrayItems(source: string, next: unknown[], added: readonly number[]): string {
  const items = arrayItems(source);
  const addedSet = new Set(added);
  const indent = arrayItemIndent(source, items);
  const bracket = source.indexOf('[');
  const close = source.lastIndexOf(']');
  let itemIndex = 0;
  let out = source.slice(0, bracket + 1);
  let lastKeptEnd: number | null = null;
  let wrote = false;
  for (let index = 0; index < next.length; index += 1) {
    if (!addedSet.has(index)) {
      const item = items[itemIndex];
      const previous = itemIndex > 0 ? items[itemIndex - 1] : null;
      if (previous && lastKeptEnd === previous.end) out += source.slice(lastKeptEnd, item.end);
      else if (!wrote) out += source.slice(bracket + 1, item.end);
      else {
        if (!out.trimEnd().endsWith(',')) out += ',';
        out += `\n${source.slice(item.start, item.end)}`;
      }
      lastKeptEnd = item.end;
      itemIndex += 1;
      wrote = true;
      continue;
    }
    if (wrote && !out.trimEnd().endsWith(',')) out += ',';
    out += `\n${formatBlock(next[index], indent)}`;
    lastKeptEnd = null;
    wrote = true;
  }
  if (lastKeptEnd !== null) return `${out}${source.slice(lastKeptEnd)}`;
  const closeLine = source.lastIndexOf('\n', close);
  const closeIndent = closeLine >= 0 ? source.slice(closeLine + 1, close) : '';
  return `${out}\n${closeIndent}]${source.slice(close + 1)}`;
}

function arrayItemIndent(source: string, items: ReadonlyArray<{ start: number }>): string {
  if (items.length) {
    const lineStart = source.lastIndexOf('\n', items[0].start - 1) + 1;
    const spaces = source.slice(lineStart, items[0].start);
    if (/^ *$/u.test(spaces)) return spaces;
  }
  const bracket = source.indexOf('[');
  const lineStart = source.lastIndexOf('\n', Math.max(bracket, 0)) + 1;
  const spaces = source.slice(lineStart, Math.max(bracket, 0)).match(/^ */u)?.[0] || '';
  return `${spaces}  `;
}

function formatBlock(value: unknown, indent: string): string {
  return formatJson(value).split('\n').map(line => `${indent}${line}`).join('\n');
}

function formatKey(key: string, value: unknown, indent: string): string {
  const lines = formatJson(value).split('\n');
  const rest = lines.slice(1).map(line => `${indent}${line}`);
  return [`${indent}${JSON.stringify(key)}: ${lines[0]}`, ...rest].join('\n');
}

function formatJson(value: unknown): string {
  const pretty = JSON.stringify(value, null, 2);
  if (pretty === undefined) throw new Error('Value cannot be written as JSON.');
  return pretty;
}

/** Indexes in `current` that are absent from `next`, when every kept item is unchanged and in order. */
function pureDrops(current: unknown[], next: unknown[]): number[] | null {
  const drop: number[] = [];
  let matched = 0;
  for (let index = 0; index < current.length; index += 1) {
    if (matched < next.length && JSON.stringify(current[index]) === JSON.stringify(next[matched])) matched += 1;
    else drop.push(index);
  }
  return matched === next.length ? drop : null;
}

/** Deletes one property or list item: its own lines, and the neighbor comma when it was last. */
function removalSpan(source: string, valueStart: number, valueEnd: number): [number, number] {
  const lineBreak = source.lastIndexOf('\n', valueStart - 1);
  const startOfLine = lineBreak >= 0 ? lineBreak : valueStart;
  const after = skipSpace(source, valueEnd);
  if (source[after] === ',') return [startOfLine, after + 1];
  let probe = startOfLine;
  while (probe > 0 && /\s/u.test(source[probe - 1])) probe -= 1;
  const start = probe > 0 && source[probe - 1] === ',' ? probe - 1 : startOfLine;
  return [start, valueEnd];
}

function omitSpans(source: string, spans: Array<[number, number]>): string {
  const ordered = spans.filter(([start, end]) => end > start).sort((left, right) => right[0] - left[0]);
  let out = source;
  let cursor = out.length;
  for (const [start, end] of ordered) {
    const to = Math.min(end, cursor);
    if (start >= to) continue;
    out = `${out.slice(0, start)}${out.slice(to)}`;
    cursor = start;
  }
  return out;
}

function objectEntries(source: string): Array<{ key: string; keyStart: number; valueStart: number; valueEnd: number }> {
  const entries: Array<{ key: string; keyStart: number; valueStart: number; valueEnd: number }> = [];
  let index = skipSpace(source, 0);
  if (source[index] !== '{') return entries;
  index += 1;
  while (index < source.length) {
    index = skipSpace(source, index);
    if (source[index] === '}') break;
    const keyStart = index;
    const key = readString(source, index);
    index = skipSpace(source, key.end);
    if (source[index] !== ':') break;
    const valueStart = skipSpace(source, index + 1);
    const valueEnd = scanValue(source, valueStart);
    entries.push({ key: key.value, keyStart, valueStart, valueEnd });
    index = skipSpace(source, valueEnd);
    if (source[index] === ',') index += 1;
  }
  return entries;
}

function arrayItems(source: string): Array<{ start: number; end: number }> {
  const items: Array<{ start: number; end: number }> = [];
  let index = skipSpace(source, 0);
  if (source[index] !== '[') return items;
  index += 1;
  while (index < source.length) {
    index = skipSpace(source, index);
    if (source[index] === ']') break;
    const end = scanValue(source, index);
    items.push({ start: index, end });
    index = skipSpace(source, end);
    if (source[index] === ',') index += 1;
  }
  return items;
}

function scanValue(source: string, start: number): number {
  const char = source[start];
  if (char === '"') return readString(source, start).end;
  if (char === '{' || char === '[') {
    const open = char;
    const close = char === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
      const item = source[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (item === '\\') escaped = true;
        else if (item === '"') inString = false;
        continue;
      }
      if (item === '"') { inString = true; continue; }
      if (item === open) depth += 1;
      else if (item === close) {
        depth -= 1;
        if (depth === 0) return index + 1;
      }
    }
    return source.length;
  }
  let index = start;
  while (index < source.length && !/[\s,\]}]/u.test(source[index])) index += 1;
  return index;
}

function readString(source: string, start: number): { value: string; end: number } {
  let value = '';
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      value += char;
      escaped = false;
      continue;
    }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') return { value, end: index + 1 };
    value += char;
  }
  return { value, end: source.length };
}

function skipSpace(source: string, index: number): number {
  while (index < source.length && /\s/u.test(source[index])) index += 1;
  return index;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** A new file copies a sibling wrapper and swaps the id inside that wrapper. */
export function defsSourceFromSibling(siblingSource: string, siblingId: string, nextId: string, value: unknown): string {
  const bounds = scanNs4ClassicJsonObject(siblingSource);
  if (!bounds) throw new Error('Sibling defs file has no JSON object.');
  const prefix = siblingSource.slice(0, bounds.start).split(siblingId).join(nextId);
  const suffix = siblingSource.slice(bounds.end).split(siblingId).join(nextId);
  return `${prefix}${JSON.stringify(value, null, 2)}${suffix}`;
}

export function changedNrpPaths(before: NrpModuleArtifacts, after: NrpModuleArtifacts): string[] {
  const paths: string[] = [];
  const beforeEntities = new Map((before.entities || []).map(entity => [entity.entityId, entity]));
  for (const entity of after.entities || []) {
    if (stable(beforeEntities.get(entity.entityId)) !== stable(entity)) paths.push(`ontology/${entity.entityId}.defs.ts`);
  }
  if (stable(before.ontologyIndex) !== stable(after.ontologyIndex)) paths.push('ontology/index.defs.ts');
  const beforeJourneys = new Map((before.journeys || []).map(journey => [journey.journeyId, journey]));
  for (const journey of after.journeys || []) {
    if (stable(beforeJourneys.get(journey.journeyId)) !== stable(journey)) paths.push(`journeys/${journey.journeyId}.defs.ts`);
  }
  if (stable(before.journeyIndex) !== stable(after.journeyIndex)) paths.push('journeys/index.defs.ts');
  if (stable(before.rules) !== stable(after.rules)) paths.push('rules.defs.ts');
  if (stable(before.access) !== stable(after.access)) paths.push('access.defs.ts');
  if (stable(before.workflows) !== stable(after.workflows)) paths.push('workflows.defs.ts');
  if (stable(before.integration) !== stable(after.integration)) paths.push('integration.defs.ts');
  return paths;
}

function stable(value: unknown): string {
  return JSON.stringify(value);
}

const WRITTEN_KIND: Array<[prefix: string, kind: string]> = [
  ['ontology/', 'ontology'],
  ['journeys/', 'journeys'],
  ['rules', 'rules'],
  ['access', 'access'],
  ['workflows', 'workflows'],
  ['integration', 'integration'],
];

/** Kinds whose file was written because it differed before the write. The pipeline report is not one of the six kinds. */
export function kindsOfWrittenFiles(files: readonly string[]): string[] {
  const kinds: string[] = [];
  for (const file of files) {
    const kind = kindOfWrittenPath(file);
    if (kind && !kinds.includes(kind)) kinds.push(kind);
  }
  return kinds;
}

function kindOfWrittenPath(file: string): string | null {
  const path = file.replaceAll('\\', '/');
  if (path.includes('pipeline/')) return null;
  const prefixed = WRITTEN_KIND.find(([prefix]) => path.startsWith(prefix));
  if (prefixed) return prefixed[1];
  const nested = WRITTEN_KIND.find(([prefix]) => prefix.endsWith('/') && path.includes(`/${prefix}`));
  if (nested) return nested[1];
  const base = path.split('/').pop() || '';
  const named = WRITTEN_KIND.find(([prefix]) => !prefix.endsWith('/') && base.startsWith(prefix));
  return named ? named[1] : null;
}

export function nrpReport(payload: NrpWritePayload, planned: NrpPersistPlan, summary = ''): Record<string, unknown> {
  const modelKinds: string[] = [];
  for (const edit of payload.applied) {
    if (edit.mode !== 'model' || !edit.kind || modelKinds.includes(edit.kind)) continue;
    modelKinds.push(edit.kind);
  }
  return {
    request: payload.request,
    triage: payload.triage,
    changed: kindsOfWrittenFiles(planned.files),
    mechanical: payload.triage.mechanical,
    modelKinds,
    checks: nrpCheckRows(payload.issues),
    freshIssues: nrpFreshIssues(payload.issues),
    calls: payload.modelCalls,
    repairRounds: nrpRepairRoundCounts(payload.repairRounds || []),
    costUsd: null,
    written: planned.written,
    reason: planned.reason,
    summary,
    notEdited: nrpFreeTextHits(payload.artifacts.module, removedFieldTerms(payload.triage)).map(hit => ({
      kind: 'module',
      path: hit.path,
      text: hit.text,
      term: hit.term,
      note: 'não editado',
    })),
    pendingTextMarks: nrpPendingTextMarks(payload.artifacts, payload.triage),
  };
}

/** Citations of a removed term that are still in a file of the six kinds. */
export function nrpPendingTextMarks(
  artifacts: NrpModuleArtifacts,
  triage: NrpTriage,
): Array<{ file: string; path: string; term: string; text: string }> {
  const terms = citationTerms(triage);
  if (!terms.length) return [];
  const rows: Array<{ file: string; path: string; term: string; text: string }> = [];
  const push = (file: string, value: unknown): void => {
    for (const hit of nrpFreeTextHits(value, terms)) rows.push({ file, path: hit.path, term: hit.term, text: hit.text });
  };
  for (const entity of artifacts.entities || []) push(entity.entityId, entity);
  push('ontology/index', artifacts.ontologyIndex);
  for (const journey of artifacts.journeys || []) push(journey.journeyId, journey);
  push('journeys/index', artifacts.journeyIndex);
  push('rules', artifacts.rules);
  push('access', artifacts.access);
  push('workflows', artifacts.workflows);
  push('integration', artifacts.integration);
  return rows;
}

function citationTerms(triage: NrpTriage): string[] {
  const terms = new Set<string>(removedFieldTerms(triage));
  for (const mark of triage.mechanical) {
    if (mark.op === 'remove' && !mark.fieldId && mark.targetId) terms.add(mark.targetId);
  }
  return [...terms];
}

function removedFieldTerms(triage: NrpTriage): string[] {
  const terms = new Set<string>();
  for (const mark of triage.mechanical) {
    if (mark.op !== 'remove' || !mark.fieldId) continue;
    const leaf = mark.fieldId.slice(mark.fieldId.lastIndexOf('.') + 1);
    if (leaf) terms.add(leaf);
    terms.add(mark.fieldId);
    if (mark.targetId) terms.add(`${mark.targetId}.${mark.fieldId}`);
  }
  return [...terms];
}

function readPayload(prompt: unknown): NrpWritePayload {
  let raw: unknown;
  try { raw = JSON.parse(String(prompt || '')); }
  catch (error) {
    console.error('[agentNewReleasePrompt] write prompt is not JSON', error);
    throw new Error('Write step prompt must be JSON.');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Write step prompt must be an object.');
  const body = (raw as { nrpWrite?: NrpWritePayload }).nrpWrite;
  if (!body || typeof body !== 'object') throw new Error('Write step payload is missing.');
  return body;
}

