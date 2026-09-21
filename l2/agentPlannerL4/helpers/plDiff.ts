/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plDiff.ts" enhancement="_blank"/>

import { parseNs4ClassicDefsSource as parseDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import {
  fileExists,
  moduleFile,
  moduleFolder,
  normalizeModuleName,
  readDefsJson,
  readJson,
  writeJson,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import {
  isNs5OntologyEntityV3,
  type Ns5AccessArtifact,
  type Ns5IntegrationArtifact,
  type Ns5OntologyAnyEntity,
  type Ns5OntologyFieldV3,
  type Ns5RulesAny,
  type Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import { ns5OntologyEntityIds, type Ns5OntologyAnyIndex } from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleEntries } from '/_102035_/l2/solution/rulesView.js';

export const L4_DIFF_SCHEMA = '2026-09-21-p4-l4diff-v1' as const;

export const L4_DIFF_OPS = ['added', 'changed', 'removed'] as const;
export type L4DiffOp = (typeof L4_DIFF_OPS)[number];

export const L4_DIFF_KINDS = [
  'entity', 'field', 'transition', 'rule', 'grant', 'process', 'task', 'inbound', 'outbound',
] as const;
export type L4DiffKind = (typeof L4_DIFF_KINDS)[number];

export interface L4DiffItem {
  changeId: string;
  kind: L4DiffKind;
  op: L4DiffOp;
  entity: string;
  source: string;
  before?: unknown;
  after?: unknown;
}

export interface L4Diff {
  schemaVersion: typeof L4_DIFF_SCHEMA;
  moduleName: string;
  base: string;
  candidate: string;
  items: L4DiffItem[];
}

interface FieldSlice {
  fieldId: string;
  type: string;
  derived: boolean;
}

interface TransitionSlice {
  transitionId: string;
  from: string[];
  to: string;
  by: string[] | 'system' | 'time';
  description: string;
  ruleRefs: string[];
}

interface EntitySlice {
  entityId: string;
  source: string;
  fields: Record<string, FieldSlice>;
  transitions: Record<string, TransitionSlice>;
}

interface GrantSlice {
  grantId: string;
  entityRefs: string[];
  dataScope: unknown;
  disclosure: unknown;
}

interface TaskSlice {
  taskId: string;
  kind: string;
  actorRef: string;
  journeyRef: string;
  entityRef: string;
  effect: string;
  transitionRef: string;
  next: string[];
  description: string;
}

interface ProcessSlice {
  processId: string;
  title: string;
  description: string;
  trigger: unknown;
  tasks: Record<string, TaskSlice>;
}

interface IntegrationSlice {
  id: string;
  kind: string;
  from: string;
  to: string;
  event: string;
  writes: string[];
  effect: string;
  transitionRef: string;
  on: string;
  description: string;
  entityRefs: string[];
}

export interface L4DiffSnapshot {
  entities: Record<string, EntitySlice>;
  rules: Record<string, { ruleId: string; description: string }>;
  grants: Record<string, GrantSlice>;
  processes: Record<string, ProcessSlice>;
  inbound: Record<string, IntegrationSlice>;
  outbound: Record<string, IntegrationSlice>;
}

function emptySnapshot(): L4DiffSnapshot {
  return { entities: {}, rules: {}, grants: {}, processes: {}, inbound: {}, outbound: {} };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item)) : [];
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fileAt(project: number, root: string, rel: string): Ns5FileInfo {
  const last = rel.lastIndexOf('/');
  const folder = last < 0 ? root : `${root}/${rel.slice(0, last)}`;
  const name = last < 0 ? rel : rel.slice(last + 1);
  const dot = name.indexOf('.');
  return {
    project,
    level: 4,
    folder,
    shortName: dot < 0 ? name : name.slice(0, dot),
    extension: dot < 0 ? '' : name.slice(dot),
  };
}

function walkV3Fields(fields: Record<string, Ns5OntologyFieldV3> | undefined, parent: string, out: Record<string, FieldSlice>): void {
  for (const [id, field] of Object.entries(fields || {})) {
    const fieldId = parent ? `${parent}.${id}` : id;
    out[fieldId] = { fieldId, type: String(field.type || ''), derived: field.derived === true };
    if (field.fields) walkV3Fields(field.fields as Record<string, Ns5OntologyFieldV3>, fieldId, out);
  }
}

function entitySlice(entity: Ns5OntologyAnyEntity, source: string): EntitySlice {
  const fields: Record<string, FieldSlice> = {};
  const transitions: Record<string, TransitionSlice> = {};
  if (isNs5OntologyEntityV3(entity)) {
    walkV3Fields(entity.record?.fields as Record<string, Ns5OntologyFieldV3> | undefined, '', fields);
    for (const row of entity.transitions || []) {
      transitions[row.transitionId] = {
        transitionId: row.transitionId,
        from: [...row.from],
        to: row.to,
        by: [...row.by],
        description: row.description,
        ruleRefs: [...(row.ruleRefs || [])],
      };
    }
  } else {
    for (const field of entity.fields || []) {
      fields[field.fieldId] = { fieldId: field.fieldId, type: field.type, derived: false };
    }
    for (const [fieldId, detail] of Object.entries(entity.details || {})) {
      fields[fieldId] = { fieldId, type: detail.type, derived: true };
    }
    for (const row of entity.transitions || []) {
      transitions[row.transitionId] = {
        transitionId: row.transitionId,
        from: [...row.from],
        to: row.to,
        by: row.by,
        description: row.description,
        ruleRefs: [...(row.ruleRefs || [])],
      };
    }
  }
  return { entityId: entity.entityId, source, fields, transitions };
}

function grantSlice(grant: Ns5AccessArtifact['grants'][number]): GrantSlice {
  return {
    grantId: grant.grantId,
    entityRefs: [...grant.entityRefs],
    dataScope: grant.dataScope,
    disclosure: grant.disclosure,
  };
}

function processSlice(process: Ns5WorkflowsArtifact['processes'][number]): ProcessSlice {
  const tasks: Record<string, TaskSlice> = {};
  for (const task of process.tasks || []) {
    tasks[task.taskId] = {
      taskId: task.taskId,
      kind: task.kind,
      actorRef: asString(task.actorRef),
      journeyRef: asString(task.journeyRef),
      entityRef: asString(task.entityRef),
      effect: asString(task.effect),
      transitionRef: asString(task.transitionRef),
      next: [...(task.next || [])],
      description: task.description,
    };
  }
  return {
    processId: process.processId,
    title: process.title,
    description: process.description,
    trigger: process.trigger,
    tasks,
  };
}

function integrationSlice(item: Ns5IntegrationArtifact['inbound'][number]): IntegrationSlice {
  return {
    id: item.id,
    kind: item.kind,
    from: asString(item.from),
    to: asString(item.to),
    event: asString(item.event),
    writes: asStringArray(item.writes),
    effect: asString(item.effect),
    transitionRef: asString(item.transitionRef),
    on: asString(item.on),
    description: item.description,
    entityRefs: [...(item.entityRefs || [])],
  };
}

export function snapshotFromParsed(input: {
  entities: Array<{ entity: Ns5OntologyAnyEntity; source: string }>;
  rules: Ns5RulesAny | null;
  access: Ns5AccessArtifact | null;
  workflows: Ns5WorkflowsArtifact | null;
  integration: Ns5IntegrationArtifact | null;
}): L4DiffSnapshot {
  const snap = emptySnapshot();
  for (const row of input.entities) snap.entities[row.entity.entityId] = entitySlice(row.entity, row.source);
  if (input.rules) {
    for (const rule of ns5RuleEntries(input.rules)) snap.rules[rule.ruleId] = rule;
  }
  if (input.access) {
    for (const grant of input.access.grants || []) snap.grants[grant.grantId] = grantSlice(grant);
  }
  if (input.workflows) {
    for (const process of input.workflows.processes || []) snap.processes[process.processId] = processSlice(process);
  }
  if (input.integration) {
    for (const item of input.integration.inbound || []) snap.inbound[item.id] = integrationSlice(item);
    for (const item of input.integration.outbound || []) snap.outbound[item.id] = integrationSlice(item);
  }
  return snap;
}

function pushMapDiff<T>(
  items: L4DiffItem[],
  kind: L4DiffKind,
  beforeMap: Record<string, T>,
  afterMap: Record<string, T>,
  sourceOf: (id: string, value: T, side: 'before' | 'after') => string,
  entityOf: (id: string, value: T) => string,
): void {
  const ids = new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]);
  for (const id of [...ids].sort()) {
    const before = beforeMap[id];
    const after = afterMap[id];
    if (!before && after) {
      items.push({
        changeId: `${kind}:${id}`, kind, op: 'added', entity: entityOf(id, after),
        source: sourceOf(id, after, 'after'), after,
      });
      continue;
    }
    if (before && !after) {
      items.push({
        changeId: `${kind}:${id}`, kind, op: 'removed', entity: entityOf(id, before),
        source: sourceOf(id, before, 'before'), before,
      });
      continue;
    }
    if (before && after && !sameJson(before, after)) {
      items.push({
        changeId: `${kind}:${id}`, kind, op: 'changed', entity: entityOf(id, after),
        source: sourceOf(id, after, 'after'), before, after,
      });
    }
  }
}

