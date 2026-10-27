/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/write50/write50.ts" enhancement="_blank" />

import { NRP_AGENT_NAME, NRP_CANDIDATE_REL } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import {
  nrpFreshIssues,
  nrpMayWrite,
  type NrpAppliedEdit,
  type NrpGateIssue,
  type NrpGateKind,
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
}

export interface NrpPersistPlan {
  written: boolean;
  reason: string | null;
  files: string[];
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
    const persisted = planned.written ? await persistNrp(payload) : { files: [] as string[], reason: planned.reason };
    const written = persisted.files.length > 0;
    const outcome = { written, reason: persisted.reason, files: persisted.files };
    return [
      {
        type: 'add-step', ...base, step: {
          type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
          stepTitle: written ? 'Version written' : 'Version not written',
          result: JSON.stringify({ written, reason: outcome.reason, files: persisted.files, report: nrpReport(payload, outcome) }),
          planning: { planId: 'write50-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
        } as mls.msg.AIResultStep,
      },
      {
        type: 'update-status', ...base, stepId: step.stepId, hookSequential,
        status: 'completed', cleaner: 'input_output',
        traceMsg: written ? `write50 wrote ${persisted.files.length} files.` : `write50 wrote nothing: ${persisted.reason || 'verification failed.'}`,
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

async function persistNrp(payload: NrpWritePayload): Promise<{ files: string[]; reason: string | null }> {
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
  const pending: Array<{ info: Ns5FileInfo; text: string; label: string }> = [];
  for (const job of jobs) {
    let current = '';
    try { current = await readSourceText(job.info); }
    catch (error) {
      console.error('[agentNewReleasePrompt] write50 read failed', error);
      current = '';
    }
    const label = `${job.info.folder}/${job.info.shortName}${job.info.extension}`;
    if (!current) {
      missing.push(job);
      continue;
    }
    if (!siblings.has(job.info.folder)) siblings.set(job.info.folder, current);
    if (sameDefsJson(current, job.value)) continue;
    const text = replaceDefsJsonLiteral(current, job.value);
    const mismatch = nrpDefsRoundTripError(text, job.value);
    if (mismatch) return { files: [], reason: `${label}: ${mismatch}` };
    pending.push({ info: job.info, text, label });
  }
  for (const job of missing) {
    const siblingSource = siblings.get(job.info.folder) || '';
    const label = `${job.info.folder}/${job.info.shortName}${job.info.extension}`;
    if (!siblingSource) throw new Error(`No sibling defs file to copy for ${job.info.shortName}.`);
    const nextId = job.newId || job.info.shortName;
    const text = defsSourceFromSibling(siblingSource, siblingIdOf(siblingSource, nextId), nextId, job.value);
    const mismatch = nrpDefsRoundTripError(text, job.value);
    if (mismatch) return { files: [], reason: `${label}: ${mismatch}` };
    pending.push({ info: job.info, text, label });
  }
  for (const job of pending) {
    await writeSourceText(job.info, job.text);
    written.push(job.label);
  }
  const reportFile = pipelineJsonFileForProject(payload.project, payload.moduleName, 'newReleasePrompt');
  if (reportFile.folder.startsWith(`${payload.moduleName}/${NRP_CANDIDATE_REL}`)) {
    reportFile.folder = `${payload.moduleName}/pipeline`;
  }
  written.push(await writeJson(reportFile, nrpReport(payload, { written: true, reason: null, files: written })));
  return { files: written, reason: null };
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
  if (Array.isArray(current) && Array.isArray(next) && current.length === next.length) return patchArray(source, current, next);
  return JSON.stringify(next);
}

function patchObject(source: string, current: Record<string, unknown>, next: Record<string, unknown>): string {
  const entries = objectEntries(source);
  const dropped = entries.some(entry => !Object.prototype.hasOwnProperty.call(next, entry.key));
  if (dropped) {
    const pieces: string[] = [];
    for (const entry of entries) {
      if (!Object.prototype.hasOwnProperty.call(next, entry.key)) continue;
      const valueText = patchJsonText(source.slice(entry.valueStart, entry.valueEnd), current[entry.key], next[entry.key]);
      pieces.push(`${source.slice(entry.keyStart, entry.valueStart)}${valueText}`);
    }
    for (const key of Object.keys(next)) {
      if (!Object.prototype.hasOwnProperty.call(current, key)) pieces.push(`${JSON.stringify(key)}: ${JSON.stringify(next[key])}`);
    }
    const open = source.indexOf('{');
    const close = source.lastIndexOf('}');
    const body = pieces.length ? pieces.join(',') : '';
    return `${source.slice(0, open + 1)}${body}${source.slice(close)}`;
  }
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
  const inserted = extra.map(key => `${JSON.stringify(key)}: ${JSON.stringify(next[key])}`).join(', ');
  const close = out.lastIndexOf('}');
  const pad = entries.length ? ', ' : '';
  return `${out.slice(0, close)}${pad}${inserted}${out.slice(close)}`;
}

function patchArray(source: string, current: unknown[], next: unknown[]): string {
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

export function nrpReport(payload: NrpWritePayload, planned: NrpPersistPlan): Record<string, unknown> {
  const modelKinds = payload.applied.filter(edit => edit.mode === 'model').map(edit => edit.kind);
  return {
    request: payload.request,
    triage: payload.triage,
    changed: payload.triage.artifacts,
    mechanical: payload.triage.mechanical,
    modelKinds,
    checks: nrpCheckRows(payload.issues),
    freshIssues: nrpFreshIssues(payload.issues),
    calls: payload.modelCalls,
    costUsd: null,
    written: planned.written,
    reason: planned.reason,
    notEdited: nrpFreeTextHits(payload.artifacts.module, removedFieldTerms(payload.triage)).map(hit => ({
      kind: 'module',
      path: hit.path,
      text: hit.text,
      term: hit.term,
      note: 'não editado',
    })),
  };
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

