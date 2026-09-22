/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/contractsV3.ts" enhancement="_blank"/>

/**
 * The v3 side of `ontology30` (ns5_42): the module ontology written ON TOP of the platform ontology
 * (`/_102034_/l4/ontology/mdm.defs.ts`) instead of beside it — a `role` is a papel over an MDM subtype,
 * an `entity` is a table of the module with columns only where there is an index.
 *
 * ADDITIVE ON PURPOSE. `contracts.ts` next door keeps the v2 names and behaviour untouched: the eleven
 * other modules are still recorded in v2 and `replayRealRuns.test.ts` replays their drafts through those
 * exact functions, byte for byte. ns5_43 T7 says the eleven stay v2 until ns5_44 regenerates them, so a
 * v3 rewrite in place would make that task unsatisfiable. v3 therefore gets its own names and its own
 * file; v2 dies in ns5_44, not here.
 *
 * PURE: no `node:*`, no `mls.stor`, no I/O. The agent reads the files and hands the objects in.
 */

import type {
  DataFamilyOntology,
  MdmDefField,
  MdmDefFields,
  MdmOntology,
  MdmSubtypeName,
} from '/_102034_/l1/mdm/defs/ontologyTypes.js';
import { platformOntologyPath } from '/_102035_/l2/solution/lib.js';
import {
  collectNs5CitedProcessStages,
  collectNs5CitedTransitions,
  type Ns5CitedProcessStage,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  NS5_ONTOLOGY_SCHEMA_VERSION_V31,
  type Ns5OntologyEntityV3,
  type Ns5OntologyFieldV3,
  type Ns5OntologyFieldsV3,
  type Ns5OntologyIndexRelationshipV3,
  type Ns5OntologyIndexV3,
  type Ns5OntologyRelationshipV3,
  type Ns5OntologyDetail,
  type Ns5OntologyValueV3,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;

export const NS5_ONTOLOGY_V3_MAX_PARALLEL = 20 as const;

export const NS5_ONTOLOGY_V3_KINDS = ['role', 'entity'] as const;
/**
 * The family of the data, by nature (ns5_46): `mdm` is the master record of the organization, `tdm` the
 * movement of this module, `ddm` what is recalculated and has no writer. It decides which catalog the
 * fan-out starts from and which catalog the gate checks the capabilities against.
 */
export const NS5_ONTOLOGY_V3_FAMILIES = ['mdm', 'tdm', 'ddm'] as const;
/**
 * Where the rows live. `platform` is the neutral value of a role — the rows are the platform's, not a
 * table of the module — and is why this is a required enum with three values and not an optional pair
 * (an optional single-valued field arrives at a strict provider as "value or null" and is answered by a
 * coin toss; measured in ns5_28).
 */
export const NS5_ONTOLOGY_V3_STORAGE_KINDS = ['platform', 'relational', 'timeSeries'] as const;
export const NS5_ONTOLOGY_V3_CLASSES = ['core', 'event', 'supporting'] as const;
export const NS5_ONTOLOGY_V3_RELATIONSHIP_TYPES = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'] as const;
/** `composition` never reaches the index: the child is embedded in the parent document. */
export const NS5_ONTOLOGY_V3_MODES = ['fk', 'mdmRelationship', 'throughTable', 'composition'] as const;
export const NS5_ONTOLOGY_V3_INDEX_MODES = ['fk', 'mdmRelationship', 'throughTable'] as const;
export const NS5_ONTOLOGY_V3_CARDINALITIES = ['1:1', '1:N', 'N:1', 'N:N'] as const;
export const NS5_ONTOLOGY_V3_WRITERS = ['journey', 'crud', 'inbound'] as const;
/**
 * ns5_47: `time` is gone. A state is reached because somebody moves the row (`actor`) or because a
 * command of the module does (`command`); what follows from the data itself is a `derived` field.
 */
export const NS5_ONTOLOGY_V3_REACHED_BY = ['actor', 'command'] as const;
/** The record grammar the module shares with the platform, plus `enum`, `object` and `record`. */
export const NS5_ONTOLOGY_V3_FIELD_TYPES = [
  'string', 'text', 'integer', 'number', 'money', 'boolean', 'date', 'timestamp', 'uuid',
  'enum', 'object', 'record',
] as const;

export type Ns5OntologyV3Kind = typeof NS5_ONTOLOGY_V3_KINDS[number];
export type Ns5OntologyV3Family = typeof NS5_ONTOLOGY_V3_FAMILIES[number];
export type Ns5OntologyV3StorageKind = typeof NS5_ONTOLOGY_V3_STORAGE_KINDS[number];
export type Ns5OntologyV3Mode = typeof NS5_ONTOLOGY_V3_MODES[number];

/**
 * The family of an entity, whatever the draft carries. The thirteen recorded modules and the
 * hand-written v3 form were written before the family existed: where it is absent it is derived from
 * the kind, so nothing recorded changes verdict (ns5_46 T6). A family the model DID write is kept as it
 * is — the gate is what says a role has to be `mdm`, and a check that can never fire is no check.
 */
export function ns5FamilyOfV3(entity: { kind: string; family?: string }): Ns5OntologyV3Family {
  const declared = entity.family;
  if (declared && (NS5_ONTOLOGY_V3_FAMILIES as readonly string[]).includes(declared)) {
    return declared as Ns5OntologyV3Family;
  }
  return entity.kind === 'role' ? 'mdm' : 'tdm';
}

/** The branch of `details` only this module writes; the platform declares it as `<moduleId>`. */
export const NS5_PLATFORM_NAMESPACE_KEY = '<moduleId>' as const;
/** The placeholder the platform uses for the one branch that varies per record. */
export const NS5_PLATFORM_SUBTYPE_KEY = '<subtype>' as const;

/**
 * What `details.<moduleName>` says when the prompt asked for nothing of the module's own about the
 * record. Fixed text, never an example: an example is read as a suggestion and comes back as a field.
 */
export const NS5_NAMESPACE_EMPTY_DESCRIPTION =
  'Module namespace; the prompt asked for no data of this module about the record.';

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface Ns5OntologyV3PlanEntity {
  entityId: string;
  kind: Ns5OntologyV3Kind;
  /**
   * The family of the data, declared by the plan because it is a decision of the whole: which catalog
   * this entity copies from. Derived from `kind` when the draft does not carry it.
   */
  family: Ns5OntologyV3Family;
  /** `role` only; a key of `mdm.subtypes`. */
  subtype?: string;
  /** `entity` only. */
  class?: typeof NS5_ONTOLOGY_V3_CLASSES[number];
  title: string;
  description: string;
  displayField: string;
  writer?: typeof NS5_ONTOLOGY_V3_WRITERS[number];
  /** Derived: `<moduleName>.<entityId>` on a role. */
  roleTag?: string;
  /** Derived: the platform ontology a role copies from. */
  source?: string;
  /**
   * On a table: `target` and `table` are derived, `kind` is what the plan declared (`relational` by
   * default). A role has no storage of its own — the rows are the platform's.
   */
  storage?: { target: 'moduleDatabase'; table: string; kind: Exclude<Ns5OntologyV3StorageKind, 'platform'> };
}

export interface Ns5OntologyV3PlanRelationship {
  relationshipId: string;
  from: string;
  to: string;
  type: typeof NS5_ONTOLOGY_V3_RELATIONSHIP_TYPES[number];
  required: boolean;
  mode: Ns5OntologyV3Mode;
  /** `mode: 'mdmRelationship'`: a `type` of `mdm.relationships`. */
  catalogType?: string;
  roles?: string[];
  /** `mode: 'throughTable'`: the entity walked. */
  through?: string;
  /** `mode: 'fk'`: the column, as `Entity.field`. Derived when the model omits it. */
  field?: string;
  path?: string;
  derived?: true;
  description: string;
}

/** Deterministic form changes recorded on the plan draft; not an LLM field. */
export type Ns5OntologyV3NormalizationKind =
  | 'derivedFromPlatform'
  | 'tightened'
  | 'namespaceEmpty'
  /** ns5_47: `by: ['system']` is not an actor — it is the absence of one, written as an empty list. */
  | 'systemByCollapsed'
  /** ns5_47: a `ddm` row is derived whole, so a `derived[]` item on it has nothing to add. */
  | 'derivedOnDdmIgnored'
  /** ns5_47: a rule a derived field cites is a rule the entity obeys; it joins `rules`. */
  | 'derivedRuleRefsLifted'
  /** ns5_49: a journey cites `Entity.transitionId` and `by` omitted that actor; normalize adds it. */
  | 'transitionByAdded'
  /** ns5_49: a transition cited only by a process stage has no human author; `by` becomes `[]`. */
  | 'transitionOwnedByProcess';

export interface Ns5OntologyV3Normalization {
  kind: Ns5OntologyV3NormalizationKind;
  entityId: string;
  detail: string;
}

export interface Ns5OntologyV3PlanDraft {
  moduleName: string;
  businessDomain: string;
  entities: Ns5OntologyV3PlanEntity[];
  relationships: Ns5OntologyV3PlanRelationship[];
  normalizations?: Ns5OntologyV3Normalization[];
}

// ---------------------------------------------------------------------------
// small readers
// ---------------------------------------------------------------------------

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function bool(value: unknown): boolean {
  return value === true;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const found = text(value);
  return (allowed as readonly string[]).includes(found) ? found as T : fallback;
}

function optionalOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  const found = text(value);
  return (allowed as readonly string[]).includes(found) ? found as T : undefined;
}