export function diffL4Snapshots(base: L4DiffSnapshot, candidate: L4DiffSnapshot): L4DiffItem[] {
  const items: L4DiffItem[] = [];
  const entityIds = new Set([...Object.keys(base.entities), ...Object.keys(candidate.entities)]);
  for (const entityId of [...entityIds].sort()) {
    const before = base.entities[entityId];
    const after = candidate.entities[entityId];
    if (!before && after) {
      items.push({
        changeId: `entity:${entityId}`, kind: 'entity', op: 'added', entity: entityId,
        source: after.source, after: { entityId },
      });
    } else if (before && !after) {
      items.push({
        changeId: `entity:${entityId}`, kind: 'entity', op: 'removed', entity: entityId,
        source: before.source, before: { entityId },
      });
    }
    pushMapDiff(
      items, 'field',
      before?.fields || {}, after?.fields || {},
      () => (after || before)?.source || `ontology/${entityId}.defs.ts`,
      () => entityId,
    );
    pushMapDiff(
      items, 'transition',
      before?.transitions || {}, after?.transitions || {},
      () => (after || before)?.source || `ontology/${entityId}.defs.ts`,
      () => entityId,
    );
  }
  pushMapDiff(items, 'rule', base.rules, candidate.rules, () => 'rules.defs.ts', () => '');
  pushMapDiff(items, 'grant', base.grants, candidate.grants, () => 'access.defs.ts', () => '');
  pushMapDiff(
    items, 'process',
    Object.fromEntries(Object.entries(base.processes).map(([id, row]) => [id, { processId: row.processId, title: row.title, description: row.description, trigger: row.trigger }])),
    Object.fromEntries(Object.entries(candidate.processes).map(([id, row]) => [id, { processId: row.processId, title: row.title, description: row.description, trigger: row.trigger }])),
    () => 'workflows.defs.ts',
    () => '',
  );
  const beforeTasks: Record<string, TaskSlice & { processId: string }> = {};
  const afterTasks: Record<string, TaskSlice & { processId: string }> = {};
  for (const process of Object.values(base.processes)) {
    for (const task of Object.values(process.tasks)) beforeTasks[`${process.processId}.${task.taskId}`] = { ...task, processId: process.processId };
  }
  for (const process of Object.values(candidate.processes)) {
    for (const task of Object.values(process.tasks)) afterTasks[`${process.processId}.${task.taskId}`] = { ...task, processId: process.processId };
  }
  pushMapDiff(items, 'task', beforeTasks, afterTasks, () => 'workflows.defs.ts', () => '');
  pushMapDiff(items, 'inbound', base.inbound, candidate.inbound, () => 'integration.defs.ts', () => '');
  pushMapDiff(items, 'outbound', base.outbound, candidate.outbound, () => 'integration.defs.ts', () => '');
  return items.sort((a, b) => a.changeId.localeCompare(b.changeId) || a.op.localeCompare(b.op));
}

