/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.ts" enhancement="_blank" />

import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import type { NrpArtifactKind } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';
import { validateNs5Journeys } from '/_102035_/l2/solution/gates/journeys20/gate.js';
import { validateNs5Rules } from '/_102035_/l2/solution/gates/rules40/gate.js';
import { validateNs5Workflows } from '/_102035_/l2/solution/gates/workflows50/gate.js';
import { validateNs5Access } from '/_102035_/l2/solution/gates/access60/gate.js';
import { validateNs5Integration } from '/_102035_/l2/solution/gates/integration70/gate.js';
import { runNs5Oracle } from '/_102035_/l2/solution/gates/finalize80/gate.js';
import { ns5OntologyEdges, ns5OntologyEntityViews } from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleRecord } from '/_102035_/l2/solution/rulesView.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/solution/helpers/ns4WorkerTools.js';
import { NRP_EDIT_SCHEMA, NRP_EDIT_TOOL, NRP_JOURNEY_RULES } from '/_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.js';

export type NrpGateKind = NrpArtifactKind | 'coherence';

export interface NrpGateIssue {
  kind: NrpGateKind;
  code: string;
  message: string;
  path: string;
  /** Present when the same kind, code and path already failed before this edit. */
  baseline?: boolean;
}

export interface NrpAppliedEdit {
  mode: 'apply' | 'model';
  kind: NrpArtifactKind | null;
  artifact: unknown;
}

export type NrpGateActionName = 'write' | 'repair' | 'stop';

export interface NrpGateAction {
  action: NrpGateActionName;
  kind: NrpArtifactKind | null;
  /** Why a repair stops. Empty when the gate writes or asks for a repair. */
  reason: string;
}

/** One repair round already spent on a kind, with the errors it saw. */
export interface NrpRepairRound {
  kind: NrpArtifactKind;
  keys: string[];
  lines: string[];
}

export const NRP_REPAIR_ROUNDS = 2;
export const NRP_REPAIR_KINDS = 2;

export function overlayNrpEdits(base: NrpModuleArtifacts, applied: NrpAppliedEdit[]): NrpModuleArtifacts {
  let next = clone(base);
  for (const edit of applied) {
    if (edit.mode === 'apply') {
      next = clone(edit.artifact as NrpModuleArtifacts);
      continue;
    }
    if (!edit.kind) throw new Error('A model edit needs an artifact kind.');
    next = replaceKind(next, edit.kind, edit.artifact);
  }
  return next;
}

/** Per-kind NS5 gate, then finalize80. Ontology v3 entity gates need platform catalogs this agent does not load. */
export function checkNrpGates(artifacts: NrpModuleArtifacts, kinds: readonly NrpArtifactKind[]): NrpGateIssue[] {
  const issues: NrpGateIssue[] = [];
  for (const kind of kinds) {
    if (kind === 'ontology') continue;
    issues.push(...checkKind(artifacts, kind));
  }
  issues.push(...checkCoherence(artifacts));
  return issues;
}

export function nrpIssueKey(issue: NrpGateIssue): string {
  return `${issue.kind}\u0000${issue.code}\u0000${issue.path}`;
}

/** Marks errors that already existed on the unedited module. Those do not fail the edit. */
export function classifyNrpGateIssues(
  baseline: readonly NrpGateIssue[],
  current: readonly NrpGateIssue[],
): NrpGateIssue[] {
  const known = new Set(baseline.map(nrpIssueKey));
  return current.map(issue => known.has(nrpIssueKey(issue)) ? { ...issue, baseline: true } : issue);
}

export function nrpFreshIssues(issues: readonly NrpGateIssue[]): NrpGateIssue[] {
  return issues.filter(issue => !issue.baseline);
}

const PATH_OWNER: Record<string, NrpArtifactKind> = {
  journeys: 'journeys',
  journeyIndex: 'journeys',
  ontology: 'ontology',
  ontologyIndex: 'ontology',
  entities: 'ontology',
  rules: 'rules',
  access: 'access',
  grants: 'access',
  actors: 'access',
  workflows: 'workflows',
  integration: 'integration',
};