function uncapitalize(name: string): string {
  return name ? name[0].toLowerCase() + name.slice(1) : name;
}

/**
 * A keyed collection, however it arrives. The ARTIFACT keeps string-keyed maps (`record.fields`,
 * `capabilities`, `relationships`) because that is what a reader wants; the TOOL SCHEMA cannot ask for
 * one — a strict tool schema has to declare `additionalProperties: false` on every object, so an open
 * key set is not expressible (`toolSchemaLint.ts:59-65`, and the providers' own strict mode). The tool
 * therefore takes arrays of `{ id, ... }` and this is where they become the map. A map is still read,
 * so a hand-written fixture and a repaired draft both go through unchanged.
 */
function keyed(value: unknown, idKey = 'id'): Record<string, unknown> {
  if (Array.isArray(value)) {
    const out: Record<string, unknown> = {};
    for (const item of value) {
      const raw = record(item);
      const id = text(raw[idKey]) || text(raw.id) || text(raw.fieldId) || text(raw.name);
      if (!id) continue;
      const { [idKey]: _dropped, ...rest } = raw;
      out[id] = rest;
    }
    return out;
  }
  return record(value);
}

// ---------------------------------------------------------------------------
// T2 — the plan
// ---------------------------------------------------------------------------

/**
 * The frozen cross-entity plan, v3. The model writes `entities` and `relationships`; `roleTag`,
 * `storage` and `source` are derived here and never asked for.
 */
export function normalizeNs5OntologyPlanV3(value: unknown, moduleName: string): Ns5OntologyV3PlanDraft {
  const root = record(value);
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const entities = list(root.entities)
    .map(item => normalizePlanEntity(item, moduleName, normalizations))
    .filter(entity => entity.entityId);
  const known = new Set(entities.map(entity => entity.entityId));
  const relationships = list(root.relationships)
    .map(item => normalizePlanRelationship(item, known))
    .filter(item => item.relationshipId);
  return {
    moduleName: text(root.moduleName) || moduleName,
    businessDomain: text(root.businessDomain),
    entities,
    relationships,
    ...(normalizations.length ? { normalizations } : {}),
  };
}

function normalizePlanEntity(
  value: unknown,
  moduleName: string,
  normalizations: Ns5OntologyV3Normalization[],
): Ns5OntologyV3PlanEntity {
  const raw = record(value);
  const entityId = text(raw.entityId);
  const kind = oneOf(raw.kind, NS5_ONTOLOGY_V3_KINDS, 'entity');
  const family = ns5FamilyOfV3({ kind, family: text(raw.family) });
  if (!text(raw.family)) {
    normalizations.push({ kind: 'derivedFromPlatform', entityId, detail: `family ${family} (derived from kind ${kind})` });
  }
  const base: Ns5OntologyV3PlanEntity = {
    entityId,
    kind,
    family,
    title: text(raw.title) || entityId,
    description: text(raw.description),
    displayField: text(raw.displayField),
  };
  const writer = optionalOneOf(raw.writer, NS5_ONTOLOGY_V3_WRITERS);
  if (writer && writer !== 'journey') base.writer = writer;
  if (kind === 'role') {
    base.subtype = text(raw.subtype);
    base.roleTag = `${moduleName}.${entityId}`;
    base.source = platformOntologyPath();
    normalizations.push({
      kind: 'derivedFromPlatform',
      entityId,
      detail: `roleTag ${base.roleTag}; source ${base.source}`,
    });
    return base;
  }
  base.class = oneOf(raw.class, NS5_ONTOLOGY_V3_CLASSES, 'core');
  const storageKind = oneOf(raw.storageKind, NS5_ONTOLOGY_V3_STORAGE_KINDS, 'relational');
  base.storage = {
    target: 'moduleDatabase',
    table: `${moduleName}_${entityId.toLowerCase()}`,
    // `platform` is the neutral value of a role; on a table it means nothing was said.
    kind: storageKind === 'platform' ? 'relational' : storageKind,
  };
  normalizations.push({
    kind: 'derivedFromPlatform',
    entityId,
    detail: `storage.table ${base.storage.table}`,
  });
  return base;
}

function normalizePlanRelationship(value: unknown, known: ReadonlySet<string>): Ns5OntologyV3PlanRelationship {
  const raw = record(value);
  const relationshipId = text(raw.relationshipId);
  const from = text(raw.from);
  const to = text(raw.to);
  const mode = oneOf(raw.mode, NS5_ONTOLOGY_V3_MODES, 'fk');
  const out: Ns5OntologyV3PlanRelationship = {
    relationshipId,
    from,
    to,
    type: oneOf(raw.type, NS5_ONTOLOGY_V3_RELATIONSHIP_TYPES, 'manyToOne'),
    required: bool(raw.required),
    mode,
    description: text(raw.description),
  };
  const roles = list(raw.roles).map(text).filter(Boolean);
  if (roles.length) out.roles = roles;
  if (mode === 'mdmRelationship') {
    const catalogType = text(raw.catalogType);
    if (catalogType) out.catalogType = catalogType;
    return out;
  }
  if (mode === 'throughTable') {
    const through = text(raw.through);
    if (through) out.through = through;
    const path = text(raw.path);
    if (path) out.path = path;
    out.derived = true;
    return out;
  }
  if (mode === 'fk') {
    // `field` is the column on the `from` side; derive `Entity.<entity>Id` when it is missing.
    const written = text(raw.field);
    out.field = written || (known.has(from) ? `${from}.${uncapitalize(to)}Id` : '');
    return out;
  }
  return out;
}