async function readDefsAt<T>(info: Ns5FileInfo): Promise<T | null> {
  const parsed = await readDefsJson<T>(info);
  if (parsed) return parsed;
  return null;
}

export { parseDefsSource };

async function loadSnapshot(project: number, root: string): Promise<L4DiffSnapshot> {
  if (!root) return emptySnapshot();
  const index = await readDefsAt<Ns5OntologyAnyIndex>(fileAt(project, root, 'ontology/index.defs.ts'));
  const entities: Array<{ entity: Ns5OntologyAnyEntity; source: string }> = [];
  if (index) {
    for (const entityId of ns5OntologyEntityIds(index)) {
      const source = `ontology/${entityId}.defs.ts`;
      const entity = await readDefsAt<Ns5OntologyAnyEntity>(fileAt(project, root, source));
      if (entity) entities.push({ entity, source });
    }
  }
  return snapshotFromParsed({
    entities,
    rules: await readDefsAt<Ns5RulesAny>(fileAt(project, root, 'rules.defs.ts')),
    access: await readDefsAt<Ns5AccessArtifact>(fileAt(project, root, 'access.defs.ts')),
    workflows: await readDefsAt<Ns5WorkflowsArtifact>(fileAt(project, root, 'workflows.defs.ts')),
    integration: await readDefsAt<Ns5IntegrationArtifact>(fileAt(project, root, 'integration.defs.ts')),
  });
}

