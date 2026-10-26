/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plDiff.ts" enhancement="_blank"/>

import { readL4Revision } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { parseNs4ClassicDefsSource as parseDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import {
  declaredRevisionBaseId,
  loadPlRevision,
  parseRevisionRoot,
  releaseL4Present,
  releaseL4Root,
  releaseMissingRefusal,
  revisionMissingRefusal,
  type PlRevisionIdentity,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
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
  type Ns5JourneyArtifact,
  type Ns5JourneyIndexArtifact,
  type Ns5JourneyIndexEntry,
  type Ns5JourneyStep,
  type Ns5OntologyAnyEntity,
  type Ns5OntologyFieldV3,
  type Ns5RulesAny,
  type Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import { ns5OntologyEntityIds, type Ns5OntologyAnyIndex } from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleEntries } from '/_102035_/l2/solution/rulesView.js';
import {
  L4_DIFF_SCHEMA,
  L4_DIFF_OPS,
  L4_DIFF_KINDS,
  L4_TEXT_ATTRIBUTES,
  type L4DiffOp,
  type L4DiffKind,
  type L4DiffItem,
  type L4Diff,
} from '/_102035_/l2/solution/poolPlan.js';
// 2026-10-08: reexport until consumers import from poolPlan. Remove this block when they migrate.
export {
  L4_DIFF_SCHEMA,
  L4_DIFF_OPS,
  L4_DIFF_KINDS,
  type L4DiffOp,
  type L4DiffKind,
  type L4DiffItem,
  type L4Diff,
};



interface FieldSlice {
  fieldId: string;
  type: string;
  derived: boolean;
  title: string;
  description: string;
  /** Enum codes plus their labels. Absent when the field has no closed domain. */
  values?: unknown[];
  /** Every other attribute of the field (`required`, `maxLength`, `to`, …). Nested `fields` are not here. */
  [attr: string]: unknown;
}

interface TransitionSlice {
  transitionId: string;
  from: string[];
  to: string;
  by: string[] | 'system' | 'time';
  description: string;
  ruleRefs: string[];
  /** Every other attribute of the transition. */
  [attr: string]: unknown;
}

interface EntitySlice {
  entityId: string;
  source: string;
  fields: Record<string, FieldSlice>;
  transitions: Record<string, TransitionSlice>;
  /** Sentence of what the table starts with. Absent on a recorded table reads as ''. */
  initialData: string;
  /** Every other attribute of the entity. `fields` / `transitions` / `record.fields` are not here. */
  [attr: string]: unknown;
}

interface GrantSlice {
  grantId: string;
  entityRefs: string[];
  dataScope: unknown;
  disclosure: unknown;
  /** Every other attribute of the grant (`title`, `description`, `actorRef`, …). */
  [attr: string]: unknown;
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
  wake?: { mode: 'none' | 'periodic'; every?: string };
  /** Every other attribute of the task. */
  [attr: string]: unknown;
}

interface ProcessSlice {
  processId: string;
  title: string;
  description: string;
  trigger: unknown;
  functions: Record<string, string>;
  room?: 'exclusive' | 'person' | 'group';
  tasks: Record<string, TaskSlice>;
  /** Every other attribute of the process. `tasks` are not here. */
  [attr: string]: unknown;
}

interface JourneySlice {
  journeyId: string;
  /** Index row for this journey (`journeys/index.defs.ts`). */
  index: Record<string, unknown>;
  /** Every `business` attribute except `steps`. `schemaVersion` and `businessHash` are not here. */
  [attr: string]: unknown;
}

interface StepSlice {
  journeyId: string;
  stepId: string;
  /** Every attribute of the step. */
  [attr: string]: unknown;
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
  /** Every other attribute of the integration row. */
  [attr: string]: unknown;
}

export interface L4DiffSnapshot {
  entities: Record<string, EntitySlice>;
  rules: Record<string, { ruleId: string; description: string }>;
  grants: Record<string, GrantSlice>;
  processes: Record<string, ProcessSlice>;
  inbound: Record<string, IntegrationSlice>;
  outbound: Record<string, IntegrationSlice>;
  journeys: Record<string, JourneySlice>;
  steps: Record<string, StepSlice>;
}

function emptySnapshot(): L4DiffSnapshot {
  return {
    entities: {}, rules: {}, grants: {}, processes: {}, inbound: {}, outbound: {},
    journeys: {}, steps: {},
  };
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

/** Copies every own attribute. `skip` is only the children that already have their own diff item. */
function assignOwn(target: Record<string, unknown>, source: object, skip: ReadonlySet<string>): void {
  for (const [key, value] of Object.entries(source)) {
    if (skip.has(key)) continue;
    target[key] = value;
  }
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

function textAttrs(source: object): { title: string; description: string } {
  const record = source as Record<string, unknown>;
  const out = { title: '', description: '' };
  for (const key of L4_TEXT_ATTRIBUTES) {
    const value = record[key];
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/** Codes plus `L4_TEXT_ATTRIBUTES` only, so a label edit is visible and an added code is not text. */
function enumLabels(field: { values?: unknown; enum?: unknown }): unknown[] | undefined {
  const raw = field.values ?? field.enum;
  if (!Array.isArray(raw)) return undefined;
  return raw.map(item => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const row = item as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (typeof row.value === 'string') out.value = row.value;
    for (const key of L4_TEXT_ATTRIBUTES) {
      if (typeof row[key] === 'string') out[key] = row[key];
    }
    return out;
  });
}

function fieldSlice(fieldId: string, field: object, derived: boolean): FieldSlice {
  const record = field as Record<string, unknown>;
  const slice: FieldSlice = {
    fieldId,
    type: '',
    derived,
    title: '',
    description: '',
  };
  for (const [key, value] of Object.entries(record)) {
    if (key === 'fields' || key === 'enum') continue;
    slice[key] = value;
  }
  slice.fieldId = fieldId;
  slice.type = String(record.type || '');
  slice.derived = derived;
  const text = textAttrs(field);
  slice.title = text.title;
  slice.description = text.description;
  const values = enumLabels(field);
  if (values) slice.values = values;
  else delete slice.values;
  return slice;
}

function walkV3Fields(fields: Record<string, Ns5OntologyFieldV3> | undefined, parent: string, out: Record<string, FieldSlice>): void {
  for (const [id, field] of Object.entries(fields || {})) {
    const fieldId = parent ? `${parent}.${id}` : id;
    out[fieldId] = fieldSlice(fieldId, field, field.derived === true);
    if (field.fields) walkV3Fields(field.fields as Record<string, Ns5OntologyFieldV3>, fieldId, out);
  }
}

function transitionSlice(row: object, cloneBy: boolean): TransitionSlice {
  const record = row as Record<string, unknown> & {
    transitionId: string;
    from: string[];
    to: string;
    by: string[] | 'system' | 'time';
    description: string;
    ruleRefs?: string[];
  };
  const slice: TransitionSlice = {
    transitionId: record.transitionId,
    from: [...record.from],
    to: record.to,
    by: cloneBy || Array.isArray(record.by) ? [...(record.by as string[])] : record.by,
    description: record.description,
    ruleRefs: [...(record.ruleRefs || [])],
  };
  assignOwn(slice, record, new Set(['from', 'by', 'ruleRefs']));
  slice.transitionId = record.transitionId;
  slice.from = [...record.from];
  slice.to = record.to;
  slice.by = cloneBy || Array.isArray(record.by) ? [...(record.by as string[])] : record.by;
  slice.description = record.description;
  slice.ruleRefs = [...(record.ruleRefs || [])];
  return slice;
}

function entitySlice(entity: Ns5OntologyAnyEntity, source: string): EntitySlice {
  const fields: Record<string, FieldSlice> = {};
  const transitions: Record<string, TransitionSlice> = {};
  if (isNs5OntologyEntityV3(entity)) {
    walkV3Fields(entity.record?.fields as Record<string, Ns5OntologyFieldV3> | undefined, '', fields);
    for (const row of entity.transitions || []) transitions[row.transitionId] = transitionSlice(row, true);
  } else {
    for (const field of entity.fields || []) {
      fields[field.fieldId] = fieldSlice(field.fieldId, field, false);
    }
    for (const [fieldId, detail] of Object.entries(entity.details || {})) {
      fields[fieldId] = fieldSlice(fieldId, detail, true);
    }
    for (const row of entity.transitions || []) transitions[row.transitionId] = transitionSlice(row, false);
  }
  const slice: EntitySlice = {
    entityId: entity.entityId,
    source,
    fields,
    transitions,
    initialData: '',
  };
  assignOwn(slice, entity, new Set(['fields', 'transitions', 'details']));
  const record = slice.record;
  if (record && typeof record === 'object' && !Array.isArray(record)) {
    const copy = { ...(record as Record<string, unknown>) };
    delete copy.fields;
    slice.record = copy;
  }
  slice.entityId = entity.entityId;
  slice.source = source;
  slice.fields = fields;
  slice.transitions = transitions;
  // Absent initialData on a recorded table reads as ''. A role never carries it.
  slice.initialData = isNs5OntologyEntityV3(entity) && entity.kind === 'entity' ? (entity.initialData || '') : '';
  return slice;
}

function grantSlice(grant: Ns5AccessArtifact['grants'][number]): GrantSlice {
  const slice: GrantSlice = {
    grantId: grant.grantId,
    entityRefs: [...grant.entityRefs],
    dataScope: grant.dataScope,
    disclosure: grant.disclosure,
  };
  assignOwn(slice, grant, new Set(['entityRefs']));
  slice.grantId = grant.grantId;
  slice.entityRefs = [...grant.entityRefs];
  return slice;
}

function taskSlice(task: Ns5WorkflowsArtifact['processes'][number]['tasks'][number]): TaskSlice {
  const slice: TaskSlice = {
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
  assignOwn(slice, task, new Set(['next']));
  slice.taskId = task.taskId;
  slice.kind = task.kind;
  slice.actorRef = asString(task.actorRef);
  slice.journeyRef = asString(task.journeyRef);
  slice.entityRef = asString(task.entityRef);
  slice.effect = asString(task.effect);
  slice.transitionRef = asString(task.transitionRef);
  slice.next = [...(task.next || [])];
  slice.description = task.description;
  // A recorded wait without wake reads as 'none', so adding the neutral value is not a change.
  if (task.kind === 'wait') {
    slice.wake = task.wake?.mode === 'periodic'
      ? { mode: 'periodic', ...(task.wake.every ? { every: task.wake.every } : {}) }
      : { mode: 'none' };
  } else {
    delete slice.wake;
  }
  return slice;
}

function processSlice(process: Ns5WorkflowsArtifact['processes'][number]): ProcessSlice {
  const functions: Record<string, string> = {};
  for (const fn of process.functions || []) functions[fn.functionId] = fn.description;
  const tasks: Record<string, TaskSlice> = {};
  for (const task of process.tasks || []) tasks[task.taskId] = taskSlice(task);
  const slice: ProcessSlice = {
    processId: process.processId,
    title: process.title,
    description: process.description,
    trigger: process.trigger,
    functions,
    // A recorded process without room reads as 'exclusive'.
    room: process.room || 'exclusive',
    tasks,
  };
  assignOwn(slice, process, new Set(['tasks', 'functions']));
  slice.processId = process.processId;
  slice.title = process.title;
  slice.description = process.description;
  slice.trigger = process.trigger;
  slice.functions = functions;
  slice.room = process.room || 'exclusive';
  slice.tasks = tasks;
  return slice;
}

/** Process-level view. `wake` is stored on each task and compared here, same as `functions`. */
function processCompare(row: ProcessSlice): Record<string, unknown> {
  const wake: Record<string, { mode: 'none' | 'periodic'; every?: string }> = {};
  for (const task of Object.values(row.tasks)) {
    if (task.wake) wake[task.taskId] = task.wake;
  }
  const { tasks, ...rest } = row;
  return { ...rest, wake };
}

function taskForDiff(task: TaskSlice, processId: string): Omit<TaskSlice, 'wake'> & { processId: string } {
  const rest: Omit<TaskSlice, 'wake'> & { wake?: TaskSlice['wake'] } = { ...task };
  delete rest.wake;
  return { ...rest, processId };
}

function integrationSlice(item: Ns5IntegrationArtifact['inbound'][number]): IntegrationSlice {
  const slice: IntegrationSlice = {
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
  assignOwn(slice, item, new Set(['writes', 'entityRefs']));
  slice.id = item.id;
  slice.kind = item.kind;
  slice.from = asString(item.from);
  slice.to = asString(item.to);
  slice.event = asString(item.event);
  slice.writes = asStringArray(item.writes);
  slice.effect = asString(item.effect);
  slice.transitionRef = asString(item.transitionRef);
  slice.on = asString(item.on);
  slice.description = item.description;
  slice.entityRefs = [...(item.entityRefs || [])];
  return slice;
}

/** Entity attributes compared as one item. Fields and transitions already have their own items. */
function entityBody(row: EntitySlice): Record<string, unknown> {
  const { fields, transitions, source, ...rest } = row;
  return rest;
}

/** Journey body compared as one item. Steps already have their own items. Derived hashes stay out. */
function journeySlice(journey: Ns5JourneyArtifact, indexEntry: Ns5JourneyIndexEntry): JourneySlice {
  const slice: JourneySlice = {
    journeyId: journey.journeyId,
    index: { ...indexEntry },
  };
  assignOwn(slice, journey.business, new Set(['steps']));
  slice.journeyId = journey.journeyId;
  slice.index = { ...indexEntry };
  return slice;
}

function stepSlice(journeyId: string, step: Ns5JourneyStep): StepSlice {
  const slice: StepSlice = { journeyId, stepId: step.stepId };
  assignOwn(slice, step, new Set());
  slice.journeyId = journeyId;
  slice.stepId = step.stepId;
  return slice;
}

export function snapshotFromParsed(input: {
  entities: Array<{ entity: Ns5OntologyAnyEntity; source: string }>;
  rules: Ns5RulesAny | null;
  access: Ns5AccessArtifact | null;
  workflows: Ns5WorkflowsArtifact | null;
  integration: Ns5IntegrationArtifact | null;
  journeys?: Array<{ journey: Ns5JourneyArtifact; index: Ns5JourneyIndexEntry }> | null;
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
  for (const row of input.journeys || []) {
    const journeyId = row.index.journeyId || row.journey.journeyId;
    snap.journeys[journeyId] = journeySlice(row.journey, row.index);
    for (const step of row.journey.business?.steps || []) {
      if (!step.stepId) continue;
      snap.steps[`${journeyId}/${step.stepId}`] = stepSlice(journeyId, step);
    }
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
    } else if (before && after && !sameJson(entityBody(before), entityBody(after))) {
      items.push({
        changeId: `entity:${entityId}`, kind: 'entity', op: 'changed', entity: entityId,
        source: after.source,
        before: entityBody(before),
        after: entityBody(after),
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
    Object.fromEntries(Object.entries(base.processes).map(([id, row]) => [id, processCompare(row)])),
    Object.fromEntries(Object.entries(candidate.processes).map(([id, row]) => [id, processCompare(row)])),
    () => 'workflows.defs.ts',
    () => '',
  );
  const beforeTasks: Record<string, Omit<TaskSlice, 'wake'> & { processId: string }> = {};
  const afterTasks: Record<string, Omit<TaskSlice, 'wake'> & { processId: string }> = {};
  for (const process of Object.values(base.processes)) {
    for (const task of Object.values(process.tasks)) beforeTasks[`${process.processId}.${task.taskId}`] = taskForDiff(task, process.processId);
  }
  for (const process of Object.values(candidate.processes)) {
    for (const task of Object.values(process.tasks)) afterTasks[`${process.processId}.${task.taskId}`] = taskForDiff(task, process.processId);
  }
  pushMapDiff(items, 'task', beforeTasks, afterTasks, () => 'workflows.defs.ts', () => '');
  pushMapDiff(items, 'inbound', base.inbound, candidate.inbound, () => 'integration.defs.ts', () => '');
  pushMapDiff(items, 'outbound', base.outbound, candidate.outbound, () => 'integration.defs.ts', () => '');
  pushMapDiff(
    items, 'journey', base.journeys, candidate.journeys,
    (id) => `journeys/${id}.defs.ts`,
    () => '',
  );
  pushMapDiff(
    items, 'step', base.steps, candidate.steps,
    (id) => `journeys/${id.slice(0, id.indexOf('/'))}.defs.ts`,
    (_id, value) => asString((value as StepSlice).entity),
  );
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
  const journeyIndex = await readDefsAt<Ns5JourneyIndexArtifact>(fileAt(project, root, 'journeys/index.defs.ts'));
  const journeys: Array<{ journey: Ns5JourneyArtifact; index: Ns5JourneyIndexEntry }> = [];
  if (journeyIndex) {
    for (const entry of journeyIndex.journeys || []) {
      const journey = await readDefsAt<Ns5JourneyArtifact>(fileAt(project, root, `journeys/${entry.journeyId}.defs.ts`));
      if (journey) journeys.push({ journey, index: entry });
    }
  }
  return snapshotFromParsed({
    entities,
    rules: await readDefsAt<Ns5RulesAny>(fileAt(project, root, 'rules.defs.ts')),
    access: await readDefsAt<Ns5AccessArtifact>(fileAt(project, root, 'access.defs.ts')),
    workflows: await readDefsAt<Ns5WorkflowsArtifact>(fileAt(project, root, 'workflows.defs.ts')),
    integration: await readDefsAt<Ns5IntegrationArtifact>(fileAt(project, root, 'integration.defs.ts')),
    journeys,
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

/**
 * Label written to `l4diff.json.base` plus the literal folder `loadSnapshot` reads.
 * A sealed revision uses `manifest.baseId` and never falls through to canonical.
 */
export async function resolveBase(moduleName: string): Promise<{ base: string; root: string; refusal: string }> {
  const canonical = normalizeModuleName(moduleName);
  const rev = parseRevisionRoot(moduleFolder(canonical));
  if (rev) {
    const baseId = await declaredRevisionBaseId(canonical);
    const releaseRoot = releaseL4Root(canonical, baseId);
    if (!baseId || !releaseRoot || !releaseL4Present(canonical, baseId)) {
      const refusal = baseId
        ? releaseMissingRefusal(canonical, baseId)
        : revisionMissingRefusal(canonical, rev.changeId, rev.revisionId);
      return { base: '', root: '', refusal };
    }
    return { base: releaseRoot, root: releaseRoot, refusal: '' };
  }
  const sealed = await findSealedBaseRoot(moduleName);
  if (sealed) return { base: sealed, root: sealed, refusal: '' };
  const project = moduleFile(moduleName).project;
  if (!fileExists(fileAt(project, canonical, 'module.defs.ts'))) return { base: '', root: '', refusal: '' };
  return { base: 'canonical', root: canonical, refusal: '' };
}

export function emptyL4Diff(moduleName: string, base = '', candidate = ''): L4Diff {
  return {
    schemaVersion: L4_DIFF_SCHEMA,
    moduleName: normalizeModuleName(moduleName),
    base,
    candidate,
    revision: null,
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
  if (resolved.refusal) throw new Error(resolved.refusal);
  const revision = await loadPlRevision(existing);
  const rev = parseRevisionRoot(candidate);
  if (rev && !revision) throw new Error(revisionMissingRefusal(existing, rev.changeId, rev.revisionId));
  const items = diffL4Snapshots(
    await loadSnapshot(project, resolved.root),
    await loadSnapshot(project, candidate),
  );
  if (rev) {
    const manifest = await readL4Revision(project, existing, rev.changeId, rev.revisionId);
    if (!manifest || !Array.isArray(manifest.changedPaths)) {
      throw new Error('L4 revision manifest is missing changedPaths.');
    }
    // changedPaths and item.source are both paths relative to the module L4 root (e.g. rules.defs.ts).
    const covered = new Set(items.map(item => item.source));
    for (const path of manifest.changedPaths) {
      if (covered.has(path)) continue;
      covered.add(path);
      items.push({
        changeId: `artifact:${path}`,
        kind: 'artifact',
        op: 'changed',
        entity: '',
        source: path,
      });
    }
    items.sort((a, b) => a.changeId.localeCompare(b.changeId) || a.op.localeCompare(b.op));
  }
  const diff: L4Diff = {
    schemaVersion: L4_DIFF_SCHEMA,
    moduleName: existing,
    base: resolved.base,
    candidate,
    revision,
    items,
  };
  await writeJson(l4diffFile(existing, 'l1'), diff);
  await writeJson(l4diffFile(existing, 'l2'), diff);
  return diff;
}