// ---------------------------------------------------------------------------
// T3 / T4 — the entity
// ---------------------------------------------------------------------------

/**
 * ns5_47 — one value of the row nobody writes: it is computed when the row is read, from this same row
 * or from rows linked to it. It is NOT a lifecycle state: `status` keeps only what an actor or a
 * command puts there. `description` states the condition, in the user language, and what it reads.
 * The model writes this list on the entity; it is folded into the record here.
 */
export interface Ns5OntologyV3DerivedItem {
  id: string;
  type: Ns5OntologyFieldV3['type'];
  title: string;
  description: string;
  ruleRefs: string[];
}

/** Journeys, in the only shape the citation walk reads. */
export type Ns5OntologyV3JourneyView = {
  business: {
    actorRef?: string;
    steps: ReadonlyArray<{
      kind: string;
      entity: string;
      stepId?: string;
      effect?: 'create' | 'update' | 'transition';
      transitionRef?: string;
    }>;
  };
};

export interface Ns5OntologyV3EntityContext {
  moduleName: string;
  mdm: MdmOntology;
  plan: Ns5OntologyV3PlanDraft;
  /** ns5_49: who cited each transition. A journey act gives it an actor; a process stage owns it. */
  journeys?: readonly Ns5OntologyV3JourneyView[];
  /** ns5_49: workflows50 runs before this step; its mechanical/llm stages declare what to honour. */
  workflows?: { processes: ReadonlyArray<{ processId?: string; tasks: ReadonlyArray<{ taskId?: string; kind: string; entityRef?: string; effect?: 'create' | 'update' | 'transition'; transitionRef?: string }> }> } | null;
}

/**
 * One entity, in the form the file is written in. The model writes the tree, the links it reads, the
 * capabilities and the rules; everything the platform already knows is filled in here.
 */
export function normalizeNs5OntologyEntityV3(
  value: unknown,
  entityId: string,
  context: Ns5OntologyV3EntityContext,
  normalizations: Ns5OntologyV3Normalization[] = [],
): Ns5OntologyEntityV3 | null {
  const frozen = context.plan.entities.find(item => item.entityId === entityId);
  if (!frozen) return null;
  const raw = record(value);
  const relationships = normalizeEntityRelationships(raw.relationships, entityId, context);
  const capabilities = normalizeCapabilities(raw.capabilities);
  const family = ns5FamilyOfV3(frozen);
  // A `ddm` row is derived whole (`normalizeTableRecord` marks every field), so a `derived[]` item on it
  // would only repeat what the family already says: it is dropped, on the record, not in silence.
  const derivedItems = family === 'ddm' ? [] : normalizeDerivedItems(raw.derived);
  if (family === 'ddm') {
    for (const item of normalizeDerivedItems(raw.derived)) {
      normalizations.push({ kind: 'derivedOnDdmIgnored', entityId, detail: `derived.${item.id}` });
    }
  }
  const written = list(raw.rules).map(text).filter(Boolean);
  const cited = derivedItems.flatMap(item => item.ruleRefs).filter(id => !written.includes(id));
  if (cited.length) {
    normalizations.push({ kind: 'derivedRuleRefsLifted', entityId, detail: `rules += ${[...new Set(cited)].join(', ')}` });
  }
  const rules = [...written, ...new Set(cited)];
  const common = {
    schemaVersion: NS5_ONTOLOGY_SCHEMA_VERSION_V31,
    moduleName: context.moduleName,
    entityId,
    title: frozen.title,
    description: frozen.description,
    displayField: frozen.displayField,
    relationships,
    capabilities,
    rules,
    ...(frozen.writer ? { writer: frozen.writer } : {}),
  };
  const uniqueKeys = list(raw.uniqueKeys)
    .map(item => list(Array.isArray(item) ? item : record(item).fields).map(text).filter(Boolean))
    .filter(item => item.length > 0);
  const lifecycleStates = normalizeLifecycleStates(raw.lifecycleStates);
  const transitions = applyCitedTransitionOwners(
    normalizeTransitions(raw.transitions, entityId, normalizations),
    entityId,
    context,
    normalizations,
  );

  if (frozen.kind === 'role') {
    const subtype = frozen.subtype as MdmSubtypeName;
    return {
      ...common,
      kind: 'role',
      subtype,
      roleTag: frozen.roleTag ?? `${context.moduleName}.${entityId}`,
      source: frozen.source ?? platformOntologyPath(),
      record: { fields: normalizeRoleRecord(raw.record, entityId, subtype, context, normalizations, derivedItems) },
      ...(uniqueKeys.length ? { uniqueKeys } : {}),
    };
  }
  return {
    ...common,
    kind: 'entity',
    class: frozen.class ?? 'core',
    storage: frozen.storage ?? { target: 'moduleDatabase', table: `${context.moduleName}_${entityId.toLowerCase()}`, kind: 'relational' },
    record: { fields: normalizeTableRecord(raw.record, entityId, family, normalizations, derivedItems) },
    ...(uniqueKeys.length ? { uniqueKeys } : {}),
    ...(lifecycleStates.length ? { lifecycleStates } : {}),
    ...(transitions.length ? { transitions } : {}),
  };
}

/** The `derived[]` the model wrote, read tolerantly. Items without an id are dropped. */
function normalizeDerivedItems(value: unknown): Ns5OntologyV3DerivedItem[] {
  return list(value).map(item => {
    const raw = record(item);
    return {
      id: text(raw.id),
      type: oneOf(raw.type, NS5_ONTOLOGY_V3_FIELD_TYPES, 'string') as Ns5OntologyFieldV3['type'],
      title: text(raw.title),
      description: text(raw.description),
      ruleRefs: list(raw.ruleRefs).map(text).filter(Boolean),
    };
  }).filter(item => item.id);
}

/**
 * Fold the derived items into the one document branch that holds them — `details` on a table, the module
 * namespace on a role — as ordinary fields carrying `derived: true`. Nothing downstream then
 * has to know about a second list: the gate, the screen and the emitter all walk `record.fields`.
 */
function foldDerived(
  into: Record<string, Ns5OntologyFieldV3>,
  items: readonly Ns5OntologyV3DerivedItem[],
  entityId: string,
  path: string,
  normalizations: Ns5OntologyV3Normalization[],
): void {
  for (const item of items) {
    const field: Ns5OntologyFieldV3 = { type: item.type, derived: true };
    if (item.title) field.title = item.title;
    if (item.description) field.description = item.description;
    into[item.id] = field;
    normalizations.push({ kind: 'derivedFromPlatform', entityId, detail: `${path}.${item.id}.derived (derived[])` });
  }
}