async function findSealedBaseRoot(moduleName: string): Promise<string> {
  const canonical = normalizeModuleName(moduleName);
  const project = moduleFile(moduleName).project;
  const active = await readJson<{ baseId?: unknown }>(
    { project, level: 4, folder: `${canonical}/pipeline/changes`, shortName: 'active', extension: '.json' },
  );
  const fromActive = typeof active?.baseId === 'string' ? active.baseId.trim() : '';
  if (fromActive) return `${canonical}/pipeline/releases/${fromActive}/l4`;
  const catalog = await readJson<{ releases?: Array<{ baseId?: unknown; createdAt?: unknown }> }>(
    { project, level: 4, folder: `${canonical}/pipeline/releases`, shortName: 'index', extension: '.json' },
  );
  const releases = Array.isArray(catalog?.releases) ? catalog.releases : [];
  const ranked = releases
    .map(row => ({ baseId: typeof row.baseId === 'string' ? row.baseId.trim() : '', createdAt: typeof row.createdAt === 'string' ? row.createdAt : '' }))
    .filter(row => row.baseId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const baseId = ranked[ranked.length - 1]?.baseId || '';
  return baseId ? `${canonical}/pipeline/releases/${baseId}/l4` : '';
}

/** Label written to `l4diff.json.base` plus the literal folder `loadSnapshot` reads. */
async function resolveBase(moduleName: string): Promise<{ base: string; root: string }> {
  const canonical = normalizeModuleName(moduleName);
  const sealed = await findSealedBaseRoot(moduleName);
  if (sealed) return { base: sealed, root: sealed };
  const project = moduleFile(moduleName).project;
  if (!fileExists(fileAt(project, canonical, 'module.defs.ts'))) return { base: '', root: '' };
  return { base: 'canonical', root: canonical };
}

export function emptyL4Diff(moduleName: string, base = '', candidate = ''): L4Diff {
  return {
    schemaVersion: L4_DIFF_SCHEMA,
    moduleName: normalizeModuleName(moduleName),
    base,
    candidate,
    items: [],
  };
}

export function l4diffFile(moduleName: string, box: 'l1' | 'l2'): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return { project: base.project, level: 4, folder: `${base.folder}/pool/${box}/web`, shortName: 'l4diff', extension: '.json' };
}

export async function runPlDiff(moduleName: string): Promise<L4Diff> {
  const existing = normalizeModuleName(moduleName);
  const candidate = moduleFolder(existing);
  const canonical = existing;
  const hasCandidate = candidate !== canonical;
  if (!hasCandidate) {
    const empty = emptyL4Diff(existing);
    await writeJson(l4diffFile(existing, 'l1'), empty);
    await writeJson(l4diffFile(existing, 'l2'), empty);
    return empty;
  }
  const project = moduleFile(existing).project;
  const resolved = await resolveBase(existing);
  const items = diffL4Snapshots(
    await loadSnapshot(project, resolved.root),
    await loadSnapshot(project, candidate),
  );
  const diff: L4Diff = {
    schemaVersion: L4_DIFF_SCHEMA, moduleName: existing, base: resolved.base, candidate, items,
  };
  await writeJson(l4diffFile(existing, 'l1'), diff);
  await writeJson(l4diffFile(existing, 'l2'), diff);
  return diff;
}