/** The artifact kind that owns an error. Coherence uses the path prefix, including an index path. */
export function nrpIssueOwner(issue: NrpGateIssue): NrpArtifactKind | null {
  if (issue.kind !== 'coherence') return issue.kind;
  const head = issue.path.split(/[./[]/u)[0];
  return PATH_OWNER[head] || null;
}

export function nrpIssueLines(issues: readonly NrpGateIssue[], kind: NrpArtifactKind): string[] {
  return nrpFreshIssues(issues)
    .filter(issue => nrpIssueOwner(issue) === kind)
    .map(issue => `${issue.code} ${issue.path}: ${issue.message}`);
}

export interface NrpLocatedIssue {
  file: string;
  pointer: string;
}

/**
 * Maps a gate path onto one file and a pointer inside that file.
 * A path that names no file (coherence, index against a file) stays unmapped.
 */
export function nrpLocateIssue(
  kind: NrpArtifactKind,
  path: string,
  catalog: readonly NrpRepairFile[],
): NrpLocatedIssue | null {
  if (path.includes('/')) return null;
  const parts = pathParts(path);
  if (!parts.length) return null;
  const head = parts[0];
  const files = catalog.filter(file => file.id !== 'index');
  if ((head.key === 'journeys' || head.key === 'entities') && head.index !== null) {
    const file = files[head.index];
    const pointer = pointerFrom(parts.slice(1));
    return file && pointer ? { file: file.id, pointer } : null;
  }
  if (head.key === 'journeyIndex' || head.key === 'ontologyIndex') {
    const pointer = pointerFrom(parts.slice(1));
    return catalog.some(file => file.id === 'index') && pointer ? { file: 'index', pointer } : null;
  }
  if (head.key === 'rules' && kind === 'rules') {
    const ruleId = ruleIdFrom(parts, catalog);
    return ruleId ? { file: 'rules', pointer: `/rules/${escapePointer(ruleId)}` } : null;
  }
  if (catalog.length !== 1) return null;
  const pointer = pointerFrom(parts);
  return pointer ? { file: catalog[0].id, pointer } : null;
}

/** Adds the file and pointer the error expects when the repair names a place that is not there. */
export function nrpAnnotateRepairRefusal(
  kind: NrpArtifactKind,
  issues: readonly NrpGateIssue[],
  catalog: readonly NrpRepairFile[],
  message: string,
): string {
  if (!/does not exist|is not a target/u.test(message)) return message;
  const expected = nrpFreshIssues(issues)
    .filter(issue => nrpIssueOwner(issue) === kind)
    .map(issue => nrpLocateIssue(kind, issue.path, catalog))
    .filter((located): located is NrpLocatedIssue => !!located);
  if (!expected.length) return message;
  const pairs = expected.map(located => `file: ${located.file} pointer: ${located.pointer}`).join('; ');
  return `${message} Expected ${pairs}.`;
}

function pathParts(path: string): Array<{ key: string; index: number | null }> {
  const parts: Array<{ key: string; index: number | null }> = [];
  const pattern = /([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?/gu;
  let match = pattern.exec(path);
  while (match) {
    parts.push({ key: match[1], index: match[2] === undefined ? null : Number(match[2]) });
    match = pattern.exec(path);
  }
  return parts;
}

function ruleIdFrom(parts: Array<{ key: string; index: number | null }>, catalog: readonly NrpRepairFile[]): string | null {
  const second = parts[1];
  if (second && second.index === null) return second.key;
  const rules = catalog.find(file => file.id === 'rules');
  const root = rules?.artifact;
  if (!root || typeof root !== 'object' || Array.isArray(root)) return null;
  const list = (root as Record<string, unknown>).rules;
  if (!Array.isArray(list) || parts[0].index === null) return null;
  const row = list[parts[0].index];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const ruleId = (row as Record<string, unknown>).ruleId;
  return typeof ruleId === 'string' && ruleId ? ruleId : null;
}

function pointerFrom(parts: Array<{ key: string; index: number | null }>): string | null {
  if (!parts.length) return null;
  const tokens: string[] = [];
  for (const part of parts) {
    tokens.push(escapePointer(part.key));
    if (part.index !== null) tokens.push(String(part.index));
  }
  return `/${tokens.join('/')}`;
}

function escapePointer(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function nrpRepairRoundCounts(rounds: readonly NrpRepairRound[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const round of rounds) counts[round.kind] = (counts[round.kind] || 0) + 1;
  return counts;
}

function sameKeySet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const ranked = [...right].sort();
  return [...left].sort().every((key, index) => key === ranked[index]);
}

/**
 * Up to two repair rounds per kind, and two kinds per run.
 * A second round runs only when the kind's error set changed.
 */
export function nrpGateAction(
  issues: readonly NrpGateIssue[],
  changed: readonly NrpArtifactKind[],
  rounds: readonly NrpRepairRound[],
): NrpGateAction {
  const fresh = nrpFreshIssues(issues);
  if (!fresh.length) return { action: 'write', kind: null, reason: '' };
  const touched = new Set<NrpArtifactKind>(changed);
  const owners: NrpArtifactKind[] = [];
  for (const issue of fresh) {
    const owner = nrpIssueOwner(issue);
    if (!owner || owners.includes(owner)) continue;
    if (!touched.has(owner) && issue.kind !== 'coherence') continue;
    owners.push(owner);
  }
  const spentKinds = new Set(rounds.map(round => round.kind));
  let stalled = '';
  let capped = '';
  for (const owner of owners) {
    const spent = rounds.filter(round => round.kind === owner);
    const keys = nrpFreshIssues(issues).filter(issue => nrpIssueOwner(issue) === owner).map(nrpIssueKey);
    if (spent.length >= NRP_REPAIR_ROUNDS) {
      capped = `Repair of ${owner} already used ${NRP_REPAIR_ROUNDS} rounds.`;
      continue;
    }
    const previous = spent[spent.length - 1];
    if (previous && sameKeySet(previous.keys, keys)) {
      stalled = `Repair of ${owner} left the same errors.`;
      continue;
    }
    if (!spentKinds.has(owner) && spentKinds.size >= NRP_REPAIR_KINDS) {
      capped = `Repair already covered ${NRP_REPAIR_KINDS} artifact kinds.`;
      continue;
    }
    return { action: 'repair', kind: owner, reason: '' };
  }
  return { action: 'stop', kind: null, reason: stalled || capped };
}

export function nrpMayWrite(action: NrpGateActionName): boolean {
  return action === 'write';
}

export interface NrpRepairFile {
  id: string;
  artifact: unknown;
}

/** Every file of one kind. The repair prompt keeps the index and the files an error names. */
export function nrpKindCatalog(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind): NrpRepairFile[] {
  if (kind === 'journeys') {
    return [
      { id: 'index', artifact: artifacts.journeyIndex },
      ...artifacts.journeys.map(journey => ({ id: journey.journeyId, artifact: journey })),
    ];
  }
  if (kind === 'ontology') {
    return [
      { id: 'index', artifact: artifacts.ontologyIndex },
      ...artifacts.entities.map(entity => ({ id: entity.entityId, artifact: entity })),
    ];
  }
  const slice = kind === 'rules' ? artifacts.rules
    : kind === 'access' ? artifacts.access
      : kind === 'workflows' ? artifacts.workflows
        : artifacts.integration;
  return [{ id: kind, artifact: slice }];
}

/** File ids named in an error message or path. Longer ids win, so one id is not a piece of another. */
export function nrpCitedFileIds(
  issues: readonly NrpGateIssue[],
  kind: NrpArtifactKind,
  ids: readonly string[],
): string[] {
  const haystacks = nrpFreshIssues(issues)
    .filter(issue => nrpIssueOwner(issue) === kind)
    .map(issue => `${issue.path}\n${issue.message}`);
  const cited: string[] = [];
  const ranked = [...ids].filter(id => id && id !== 'index').sort((a, b) => b.length - a.length);
  for (const id of ranked) {
    if (haystacks.some(hay => idInText(hay, id))) cited.push(id);
  }
  return cited;
}

/** Index of the kind, plus the files the errors cite. A single-file kind stays that one file. */
export function nrpRepairPromptFiles(
  kind: NrpArtifactKind,
  issues: readonly NrpGateIssue[],
  catalog: readonly NrpRepairFile[],
): NrpRepairFile[] {
  const cited = new Set(nrpCitedFileIds(issues, kind, catalog.map(file => file.id)));
  const chosen: NrpRepairFile[] = [];
  const index = catalog.find(file => file.id === 'index');
  if (index && (kind === 'journeys' || kind === 'ontology')) chosen.push(index);
  for (const file of catalog) {
    if (file.id === 'index') continue;
    if (cited.has(file.id) || (!cited.size && catalog.length === 1)) chosen.push(file);
  }
  return chosen;
}

/**
 * A repair that edits only the index does not answer an error about a file.
 * Returns the refusal, or null when the edit touches a cited file or the error is about the index.
 */
export function nrpIndexOnlyRepairMessage(
  kind: NrpArtifactKind,
  issues: readonly NrpGateIssue[],
  edited: readonly { id: string }[],
): string | null {
  if (!edited.length || edited.some(file => file.id !== 'index')) return null;
  const owned = nrpFreshIssues(issues).filter(issue => nrpIssueOwner(issue) === kind);
  if (owned.length && owned.every(issue => issue.path.split(/[./[\]]/u).includes('index') || issue.path.includes('Index'))) {
    return null;
  }
  return `Repair changed only the index. ${nrpRepairAsk(owned)}`;
}

export function buildNrpRepairHumanPrompt(
  request: string,
  kind: NrpArtifactKind,
  issues: readonly NrpGateIssue[],
  catalog: readonly NrpRepairFile[],
  allowed: readonly string[] = [],
  shape: { rule: string; file: { id: string; artifact: unknown } } | null = null,
  earlier: readonly string[] = [],
): string {
  const lines = nrpRepairIssueLines(issues, kind, catalog);
  const files = nrpRepairPromptFiles(kind, issues, catalog);
  const parts = [
    `Kind: ${kind}`,
    `Request:\n${request}`,
    `Verification:\n${lines.join('\n')}`,
    'A pointer is inside the named file. It is not a path through the whole kind.',
  ];
  if (earlier.length) {
    parts.push(`Earlier verification:\n${earlier.join('\n')}\nThe error set changed since the previous repair of this kind.`);
  }
  if (allowed.length) parts.push(`Allowed files: ${allowed.join(', ')}`);
  if (issues.some(issue => issue.code === 'NS5_JOURNEY_TWIN' || issue.code === 'NS5_JOURNEY_STEP_KIND')) {
    parts.push(NRP_JOURNEY_RULES);
  }
  if (shape) {
    parts.push(`${shape.rule}\nSibling ${shape.file.id} (reference only):\n${JSON.stringify(shape.file.artifact)}`);
  }
  parts.push(`Files:\n${files.map(file => `${file.id}\n${JSON.stringify(file.artifact)}`).join('\n')}`);
  return parts.join('\n\n');
}

function nrpRepairIssueLines(
  issues: readonly NrpGateIssue[],
  kind: NrpArtifactKind,
  catalog: readonly NrpRepairFile[],
): string[] {
  return nrpFreshIssues(issues)
    .filter(issue => nrpIssueOwner(issue) === kind)
    .map(issue => {
      const located = nrpLocateIssue(kind, issue.path, catalog);
      if (!located) return `${issue.code} ${issue.path}: ${issue.message}`;
      return `${issue.code} file: ${located.file} pointer: ${located.pointer}: ${issue.message}`;
    });
}

function nrpRepairAsk(issues: readonly NrpGateIssue[]): string {
  const text = issues.map(issue => `${issue.code} ${issue.message}`).join('\n');
  if (/twin|unique/iu.test(text)) {
    return 'A uniqueness or twin error asks you to change the actor, the entity, or the operations of one cited file, or to remove the redundant file.';
  }
  if (/unknown|reference|not found|missing/iu.test(text)) {
    return 'A reference error asks you to create or correct the file the error names.';
  }
  if (!issues.length) return 'Change one of the files the error names.';
  return issues.map(issue => `${issue.code}: ${issue.message}`).join(' ');
}

function idInText(hay: string, id: string): boolean {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`, 'u').test(hay);
}

export const NRP_REPAIR_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
Repair the L4 files named in the message. The full user request is in the message. Keep every rule and value the request does not change.
Call submitNrpEdit. Return small operations. Do not repeat a file.
operations is a list of {file, op, pointer, expectedJson, valueJson, reason}. Every field is required. Use an empty string when a field does not apply.
op is set, add, remove, or create.
pointer is an RFC 6901 pointer. add on a list ends with /- or with an index from 0 through the list length, which inserts before that item. add on an object ends with the new key.
valueJson is one small JSON value, not the file. expectedJson is the current JSON value and is required for set and remove.
A uniqueness or twin error asks you to change the actor, the entity, or the operations of one cited file, or to remove the redundant file.
A reference error asks you to create or correct the file the error names.
An error that is not about the index is not fixed by editing only the index.`;

export function buildNrpRepairTool(): mls.msg.LLMTool {
  return createNs4FlexibleWorkerTool(
    NRP_EDIT_TOOL,
    'Return small JSON operations that repair the named files. Do not return a file.',
    NRP_EDIT_SCHEMA,
  );
}

function checkKind(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind): NrpGateIssue[] {
  try {
    if (kind === 'rules') {
      return mapIssues(kind, validateNs5Rules(ns5RuleRecord(artifacts.rules), { moduleName: artifacts.module.moduleName }).issues);
    }
    if (kind === 'journeys') {
      const actors = artifacts.access.actors || [];
      return mapIssues(kind, validateNs5Journeys(
        artifacts.journeys.map(journey => ({ journeyId: journey.journeyId, business: journey.business })),
        { actors, moduleName: artifacts.module.moduleName },
      ).issues);
    }
    const views = ns5OntologyEntityViews(artifacts.entities);
    if (kind === 'workflows') {
      return mapIssues(kind, validateNs5Workflows(artifacts.workflows.processes, {
        moduleName: artifacts.module.moduleName,
        actorIds: (artifacts.access.actors || []).map(actor => actor.actorId),
        journeys: artifacts.journeys,
        entities: views,
        journeyDecisions: artifacts.workflows.journeyDecisions,
      }).issues);
    }
    if (kind === 'access') {
      return mapIssues(kind, validateNs5Access(artifacts.access.grants, {
        moduleName: artifacts.module.moduleName,
        actors: artifacts.access.actors,
        entities: views,
        relationships: ns5OntologyEdges(artifacts.ontologyIndex),
        journeys: artifacts.journeys,
      }).issues);
    }
    return mapIssues(kind, validateNs5Integration(
      artifacts.integration.inbound,
      artifacts.integration.outbound,
      artifacts.integration.plugins,
      {
        moduleName: artifacts.module.moduleName,
        actors: artifacts.access.actors || [],
        entities: views,
        registryModuleNames: [artifacts.module.moduleName],
        sourcePrompt: artifacts.module.sourcePrompt || '',
        journeySteps: artifacts.journeys.map(journey => ({
          journeyId: journey.journeyId,
          stepIds: journey.business.steps.map(step => step.stepId),
        })),
        processTasks: artifacts.workflows.processes.map(process => ({
          processId: process.processId,
          taskIds: process.tasks.map(task => task.taskId),
        })),
      },
    ).issues);
  } catch (error) {
    console.error(`[agentNewReleasePrompt] ${kind} verification failed`, error);
    return [{
      kind,
      code: 'NRP_GATE_FAILED',
      message: error instanceof Error ? error.message : String(error),
      path: '$',
    }];
  }
}

function checkCoherence(artifacts: NrpModuleArtifacts): NrpGateIssue[] {
  try {
    const report = runNs5Oracle({
      module: artifacts.module,
      journeys: artifacts.journeys,
      journeyIndex: artifacts.journeyIndex,
      entities: ns5OntologyEntityViews(artifacts.entities),
      ontologyIndex: artifacts.ontologyIndex,
      rules: artifacts.rules,
      workflows: artifacts.workflows,
      access: artifacts.access,
      integration: artifacts.integration,
    });
    return report.errors.map(error => ({
      kind: 'coherence' as const,
      code: error.code,
      message: error.message,
      path: error.path,
    }));
  } catch (error) {
    console.error('[agentNewReleasePrompt] finalize80 rejected the candidate', error);
    return [{
      kind: 'coherence',
      code: 'NRP_FINALIZE_FAILED',
      message: error instanceof Error ? error.message : String(error),
      path: '$',
    }];
  }
}

function mapIssues(
  kind: NrpArtifactKind,
  issues: ReadonlyArray<{ severity: 'error' | 'warning'; code: string; message: string; path?: string }>,
): NrpGateIssue[] {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => ({ kind, code: issue.code, message: issue.message, path: issue.path || '$' }));
}

function replaceKind(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind, slice: unknown): NrpModuleArtifacts {
  const next = clone(artifacts);
  const root = record(slice, 'Edited artifact');
  if (!Array.isArray(root.files)) throw new Error('A model edit lists files.');
  for (const item of root.files) {
    const file = record(item, 'Edited file');
    const id = file.id;
    if (typeof id !== 'string' || !id) throw new Error('An edited file needs an id.');
    const body = file.artifact;
    if (kind === 'ontology') {
      if (id === 'index') next.ontologyIndex = body as NrpModuleArtifacts['ontologyIndex'];
      else next.entities = upsert(next.entities, 'entityId', id, body);
    } else if (kind === 'journeys') {
      if (id === 'index') next.journeyIndex = body as NrpModuleArtifacts['journeyIndex'];
      else next.journeys = upsert(next.journeys, 'journeyId', id, body);
    } else if (kind === 'rules') next.rules = body as NrpModuleArtifacts['rules'];
    else if (kind === 'access') next.access = body as NrpModuleArtifacts['access'];
    else if (kind === 'workflows') next.workflows = body as NrpModuleArtifacts['workflows'];
    else next.integration = body as NrpModuleArtifacts['integration'];
  }
  return next;
}

function upsert<T>(items: T[], key: keyof T, id: string, body: unknown): T[] {
  const next = items.slice();
  const index = next.findIndex(item => (item as Record<string, unknown>)[key as string] === id);
  if (index < 0) next.push(body as T);
  else next[index] = body as T;
  return next;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