function normalizeLifecycleStates(value: unknown): NonNullable<Ns5OntologyEntityV3['lifecycleStates']>[number][] {
  return list(value).map(item => {
    const raw = record(item);
    return {
      state: text(raw.state),
      reachedBy: oneOf(raw.reachedBy, NS5_ONTOLOGY_V3_REACHED_BY, 'actor'),
    };
  }).filter(item => item.state);
}

/**
 * ns5_47: `by` is a list of actor ids and nothing else. `system` — as the scalar the v2 grammar had, or
 * as a one-item list — is not an actor but the absence of one, and collapses to `[]`. `time` does NOT
 * collapse: a move nobody makes is not a transition at all, so it is kept as written and the assembly
 * gate says, in one message, that the condition belongs in `derived[]`.
 */
function normalizeTransitions(
  value: unknown,
  entityId: string,
  normalizations: Ns5OntologyV3Normalization[],
): NonNullable<Ns5OntologyEntityV3['transitions']> {
  return list(value).map(item => {
    const raw = record(item);
    const written = raw.by === 'system' || raw.by === 'time'
      ? [raw.by as string]
      : list(raw.by).map(text).filter(Boolean);
    const transitionId = text(raw.transitionId);
    const by = written.length === 1 && written[0] === 'system' ? [] : written;
    if (by.length !== written.length && transitionId) {
      normalizations.push({ kind: 'systemByCollapsed', entityId, detail: `transitions.${transitionId}.by` });
    }
    const ruleRefs = list(raw.ruleRefs).map(text).filter(Boolean);
    const hasPayload = Object.prototype.hasOwnProperty.call(raw, 'payload');
    const payload = list(raw.payload).map(text).filter(Boolean);
    return {
      transitionId,
      from: list(raw.from).map(text).filter(Boolean),
      to: text(raw.to),
      by,
      description: text(raw.description),
      ...(hasPayload ? { payload } : {}),
      ...(ruleRefs.length ? { ruleRefs } : {}),
    };
  }).filter(item => item.transitionId);
}

/**
 * ns5_49: the two citations decide who a transition belongs to.
 * - a journey `act` with `effect: transition` names an actor: that actor joins `by` (the v2
 *   `addCitedTransitionActors`, ported);
 * - a `mechanical`/`llm` stage of workflows50 names no person: a transition cited ONLY that way is
 *   owned by the process and `by` becomes `[]`.
 * A transition nobody cites is left exactly as the model wrote it.
 */
function applyCitedTransitionOwners(
  transitions: NonNullable<Ns5OntologyEntityV3['transitions']>,
  entityId: string,
  context: Ns5OntologyV3EntityContext,
  normalizations: Ns5OntologyV3Normalization[],
): NonNullable<Ns5OntologyEntityV3['transitions']> {
  const byJourney = collectNs5CitedTransitions(
    (context.journeys || []).map(journey => ({ business: { actorRef: journey.business.actorRef, steps: journey.business.steps } })),
  ).filter(item => item.entityId.split('.')[0] === entityId);
  const byProcess: Ns5CitedProcessStage[] = collectNs5CitedProcessStages(context.workflows)
    .filter(item => item.entityId === entityId && item.effect === 'transition' && item.transitionId);
  if (!byJourney.length && !byProcess.length) return transitions;
  return transitions.map(transition => {
    const actors = [...new Set(
      byJourney.filter(item => item.transitionId === transition.transitionId).map(item => item.actorRef).filter(Boolean),
    )];
    if (actors.length) {
      const missing = actors.filter(actor => !transition.by.includes(actor));
      if (!missing.length) return transition;
      normalizations.push({
        kind: 'transitionByAdded',
        entityId,
        detail: `by added ${missing.join(', ')} on ${transition.transitionId} (cited transitionRef).`,
      });
      return { ...transition, by: [...transition.by, ...missing] };
    }
    const owner = byProcess.find(item => item.transitionId === transition.transitionId);
    if (!owner || !transition.by.length) return transition;
    normalizations.push({
      kind: 'transitionOwnedByProcess',
      entityId,
      detail: `by emptied on ${transition.transitionId}; cited only by ${owner.processId}.${owner.taskId}.`,
    });
    return { ...transition, by: [] };
  });
}

function normalizeCapabilities(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, entry] of Object.entries(keyed(value))) {
    const written = typeof entry === 'string' ? entry.trim() : text(record(entry).sentence);
    if (id && written) out[id] = written;
  }
  return out;
}

// --- the record of a table -------------------------------------------------

/**
 * A table of the module: `id`, `version`, the indexed columns, and one `details` document with the rest.
 * `id` and `version` are derived here and never asked for; a `record` column is indexed by derivation
 * (a foreign key nobody can filter by is not a foreign key).
 *
 * On a `ddm` table every field is `derived` by definition — nobody writes a summary — so the flag is
 * written here instead of being asked for and then refused (ns5_46 T2).
 */
function normalizeTableRecord(
  value: unknown,
  entityId: string,
  family: Ns5OntologyV3Family,
  normalizations: Ns5OntologyV3Normalization[],
  derivedItems: readonly Ns5OntologyV3DerivedItem[] = [],
): Ns5OntologyFieldsV3 {
  const written = keyed(record(value).fields);
  const out: Record<string, Ns5OntologyFieldV3> = {
    id: { type: 'uuid', required: true, derived: true, indexed: true, title: 'Id' },
    version: { type: 'integer', required: true, derived: true },
  };
  normalizations.push({ kind: 'derivedFromPlatform', entityId, detail: 'record.fields.id, record.fields.version' });
  let details: Ns5OntologyFieldV3 | undefined;
  for (const [id, raw] of Object.entries(written)) {
    if (id === 'id' || id === 'version') continue;
    const field = normalizeField(raw);
    if (id === 'details') {
      details = { ...field, type: 'object', required: true };
      continue;
    }
    if (field.type === 'record' && field.indexed !== true) {
      field.indexed = true;
      normalizations.push({ kind: 'derivedFromPlatform', entityId, detail: `record.fields.${id}.indexed (foreign key)` });
    }
    out[id] = field;
  }
  out.details = details ?? { type: 'object', required: true, fields: {} };
  if (derivedItems.length) {
    const fields: Record<string, Ns5OntologyFieldV3> = { ...(out.details.fields ?? {}) };
    foldDerived(fields, derivedItems, entityId, 'record.fields.details.fields', normalizations);
    out.details = { ...out.details, fields };
  }
  if (family === 'ddm') markDerived(out, entityId, 'record.fields', normalizations);
  return out;
}

/** Every field of a derived table, and every field inside its document, is written by the engine. */
function markDerived(
  fields: Record<string, Ns5OntologyFieldV3>,
  entityId: string,
  path: string,
  normalizations: Ns5OntologyV3Normalization[],
): void {
  for (const [id, field] of Object.entries(fields)) {
    if (field.derived !== true) {
      field.derived = true;
      normalizations.push({ kind: 'derivedFromPlatform', entityId, detail: `${path}.${id}.derived (ddm)` });
    }
    if (field.fields) markDerived(field.fields, entityId, `${path}.${id}.fields`, normalizations);
  }
}

// --- the record of a role --------------------------------------------------

/**
 * A papel over an MDM record: the platform record, minus what the module does not use, plus the module
 * namespace. The five branches are materialised in the order the platform declares them, so the form of
 * a role does not depend on what the model happened to write; what the module says about a kept field
 * (title, description, a narrower domain) wins, and everything the platform already knows is copied.
 */
function normalizeRoleRecord(
  value: unknown,
  entityId: string,
  subtype: MdmSubtypeName,
  context: Ns5OntologyV3EntityContext,
  normalizations: Ns5OntologyV3Normalization[],
  derivedItems: readonly Ns5OntologyV3DerivedItem[] = [],
): Ns5OntologyFieldsV3 {
  const { mdm, moduleName } = context;
  const written = keyed(record(value).fields);
  const writtenDetails = keyed(record(written.details).fields);
  const platformId = mdm.record.fields.id;
  const platformVersion = mdm.record.fields.version;
  const out: Record<string, Ns5OntologyFieldV3> = {
    id: { ...fromPlatform(platformId), derived: true, required: true },
    version: { ...fromPlatform(platformVersion), derived: true, required: true },
  };
  normalizations.push({ kind: 'derivedFromPlatform', entityId, detail: 'record.fields.id, record.fields.version' });

  const branches: Record<string, Ns5OntologyFieldV3> = {};
  const order = mdm.record.fields.details?.groups ?? Object.keys(mdm.groups);
  for (const declared of order) {
    const key = declared === NS5_PLATFORM_SUBTYPE_KEY
      ? uncapitalize(subtype)
      : declared === NS5_PLATFORM_NAMESPACE_KEY ? moduleName : declared;
    const group = declared === NS5_PLATFORM_SUBTYPE_KEY ? undefined : mdm.groups[declared];
    const platformFields: MdmDefFields | undefined = declared === NS5_PLATFORM_SUBTYPE_KEY
      ? mdm.subtypes[subtype].fields
      : group?.fields;
    const mine = record(writtenDetails[key]);
    const isNamespace = key === moduleName;
    const branch: Ns5OntologyFieldV3 = {
      type: 'object',
      owner: isNamespace ? 'module' : (group?.owner ?? 'platform'),
    };
    const description = text(mine.description)
      || (declared === NS5_PLATFORM_SUBTYPE_KEY ? mdm.subtypes[subtype].description : group?.description ?? '');
    if (group?.open && !isNamespace) branch.open = true;
    const kept = keyed(mine.fields);
    const fields: Record<string, Ns5OntologyFieldV3> = {};
    for (const [id, raw] of Object.entries(kept)) {
      const platformField = platformFields?.[id];
      const field = normalizeField(raw);
      if (isNamespace || !platformField) {
        fields[id] = field;
        continue;
      }
      fields[id] = mergeWithPlatform(field, platformField, `${entityId}.details.${key}.${id}`, normalizations, entityId);
    }
    // The module namespace is the only branch of a role the module writes, so a derived field of a role
    // lands here — and a namespace that holds one is not empty.
    if (isNamespace && derivedItems.length) {
      foldDerived(fields, derivedItems, entityId, `record.fields.details.${key}.fields`, normalizations);
    }
    if (isNamespace && !Object.keys(fields).length) {
      branch.fields = {};
      branch.description = NS5_NAMESPACE_EMPTY_DESCRIPTION;
      normalizations.push({ kind: 'namespaceEmpty', entityId, detail: `details.${key}` });
      branches[key] = branch;
      continue;
    }
    if (branch.open && !Object.keys(fields).length) {
      if (description) branch.description = description;
      branches[key] = branch;
      continue;
    }
    branch.fields = fields;
    if (description) branch.description = description;
    branches[key] = branch;
  }

  out.details = {
    type: 'object',
    required: true,
    description: text(record(written.details).description) || mdm.record.fields.details?.description,
    fields: branches,
  };
  return out;
}

/** The platform definition of a field, as a v3 field: no widening, only what the platform says. */
function fromPlatform(field: MdmDefField | undefined): Ns5OntologyFieldV3 {
  if (!field) return { type: 'string' };
  const out: Ns5OntologyFieldV3 = { type: field.type };
  if (field.required) out.required = true;
  if (field.nullable) out.nullable = true;
  if (field.collection) out.collection = true;
  if (field.of) out.of = field.of;
  if (field.to) out.to = field.to;
  if (field.unique) out.unique = true;
  if (field.indexed) out.indexed = true;
  if (field.derived) out.derived = true;
  if (field.values?.length) out.values = field.values;
  if (field.pattern) out.pattern = field.pattern;
  if (field.maxLength !== undefined) out.maxLength = field.maxLength;
  if (field.min !== undefined) out.min = field.min;
  if (field.max !== undefined) out.max = field.max;
  if (field.default !== undefined) out.default = field.default;
  if (field.title) out.title = field.title;
  if (field.description) out.description = field.description;
  return out;
}

/**
 * What the module wrote about a field the platform owns, over what the platform says. The module may
 * only TIGHTEN: `required` false to true, a subset of `values`, a stricter `pattern` or `maxLength`.
 * Structure (`type`, `collection`, `of`, `derived`, `indexed`, `unique`) is the platform's and is
 * restored whatever the model wrote — a module cannot make a derived field writable by omitting a flag.
 */
function mergeWithPlatform(
  mine: Ns5OntologyFieldV3,
  platform: MdmDefField,
  path: string,
  normalizations: Ns5OntologyV3Normalization[],
  entityId: string,
): Ns5OntologyFieldV3 {
  const out: Ns5OntologyFieldV3 = { ...fromPlatform(platform) };
  if (mine.title) out.title = mine.title;
  if (mine.description) out.description = mine.description;
  if (mine.required) out.required = true;
  if (mine.default !== undefined) out.default = mine.default;
  if (mine.pattern) out.pattern = mine.pattern;
  if (mine.maxLength !== undefined) out.maxLength = mine.maxLength;
  if (mine.min !== undefined) out.min = mine.min;
  if (mine.max !== undefined) out.max = mine.max;
  if (mine.to) out.to = mine.to;
  if (mine.fields) out.fields = mine.fields;
  if (mine.values?.length) {
    out.values = mine.values;
    const wider = new Set((platform.values ?? []).map(String));
    const narrower = mine.values.length < wider.size
      && mine.values.every(item => wider.has(typeof item === 'string' ? item : item.value));
    if (narrower) {
      normalizations.push({ kind: 'tightened', entityId, detail: `${path}.values` });
    }
  }
  if (mine.required && platform.required !== true) {
    normalizations.push({ kind: 'tightened', entityId, detail: `${path}.required` });
  }
  if (mine.pattern && mine.pattern !== platform.pattern) {
    normalizations.push({ kind: 'tightened', entityId, detail: `${path}.pattern` });
  }
  return out;
}

/** One field as written by the model, read tolerantly. Recurses into `fields`. */
function normalizeField(value: unknown): Ns5OntologyFieldV3 {
  const raw = record(value);
  const out: Ns5OntologyFieldV3 = {
    type: oneOf(raw.type, NS5_ONTOLOGY_V3_FIELD_TYPES, 'string') as Ns5OntologyFieldV3['type'],
  };
  if (bool(raw.required)) out.required = true;
  if (bool(raw.nullable)) out.nullable = true;
  if (bool(raw.collection)) out.collection = true;
  if (bool(raw.unique)) out.unique = true;
  if (bool(raw.indexed)) out.indexed = true;
  if (bool(raw.derived)) out.derived = true;
  if (bool(raw.open)) out.open = true;
  const of = text(raw.of);
  if (of) out.of = of as Ns5OntologyFieldV3['of'];
  const to = list(raw.to).map(text).filter(Boolean);
  if (to.length) out.to = to;
  const values = normalizeValues(raw.values);
  if (values.length) out.values = values;
  const title = text(raw.title);
  if (title) out.title = title;
  const description = text(raw.description);
  if (description) out.description = description;
  const pattern = text(raw.pattern);
  if (pattern) out.pattern = pattern;
  if (typeof raw.maxLength === 'number') out.maxLength = raw.maxLength;
  if (typeof raw.min === 'number') out.min = raw.min;
  if (typeof raw.max === 'number') out.max = raw.max;
  if (typeof raw.default === 'string' || typeof raw.default === 'number' || typeof raw.default === 'boolean') {
    out.default = raw.default;
  }
  const nested = keyed(raw.fields);
  if (Object.keys(nested).length) {
    const fields: Record<string, Ns5OntologyFieldV3> = {};
    for (const [id, child] of Object.entries(nested)) fields[id] = normalizeField(child);
    out.fields = fields;
  }
  return out;
}

function normalizeValues(value: unknown): Ns5OntologyValueV3[] {
  return list(value).map(item => {
    if (typeof item === 'string') return item.trim();
    const raw = record(item);
    const code = text(raw.value);
    if (!code) return '';
    const title = text(raw.title);
    const description = text(raw.description);
    return {
      value: code,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    };
  }).filter(item => (typeof item === 'string' ? item.length > 0 : true)) as Ns5OntologyValueV3[];
}

// --- the links an entity reads ---------------------------------------------

/**
 * The links of one entity. `via` and `path` are the plan's and the catalog's, not the model's: the index
 * is the source and the entity is the reading copy, so a disagreement cannot be introduced by hand.
 */
function normalizeEntityRelationships(
  value: unknown,
  entityId: string,
  context: Ns5OntologyV3EntityContext,
): Record<string, Ns5OntologyRelationshipV3> {
  const out: Record<string, Ns5OntologyRelationshipV3> = {};
  const rows = new Map(context.plan.relationships.map(row => [row.relationshipId, row]));
  for (const [name, raw] of Object.entries(keyed(value, 'name'))) {
    const mine = record(raw);
    const relationshipId = text(mine.relationshipId);
    const row = rows.get(relationshipId);
    const to = text(mine.to);
    const link: Ns5OntologyRelationshipV3 = {
      relationshipId,
      to,
      via: text(mine.via),
      cardinality: oneOf(mine.cardinality, NS5_ONTOLOGY_V3_CARDINALITIES, 'N:1'),
      title: text(mine.title) || name,
    };
    const description = text(mine.description);
    if (description) link.description = description;
    if (row) {
      if (row.mode === 'fk') {
        link.mode = 'fk';
        link.via = row.field || link.via;
      } else if (row.mode === 'throughTable') {
        link.mode = 'throughTable';
        link.via = row.through || link.via;
        if (row.path) link.path = row.path;
        link.derived = true;
      } else if (row.mode === 'mdmRelationship') {
        link.via = row.catalogType || link.via;
        if (row.roles?.length) link.roles = row.roles;
      }
      if (row.to === entityId && row.from !== entityId) link.direction = 'to';
      if (row.required) link.required = true;
    }
    // The tool cannot ask for `boolean | string`, so it asks for `requiredWhen` in the user language;
    // a hand-written fixture still says `required`.
    const requiredWhen = text(mine.requiredWhen) || (typeof mine.required === 'string' ? text(mine.required) : '');
    if (requiredWhen) link.required = requiredWhen;
    else if (mine.required === true) link.required = true;
    const role = text(mine.role);
    if (role && !link.roles) link.role = role;
    const target = record(mine.target);
    if (Object.keys(target).length) {
      const narrowed: Record<string, readonly string[]> = {};
      for (const [field, allowed] of Object.entries(target)) {
        const values = list(allowed).map(text).filter(Boolean);
        if (values.length) narrowed[field] = values;
      }
      if (Object.keys(narrowed).length) link.target = narrowed;
    }
    if (relationshipId) out[name] = link;
  }
  return out;
}

// ---------------------------------------------------------------------------
// T5 — the index
// ---------------------------------------------------------------------------

/**
 * The canonical list of entities and links. `composition` rows never reach it: the child lives inside
 * the parent document, so there is nothing to walk.
 */
export function assembleNs5OntologyIndexV3(
  plan: Ns5OntologyV3PlanDraft,
  moduleNamespaceDescription: string,
): Ns5OntologyIndexV3 {
  const relationships: Ns5OntologyIndexRelationshipV3[] = plan.relationships
    .filter(row => row.mode !== 'composition')
    .map(row => {
      const out: Ns5OntologyIndexRelationshipV3 = {
        relationshipId: row.relationshipId,
        from: row.from,
        to: row.to,
        type: row.type,
        required: row.required,
        mode: row.mode as typeof NS5_ONTOLOGY_V3_INDEX_MODES[number],
        description: row.description,
      };
      if (row.mode === 'fk' && row.field) out.field = row.field;
      if (row.mode === 'mdmRelationship' && row.catalogType) out.catalogType = row.catalogType;
      if (row.mode === 'throughTable' && row.through) out.through = row.through;
      if (row.roles?.length) out.roles = row.roles;
      if (row.path) out.path = row.path;
      if (row.derived) out.derived = true;
      return out;
    });
  return {
    schemaVersion: NS5_ONTOLOGY_SCHEMA_VERSION_V31,
    moduleName: plan.moduleName,
    businessDomain: plan.businessDomain,
    platformOntology: platformOntologyPath(),
    moduleNamespace: { key: plan.moduleName, description: moduleNamespaceDescription },
    entities: plan.entities.map(entity => ({
      entityId: entity.entityId,
      kind: entity.kind,
      ...(entity.kind === 'role' ? { subtype: entity.subtype as MdmSubtypeName } : { class: entity.class }),
    })),
    relationships,
  };
}

// ---------------------------------------------------------------------------
// T6 — readers this step itself uses
// ---------------------------------------------------------------------------

/** Entities a journey names, as the write target or in `affects`. Same contract as the v2 reader. */
export function collectNs5CitedEntitiesV3(
  journeys: ReadonlyArray<{ business: { steps: ReadonlyArray<{ entity: string; affects?: string[] }> } }>,
): Set<string> {
  const cited = new Set<string>();
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.entity) cited.add(step.entity.split('.')[0]);
      for (const affect of step.affects || []) {
        if (affect) cited.add(affect.split('.')[0]);
      }
    }
  }
  return cited;
}

/**
 * The field ids `displayField` and `uniqueKeys` may name on ONE entity: every path of `record.fields`,
 * relative to the entity (`details.identification.name`, `scheduledAt`). This is the same walk as
 * `resolvableFieldPaths` in `solution/ontologyPaths.ts`, without the entity prefix — that helper answers
 * the disclosure question (`<Entity>.<path>`), this one the internal question.
 */
export function ns5ResolvableFieldIdsV3(entity: Ns5OntologyEntityV3): string[] {
  const out: string[] = [];
  walk(entity.record.fields, '');
  return out;

  function walk(fields: Ns5OntologyFieldsV3 | undefined, parent: string): void {
    for (const [id, field] of Object.entries(fields ?? {})) {
      const path = parent ? `${parent}.${id}` : id;
      out.push(path);
      if (field.fields) walk(field.fields, path);
    }
  }
}

/** The columns of a table: every top-level field other than `details`. `uniqueKeys` may only use these. */
export function ns5ColumnIdsV3(entity: Ns5OntologyEntityV3): string[] {
  return Object.keys(entity.record.fields).filter(id => id !== 'details');
}

/** Every rule id the entities cited, platform and module together, in first-seen order. */
export function collectNs5CitedRulesV3(entities: ReadonlyArray<Ns5OntologyEntityV3>): string[] {
  return collectIds(entities.flatMap(entity => [
    ...entity.rules,
    ...(entity.transitions ?? []).flatMap(transition => transition.ruleRefs ?? []),
  ]));
}

/** Every capability id the entities cited. */
export function collectNs5CitedCapabilitiesV3(entities: ReadonlyArray<Ns5OntologyEntityV3>): string[] {
  return collectIds(entities.flatMap(entity => Object.keys(entity.capabilities)));
}

function collectIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Rule ids the module has to write itself: what is cited and is not in the platform catalog.
 * `rules40` receives this list as data (ns5_43 T2 wires it; here it is only recorded).
 */
export function collectNs5ModuleRuleIdsV3(
  entities: ReadonlyArray<Ns5OntologyEntityV3>,
  mdm: MdmOntology,
): string[] {
  return collectNs5CitedRulesV3(entities).filter(id => !(id in mdm.rules));
}

/** A journey step, as the lift reads it. */
export interface Ns5V3JourneyView {
  business: { steps: ReadonlyArray<{ kind: string; entity: string; affects?: string[] }> };
}

export interface Ns5V3LiftResult {
  plan: Ns5OntologyV3PlanDraft;
  entities: Ns5OntologyEntityV3[];
  /** Aggregates absorbed into `module.details`; the caller writes them with `applyNs5ModuleDetails`. */
  moduleDetails: Record<string, Ns5OntologyDetail>;
  liftedEntityIds: string[];
  normalizations: Ns5OntologyV3Normalization[];
}

/**
 * A panel is not a table. A module `entity` that nobody writes, that has no lifecycle, that no link
 * touches and whose only columns are the two the engine writes is a screen panel: its `details` are
 * aggregates of the module, not a record. They are lifted into `module.details` and the entity leaves
 * the ontology — the same decision the v2 `liftNs5AggregateOnlyEntities` makes, over the v3 form.
 *
 * `moduleDetails` is DERIVED here, never asked for: the v3 plan tool has no such field.
 */
export function liftNs5AggregateOnlyEntitiesV3(
  plan: Ns5OntologyV3PlanDraft,
  entities: ReadonlyArray<Ns5OntologyEntityV3>,
  journeys: ReadonlyArray<Ns5V3JourneyView>,
  workflows?: Ns5OntologyV3EntityContext['workflows'],
): Ns5V3LiftResult {
  const written = new Set<string>();
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'act') continue;
      if (step.entity) written.add(step.entity.split('.')[0]);
      for (const affect of step.affects ?? []) if (affect) written.add(affect.split('.')[0]);
    }
  }
  // ns5_49: a process stage is a writer too. Without this an entity only a `mechanical`/`llm` stage
  // writes would be read as a panel and lifted out of the ontology.
  for (const stage of collectNs5CitedProcessStages(workflows)) written.add(stage.entityId);
  const linked = new Set<string>();
  for (const row of plan.relationships) {
    linked.add(row.from);
    linked.add(row.to);
  }
  const moduleDetails: Record<string, Ns5OntologyDetail> = {};
  const liftedEntityIds: string[] = [];
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const kept: Ns5OntologyEntityV3[] = [];

  for (const entity of entities) {
    if (!isAggregateOnlyV3(entity, written, linked)) {
      kept.push(entity);
      continue;
    }
    const leaves = Object.entries(entity.record.fields.details?.fields ?? {});
    for (const [id, field] of leaves) {
      moduleDetails[id] = {
        type: (field.type === 'object' || field.type === 'record' ? 'json' : field.type) as Ns5OntologyDetail['type'],
        description: field.description || field.title || id,
      };
    }
    liftedEntityIds.push(entity.entityId);
    normalizations.push({
      kind: 'derivedFromPlatform',
      entityId: entity.entityId,
      detail: `lifted into module.details: ${leaves.map(([id]) => id).join(', ')}`,
    });
  }
  if (!liftedEntityIds.length) {
    return { plan, entities: [...entities], moduleDetails: {}, liftedEntityIds, normalizations };
  }
  const lifted = new Set(liftedEntityIds);
  return {
    plan: {
      ...plan,
      entities: plan.entities.filter(entity => !lifted.has(entity.entityId)),
      relationships: plan.relationships,
      normalizations: [...(plan.normalizations ?? []), ...normalizations],
    },
    entities: kept,
    moduleDetails,
    liftedEntityIds,
    normalizations,
  };
}

function isAggregateOnlyV3(
  entity: Ns5OntologyEntityV3,
  written: ReadonlySet<string>,
  linked: ReadonlySet<string>,
): boolean {
  if (entity.kind !== 'entity') return false;
  if (written.has(entity.entityId) || linked.has(entity.entityId)) return false;
  if (entity.lifecycleStates?.length || entity.transitions?.length) return false;
  if (entity.writer && entity.writer !== 'journey') return false;
  const columns = Object.keys(entity.record.fields).filter(id => id !== 'details');
  if (columns.some(id => id !== 'id' && id !== 'version')) return false;
  return Object.keys(entity.record.fields.details?.fields ?? {}).length > 0;
}

// ---------------------------------------------------------------------------
// T2 / T3 — the platform, projected into the prompt
// ---------------------------------------------------------------------------

/**
 * The level-1 catalog as one line per item: subtypes, reusable types and relationship types with their
 * roles. This replaces `formatNs4Level1CatalogPrompt(level1Catalog())` on the v3 path — the catalog is
 * `mdm.defs.ts` itself, not the fifteen `l4/organization/ontology` files (ns5_43 T6 deletes those).
 */
export function formatNs5PlatformCatalog(mdm: MdmOntology): string {
  const lines: string[] = ['## Platform catalog (level 1)', ''];
  lines.push('### Subtypes (a role sits on exactly one)');
  for (const [name, definition] of Object.entries(mdm.subtypes)) {
    const fields = Object.keys(definition.fields).join(', ');
    lines.push(`- ${name} · ${definition.description} · own fields: ${fields || '(none)'}`);
  }
  lines.push('', '### Reusable value types (`of`)');
  for (const [name, fields] of Object.entries(mdm.types)) {
    lines.push(`- ${name} · ${Object.keys(fields).join(', ')}`);
  }
  lines.push('', '### Relationship types (`mode: mdmRelationship`, `catalogType`)');
  for (const entry of mdm.relationships) {
    const roles = entry.roles.length ? ` · roles: ${entry.roles.join('|')}` : ' · no role';
    lines.push(`- ${entry.type} · ${entry.from.join('|')} -> ${entry.to.join('|')}${roles} · ${entry.description}`);
  }
  return lines.join('\n');
}

/** A node of the tree `resolvePlatformEntity` returns, as this file reads it (no import of the view type). */
export interface Ns5PlatformNodeView {
  id: string;
  path: string;
  title: string;
  type: string;
  required: boolean;
  collection: boolean;
  derived: boolean;
  indexed: boolean;
  unique: boolean;
  of?: string;
  values?: readonly { value: string; title: string }[];
  owner?: 'platform' | 'organization' | 'module';
  open?: true;
  description?: string;
  children?: Ns5PlatformNodeView[];
}

export interface Ns5PlatformTreeView {
  entityId: string;
  title: string;
  description: string;
  displayField: string;
  columns: Ns5PlatformNodeView[];
  details: Ns5PlatformNodeView[];
  relationships: ReadonlyArray<{
    name: string;
    via: string;
    title: string;
    to: readonly string[];
    side: 'from' | 'to' | 'both';
    roles?: readonly string[];
    description?: string;
  }>;
  capabilities: ReadonlyArray<{ id: string; sentence: string; platform?: string }>;
  rules: ReadonlyArray<{ id: string; text: string; platform?: string }>;
}

/**
 * The platform record of a subtype as the starting point of a role: one line per field
 * (`path · type · required · derived/indexed · description`), then the links, the capabilities with
 * their platform status and the rules. Compact on purpose — the model has to read it whole.
 */
export function formatNs5PlatformStartingPoint(view: Ns5PlatformTreeView, subtype: string): string {
  const lines: string[] = [`## Starting point (platform record for ${subtype})`, ''];
  lines.push(`displayField: ${view.displayField}`, '');
  lines.push('### Columns of the record');
  for (const node of view.columns) lines.push(`- ${fieldLine(node)}`);
  lines.push('', '### details (the document, branch by branch)');
  for (const branch of view.details) {
    const owner = branch.owner ? ` · owner ${branch.owner}` : '';
    const open = branch.open ? ' · open (declared elsewhere, you read it)' : '';
    lines.push(`- ${branch.path}${owner}${open}${branch.description ? ` · ${branch.description}` : ''}`);
    for (const child of branch.children ?? []) {
      lines.push(`  - ${fieldLine(child)}`);
      for (const grandchild of child.children ?? []) lines.push(`    - ${fieldLine(grandchild)}`);
    }
  }
  lines.push('', '### Relationship types this subtype takes part in');
  for (const link of view.relationships) {
    const roles = link.roles?.length ? ` · roles: ${link.roles.join('|')}` : '';
    lines.push(`- ${link.via} · ${link.side} · to ${link.to.join('|')}${roles} · ${link.title}`);
  }
  lines.push('', '### Capabilities of the catalog (pick by id; write your own sentence)');
  for (const capability of view.capabilities) {
    lines.push(`- ${capability.id} · ${capability.sentence}`);
  }
  lines.push('', '### Rules of the catalog (cite by id)');
  for (const rule of view.rules) lines.push(`- ${rule.id} · ${rule.text}`);
  return lines.join('\n');
}

/**
 * The catalog of a family as the starting point of a TABLE — the same compact projection a role gets
 * from the platform record, so the fan-out reads one form and not two (ns5_46 T4).
 *
 * `evidence` is NOT printed: it is where the status was measured, for whoever reviews the catalog, and
 * it would cost the prompt a file and a line per capability with nothing to do with the module. The
 * status itself is printed, because a model has to know what it may lean on.
 */
export function formatNs5FamilyStartingPoint(
  catalog: DataFamilyOntology,
  entity: Pick<Ns5OntologyV3PlanEntity, 'entityId' | 'storage'>,
): string {
  const lines: string[] = [`## Starting point (the ${catalog.family} catalog — ${catalog.title})`, ''];
  lines.push(catalog.description, '');
  if (entity.storage) {
    lines.push(`This entity: family ${catalog.family} · storage ${entity.storage.kind} · table ${entity.storage.table}`, '');
  }
  lines.push(`### The record of a ${catalog.family} table`);
  for (const [id, field] of Object.entries(catalog.record.fields)) {
    lines.push(`- ${catalogFieldLine(id, field)}`);
    // One level deep: the document of a derived table declares what goes inside it.
    for (const [childId, child] of Object.entries(field.fields ?? {})) {
      lines.push(`  - ${catalogFieldLine(childId, child)}`);
    }
  }
  lines.push('', '### How a table of this family is written');
  for (const line of catalog.recommendations) lines.push(`- ${line}`);
  lines.push('', '### Capabilities of the catalog (pick by id; write your own sentence)');
  for (const [id, capability] of Object.entries(catalog.capabilities)) {
    lines.push(`- ${id} · ${capability.source} · ${capability.sentence} · platform: ${capability.platform}`);
  }
  lines.push('', '### Where the rows live');
  for (const [id, sentence] of Object.entries(catalog.storage)) lines.push(`- ${id} · ${sentence}`);
  lines.push('', '### What the engine does differently today');
  for (const [id, sentence] of Object.entries(catalog.knownDivergences)) lines.push(`- ${id} · ${sentence}`);
  return lines.join('\n');
}

function catalogFieldLine(id: string, field: MdmDefField): string {
  const parts = [id, field.collection ? `${field.type}[]` : field.type];
  parts.push(field.required ? 'required' : 'optional');
  const marks: string[] = [];
  if (field.derived) marks.push('derived');
  if (field.indexed) marks.push('indexed');
  if (field.unique) marks.push('unique');
  if (marks.length) parts.push(marks.join('+'));
  if (field.values?.length) parts.push(`values: ${field.values.join('|')}`);
  if (field.description) parts.push(field.description);
  return parts.join(' · ');
}

function fieldLine(node: Ns5PlatformNodeView): string {
  const parts = [node.path, node.collection ? `${node.type}[]` : node.type];
  parts.push(node.required ? 'required' : 'optional');
  const marks: string[] = [];
  if (node.derived) marks.push('derived');
  if (node.indexed) marks.push('indexed');
  if (node.unique) marks.push('unique');
  if (node.of) marks.push(`of ${node.of}`);
  if (marks.length) parts.push(marks.join('+'));
  if (node.values?.length) parts.push(`values: ${node.values.map(item => item.value).join('|')}`);
  if (node.description) parts.push(node.description);
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// tools
// ---------------------------------------------------------------------------

export function buildNs5OntologyPlanV3Tool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5OntologyPlan',
    'Submit the frozen ontology overview: entities (role over an MDM subtype, or a table of the module), '
    + 'each with its family and where its rows live, and the relationships between them. '
    + 'Never roleTag, source, or the target and the name of the table: those are derived.',
    schema,
  );
}

export function buildNs5OntologyEntityV3Tool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Entity',
    'Submit one entity: the record tree (columns and details), the links it reads, the capabilities '
    + 'with the sentence of this module, and the rule ids it obeys.',
    schema,
  );
}

export { MEMBER_ID as NS5_V3_MEMBER_ID, ENTITY_ID as NS5_V3_ENTITY_ID };
