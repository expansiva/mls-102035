/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import {
  NS5_ONTOLOGY_SCHEMA_VERSION,
  type Ns5ModuleArtifact,
  type Ns5OntologyDetail,
  type Ns5OntologyEntityArtifact,
  type Ns5OntologyEnumValue,
  type Ns5OntologyField,
  type Ns5OntologyFieldConstraints,
  type Ns5OntologyIndexArtifact,
  type Ns5OntologyRelationship,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;

export const NS5_ONTOLOGY_MAX_PARALLEL = 20 as const;

export const NS5_ONTOLOGY_KINDS = ['core', 'event', 'supporting', 'mdm', 'valueObject'] as const;
export const NS5_ONTOLOGY_PARTIES = ['person', 'organization', 'none'] as const;
export const NS5_ONTOLOGY_FIELD_TYPES = [
  'uuid', 'string', 'text', 'number', 'integer', 'boolean', 'money', 'date', 'datetime', 'json',
] as const;
export const NS5_ONTOLOGY_STORAGE_TARGETS = ['moduleDatabase', 'mdm', 'external'] as const;
export const NS5_ONTOLOGY_RELATIONSHIP_TYPES = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'] as const;
export const NS5_ONTOLOGY_PERSISTENCE_MODES = [
  'moduleReference', 'crossStoreReference', 'mdmRelationship', 'externalReference',
] as const;
export const NS5_ONTOLOGY_REALIZATION_KINDS = [
  'fieldReference', 'fieldCollection', 'mdmRelationship', 'externalReference',
] as const;
export const NS5_ONTOLOGY_REACHED_BY = ['actor', 'command', 'time'] as const;

export type Ns5OntologyKind = typeof NS5_ONTOLOGY_KINDS[number];
export type Ns5OntologyParty = typeof NS5_ONTOLOGY_PARTIES[number];
export type Ns5OntologyFieldType = typeof NS5_ONTOLOGY_FIELD_TYPES[number];
export type Ns5OntologyStorageTarget = typeof NS5_ONTOLOGY_STORAGE_TARGETS[number];
export type Ns5OntologyRelationshipType = typeof NS5_ONTOLOGY_RELATIONSHIP_TYPES[number];
export type Ns5OntologyPersistenceMode = typeof NS5_ONTOLOGY_PERSISTENCE_MODES[number];
export type Ns5OntologyRealizationKind = typeof NS5_ONTOLOGY_REALIZATION_KINDS[number];
export type Ns5OntologyReachedBy = typeof NS5_ONTOLOGY_REACHED_BY[number];
export type Ns5OntologyTransitionBy = string[] | 'system' | 'time';

export interface Ns5OntologyPlanEntity {
  entityId: string;
  title: string;
  description: string;
  kind: Ns5OntologyKind;
  party: Ns5OntologyParty;
  mdmSubtype?: string;
  displayField: string;
  mutability?: 'appendOnly';
  writer?: 'journey' | 'crud' | 'inbound';
  storage: Ns5OntologyEntityArtifact['storage'];
}

export interface Ns5OntologyPlanRelationship {
  relationshipId: string;
  fromEntity: string;
  toEntity: string;
  type: string;
  required: boolean;
  description: string;
  persistence: { mode: Ns5OntologyPersistenceMode };
}

export interface Ns5OntologyPlanDraft {
  moduleName: string;
  businessDomain: string;
  entities: Ns5OntologyPlanEntity[];
  relationships: Ns5OntologyPlanRelationship[];
  /** Organization-wide aggregates; copied onto module.defs.ts at persist. */
  moduleDetails?: Record<string, Ns5OntologyDetail>;
  /**
   * Ids removed by `liftNs5AggregateOnlyEntities` after fan-out. Not an LLM field;
   * normalize drops it. The ontology gate skips `NS5_ONTOLOGY_JOURNEY_ENTITY` for these
   * names so a locate→inspect of the former panel still closes ontology30.
   */
  liftedAggregateEntities?: string[];
  /**
   * Deterministic form changes recorded on the ontology30-plan draft, not on the
   * entity artifact. Normalize writes it; not an LLM field.
   */
  normalizations?: Ns5OntologyFormNormalization[];
}

export type Ns5OntologyFormNormalizationKind =
  | 'dropCrud'
  | 'dropUniqueIdField'
  | 'dropUniqueKeyIdField'
  | 'dropValueObjectTableAttrs'
  | 'liftedFields'
  | 'addTransitionBy'
  | 'replacePlanModuleDetails'
  | 'writerDerived';

/** Cited `transitionRef` exists but `by` omitted the journey actor; normalize adds it. */
export const NS5_ONTOLOGY_TRANSITION_BY_ADDED = 'addTransitionBy' as const;


/** Child written inside the parent's act, or MDM attached by a create act. */
export const NS5_ONTOLOGY_WRITER_DERIVED = 'writerDerived' as const;

/** Same shape as access60 `draft.normalizations[]`. */
export interface Ns5OntologyFormNormalization {
  kind: Ns5OntologyFormNormalizationKind;
  entityId: string;
  detail: string;
  writerKind?: 'parent' | 'attach';
  via?: Ns5ResolvedWriterVia;
}

export interface Ns5OntologyEntityDraft {
  entityId: string;
  fields: Ns5OntologyField[];
  uniqueKeys?: string[][];
  details?: Record<string, Ns5OntologyDetail>;
  lifecycleStates: Ns5OntologyEntityArtifact['lifecycleStates'];
  transitions: Ns5OntologyEntityArtifact['transitions'];
  /** Repair path: entity worker may set crud/inbound when the plan omitted it. */
  writer?: 'journey' | 'crud' | 'inbound';
  /** Normalize drops conflicting crud; not an LLM field. */
  normalizations?: Ns5OntologyFormNormalization[];
}

export interface Ns5OntologyBinding {
  relationshipId: string;
  realization: Ns5OntologyRelationship['realization'];
}

export interface Ns5OntologyBindingsDraft {
  bindings: Ns5OntologyBinding[];
}

export interface Ns5OntologyAssembly {
  entities: Ns5OntologyEntityArtifact[];
  index: Ns5OntologyIndexArtifact;
}

export type Ns5EntityWriter = 'journey' | 'crud' | 'inbound';

export function ns5EntityWriter(entity: { writer?: Ns5EntityWriter }): Ns5EntityWriter {
  return entity.writer === 'crud' || entity.writer === 'inbound' ? entity.writer : 'journey';
}

export type Ns5ResolvedWriterKind =
  | 'journey'
  | 'affects'
  | 'parent'
  | 'attach'
  | 'crud'
  | 'inbound'
  | 'none';

export interface Ns5ResolvedWriterVia {
  entityId: string;
  relationshipId: string;
  stepRef?: string;
}

export interface Ns5ResolvedEntityWriter {
  kind: Ns5ResolvedWriterKind;
  via?: Ns5ResolvedWriterVia;
}

export type Ns5WriterPlanView = {
  entities: ReadonlyArray<{ entityId: string; kind: string; writer?: Ns5EntityWriter }>;
  relationships: ReadonlyArray<{
    relationshipId: string;
    fromEntity: string;
    toEntity: string;
    type: string;
    required?: boolean;
  }>;
};

export type Ns5WriterJourneyView = {
  journeyId?: string;
  business: {
    actorRef?: string;
    steps: ReadonlyArray<{
      stepId?: string;
      kind: string;
      entity: string;
      affects?: readonly string[];
      effect?: string;
    }>;
  };
};

export type Ns5WriterEntityView = {
  entityId: string;
  kind?: string;
  writer?: Ns5EntityWriter;
};

function manySideOf(rel: Ns5WriterPlanView['relationships'][number]): { many: string; one: string } | undefined {
  if (rel.type === 'manyToOne') return { many: rel.fromEntity, one: rel.toEntity };
  if (rel.type === 'oneToMany') return { many: rel.toEntity, one: rel.fromEntity };
  return undefined;
}

function writerStepRef(
  journey: Ns5WriterJourneyView,
  step: Ns5WriterJourneyView['business']['steps'][number],
): string | undefined {
  const stepId = step.stepId || '';
  if (journey.journeyId && stepId) return `${journey.journeyId}.${stepId}`;
  return stepId || undefined;
}

function findDirectActWriter(
  journeys: ReadonlyArray<Ns5WriterJourneyView>,
  entityId: string,
): { kind: 'journey' | 'affects'; stepRef?: string } | undefined {
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'act') continue;
      if (step.entity === entityId) return { kind: 'journey', stepRef: writerStepRef(journey, step) };
    }
  }
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'act') continue;
      if ((step.affects || []).includes(entityId)) return { kind: 'affects', stepRef: writerStepRef(journey, step) };
    }
  }
  return undefined;
}

function findCreateActStepRef(
  journeys: ReadonlyArray<Ns5WriterJourneyView>,
  entityId: string,
): string | undefined {
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'act' || step.effect !== 'create') continue;
      if (step.entity === entityId || (step.affects || []).includes(entityId)) {
        return writerStepRef(journey, step);
      }
    }
  }
  return undefined;
}

/**
 * Single writer resolution: declared act/affects/crud/inbound, else derived parent
 * (non-mdm many-side of a manyToOne/oneToMany whose other side has a writer) or
 * attach (mdm referenced by a required FK of a record created by an act).
 */
export function ns5ResolveEntityWriter(
  entity: Ns5WriterEntityView,
  plan: Ns5WriterPlanView | undefined,
  journeys: ReadonlyArray<Ns5WriterJourneyView>,
  depth = 0,
  visiting: ReadonlySet<string> = new Set(),
): Ns5ResolvedEntityWriter {
  const entityId = entity.entityId;
  if (!entityId || depth > 3 || visiting.has(entityId)) return { kind: 'none' };
  const direct = findDirectActWriter(journeys, entityId);
  if (direct) return { kind: direct.kind };
  if (entity.writer === 'crud') return { kind: 'crud' };
  if (entity.writer === 'inbound') return { kind: 'inbound' };
  if (!plan) return { kind: 'none' };

  const nextVisiting = new Set(visiting);
  nextVisiting.add(entityId);

  if (entity.kind !== 'mdm') {
    for (const rel of plan.relationships) {
      const sides = manySideOf(rel);
      if (!sides || sides.many !== entityId) continue;
      const parentEntity = plan.entities.find(item => item.entityId === sides.one);
      if (!parentEntity) continue;
      const parentWriter = ns5ResolveEntityWriter(parentEntity, plan, journeys, depth + 1, nextVisiting);
      if (parentWriter.kind === 'none') continue;
      return {
        kind: 'parent',
        via: {
          entityId: sides.one,
          relationshipId: rel.relationshipId,
          ...(parentWriter.via?.stepRef ? { stepRef: parentWriter.via.stepRef } : {}),
        },
      };
    }
  }

  if (entity.kind === 'mdm') {
    for (const rel of plan.relationships) {
      if (rel.required !== true) continue;
      const sides = manySideOf(rel);
      if (!sides || sides.one !== entityId) continue;
      const stepRef = findCreateActStepRef(journeys, sides.many);
      if (!stepRef) continue;
      return {
        kind: 'attach',
        via: { entityId: sides.many, relationshipId: rel.relationshipId, stepRef },
      };
    }
  }

  return { kind: 'none' };
}

export function recordNs5DerivedWriters(
  plan: Ns5WriterPlanView,
  journeys: ReadonlyArray<Ns5WriterJourneyView>,
): Ns5OntologyFormNormalization[] {
  const extra: Ns5OntologyFormNormalization[] = [];
  for (const entity of plan.entities) {
    const resolved = ns5ResolveEntityWriter(entity, plan, journeys);
    if (resolved.kind !== 'parent' && resolved.kind !== 'attach') continue;
    const via = resolved.via;
    extra.push({
      kind: NS5_ONTOLOGY_WRITER_DERIVED,
      entityId: entity.entityId,
      detail: via
        ? `${resolved.kind} via ${via.entityId}${via.relationshipId ? `.${via.relationshipId}` : ''}`
        : resolved.kind,
      writerKind: resolved.kind,
      ...(via ? { via } : {}),
    });
  }
  return extra;
}

export function buildNs5OntologyPlanTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5OntologyPlan',
    'Submit the frozen ontology overview: entities (kind, party, mdmSubtype, displayField, mutability, writer, storage), relationships without realization, and moduleDetails for organization-wide aggregates.',
    schema,
  );
}

export function buildNs5OntologyEntityTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Entity',
    'Submit fields, uniqueKeys, calculated details, lifecycle states, allowed transitions and writer (journey, crud or inbound) for one frozen entity.',
    schema,
  );
}

export function buildNs5OntologyBindingsTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5RelationshipBindings',
    'Bind every frozen relationship to existing fields. mdm endpoints use exactly the identity field.',
    schema,
  );
}

export function normalizeNs5OntologyPlan(
  value: unknown,
  moduleName: string,
  journeys: ReadonlyArray<Ns5LifecycleJourneyView> = [],
): Ns5OntologyPlanDraft {
  const root = record(value);
  const normalizations: Ns5OntologyFormNormalization[] = [];
  const entities = list(root.entities)
    .map(item => normalizePlanEntity(item, moduleName, journeys))
    .filter(entity => entity.entityId)
    .map(entity => {
      const next = dropConflictingWriter(entity, journeys, false);
      if (next.normalization) normalizations.push(next.normalization);
      if (next.entity.kind !== 'valueObject' || (!next.entity.writer && !next.entity.mutability)) {
        return next.entity;
      }
      const { writer: _droppedWriter, mutability: _droppedMutability, ...rest } = next.entity;
      normalizations.push({
        kind: 'dropValueObjectTableAttrs',
        entityId: next.entity.entityId,
        detail: 'valueObject has no table; writer and mutability removed.',
      });
      return rest;
    });
  const moduleDetails = normalizeDetails(root.moduleDetails);
  const relationships = list(root.relationships).map(normalizePlanRelationship).filter(item => item.relationshipId);
  normalizations.push(...recordNs5DerivedWriters({ entities, relationships }, journeys));
  return {
    moduleName: memberId(text(root.moduleName) || moduleName, moduleName),
    businessDomain: text(root.businessDomain),
    entities,
    relationships,
    ...(moduleDetails ? { moduleDetails } : {}),
    ...(normalizations.length ? { normalizations } : {}),
  };
}

/** Copies organization-wide aggregates onto the module envelope. Empty omits the field. */
/** Strip NS5-only field shape (enum objects, object constraints) for NS4 field helpers. */
export function ns5AsFieldSource(entity: Ns5OntologyEntityArtifact | undefined | null) {
  if (!entity) return entity;
  return {
    entityId: entity.entityId,
    kind: entity.kind,
    storage: entity.storage,
    fields: entity.fields.map(field => ({
      fieldId: field.fieldId,
      type: field.type,
      required: field.required,
      title: field.title,
      description: field.description,
      ...(field.enum?.length ? { enum: field.enum.map(entry => entry.value) } : {}),
    })),
  };
}

export function applyNs5ModuleDetails(
  module: Ns5ModuleArtifact,
  details: Record<string, Ns5OntologyDetail> | undefined,
): Ns5ModuleArtifact {
  if (!details || !Object.keys(details).length) {
    if (!module.details) return module;
    const { details: _dropped, ...rest } = module;
    return rest;
  }
  return { ...module, details };
}

/** Journey slice the aggregate-only predicate reads (act on the entity or in affects). */
export type Ns5AggregateJourneyView = {
  business: {
    steps: ReadonlyArray<{ kind: string; entity: string; affects?: string[] }>;
  };
};

export function ns5EntityHasActOrAffects(
  journeys: ReadonlyArray<Ns5AggregateJourneyView>,
  entityId: string,
): boolean {
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'act') continue;
      if (step.entity === entityId) return true;
      if ((step.affects || []).includes(entityId)) return true;
    }
  }
  return false;
}

/**
 * Fields a person writes: namespace on mdm; any field other than idField otherwise.
 * valueObject has no table and is never a writer check.
 */
export function ns5EntityHasWrittenFields(entity: {
  kind: string;
  fields?: ReadonlyArray<{ fieldId: string }>;
  storage?: { idField?: string };
}): boolean {
  if (entity.kind === 'valueObject') return false;
  const fields = entity.fields || [];
  if (entity.kind === 'mdm') return fields.length > 0;
  const idField = entity.storage?.idField;
  return fields.some(field => field.fieldId && field.fieldId !== idField);
}

const AGGREGATE_LIFT_KINDS = new Set(['core', 'supporting', 'valueObject', 'event']);

function ns5EntityHasOnlyIdentityFields(entity: {
  kind: string;
  fields?: ReadonlyArray<{ fieldId: string }>;
  storage?: { idField?: string };
}): boolean {
  const fields = entity.fields || [];
  if (entity.kind === 'mdm') return fields.length === 0;
  const idField = entity.storage?.idField;
  return fields.every(field => !field.fieldId || field.fieldId === idField);
}

/**
 * Same predicate as `NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY`: non-mdm kind, details
 * not empty, writer kind none, no field besides idField, no lifecycle. A period
 * (or any other) field is not a panel — it belongs in module.details description.
 */
export function isNs5AggregateOnlyEntity(
  entity: {
    entityId: string;
    kind: string;
    writer?: Ns5EntityWriter;
    details?: Record<string, unknown>;
    lifecycleStates?: ReadonlyArray<unknown>;
    transitions?: ReadonlyArray<unknown>;
    fields?: ReadonlyArray<{ fieldId: string }>;
    storage?: { idField?: string };
  },
  journeys: ReadonlyArray<Ns5WriterJourneyView>,
  plan?: Ns5WriterPlanView,
): boolean {
  if (!AGGREGATE_LIFT_KINDS.has(entity.kind)) return false;
  if (!entity.details || !Object.keys(entity.details).length) return false;
  if (entity.lifecycleStates && entity.lifecycleStates.length) return false;
  if (entity.transitions && entity.transitions.length) return false;
  if (!ns5EntityHasOnlyIdentityFields(entity)) return false;
  return ns5ResolveEntityWriter(entity, plan, journeys).kind === 'none';
}

export interface Ns5AggregateLiftIssue {
  severity: 'error';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5AggregateLiftResult {
  plan: Ns5OntologyPlanDraft;
  details: Ns5OntologyEntityDraft[];
  liftedEntityIds: string[];
  issues: Ns5AggregateLiftIssue[];
}

/**
 * After entity fan-out: move aggregate-only entities into `plan.moduleDetails` and
 * drop them from the plan. Extra fields besides idField are reading parameters —
 * discarded and recorded on `normalizations[]`. A relationship to another entity
 * is not lifted (the gate stays as the net). Two lifted entities claiming the same
 * details key is an error. When a panel is lifted, it is the source: its keys
 * replace the same keys on `plan.moduleDetails`; plan keys the panel does not
 * name are kept.
 */
export function liftNs5AggregateOnlyEntities(
  plan: Ns5OntologyPlanDraft,
  details: Ns5OntologyEntityDraft[],
  journeys: ReadonlyArray<Ns5AggregateJourneyView>,
): Ns5AggregateLiftResult {
  const byId = new Map(details.map(item => [item.entityId, item]));
  const merged: Record<string, Ns5OntologyDetail> = { ...(plan.moduleDetails || {}) };
  const origin = new Map<string, string>();
  for (const key of Object.keys(merged)) origin.set(key, 'moduleDetails');
  const toRemove = new Set<string>();
  const liftedFields: Ns5OntologyFormNormalization[] = [];
  const replacedPlanKeys: Ns5OntologyFormNormalization[] = [];
  const issues: Ns5AggregateLiftIssue[] = [];

  for (const entity of plan.entities) {
    const detail = byId.get(entity.entityId);
    if (!detail) continue;
    if (!isNs5AggregateOnlyEntity({
      entityId: entity.entityId,
      kind: entity.kind,
      writer: entity.writer,
      details: detail.details,
      lifecycleStates: detail.lifecycleStates,
      transitions: detail.transitions,
      fields: detail.fields,
      storage: entity.storage,
    }, journeys, plan)) {
      continue;
    }
    if (plan.relationships.some(item => item.fromEntity === entity.entityId || item.toEntity === entity.entityId)) {
      continue;
    }
    const replaced: string[] = [];
    for (const [key, entry] of Object.entries(detail.details || {})) {
      const previous = origin.get(key);
      if (previous && previous !== 'moduleDetails') {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_AGGREGATE_DETAIL_COLLISION',
          message: `Aggregate '${key}' is defined on ${previous}.details and ${entity.entityId}.details.`,
          path: `entities.${entity.entityId}.details.${key}`,
        });
      } else {
        if (previous === 'moduleDetails') replaced.push(key);
        merged[key] = entry;
        origin.set(key, entity.entityId);
      }
    }
    if (replaced.length) {
      replacedPlanKeys.push({
        kind: 'replacePlanModuleDetails',
        entityId: entity.entityId,
        detail: replaced.join(', '),
      });
    }
    const extra = (detail.fields || [])
      .map(field => field.fieldId)
      .filter(fieldId => fieldId && fieldId !== entity.storage.idField);
    if (extra.length) {
      liftedFields.push({
        kind: 'liftedFields',
        entityId: entity.entityId,
        detail: extra.join(', '),
      });
    }
    toRemove.add(entity.entityId);
  }

  if (issues.length) {
    return { plan, details, liftedEntityIds: plan.liftedAggregateEntities || [], issues };
  }
  if (!toRemove.size) {
    return { plan, details, liftedEntityIds: plan.liftedAggregateEntities || [], issues };
  }

  const liftedEntityIds = uniqueIds([...(plan.liftedAggregateEntities || []), ...toRemove]);
  const nextNormalizations = [...(plan.normalizations || []), ...replacedPlanKeys, ...liftedFields];
  const nextPlan: Ns5OntologyPlanDraft = {
    ...plan,
    entities: plan.entities.filter(entity => !toRemove.has(entity.entityId)),
    relationships: plan.relationships.filter(item => !toRemove.has(item.fromEntity) && !toRemove.has(item.toEntity)),
    ...(Object.keys(merged).length ? { moduleDetails: merged } : {}),
    liftedAggregateEntities: liftedEntityIds,
    ...(nextNormalizations.length ? { normalizations: nextNormalizations } : {}),
  };
  return {
    plan: nextPlan,
    details: details.filter(item => !toRemove.has(item.entityId)),
    liftedEntityIds,
    issues,
  };
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function normalizeNs5OntologyEntity(
  value: unknown,
  entityId: string,
  journeys: ReadonlyArray<Ns5AggregateJourneyView> = [],
  opts: { idField?: string; kind?: string } = {},
): Ns5OntologyEntityDraft {
  const root = record(value);
  const details = normalizeDetails(root.details);
  const lifecycleStates = list(root.lifecycleStates).map(normalizeLifecycleState).filter(item => item.state);
  let transitions = list(root.transitions).map(normalizeTransition).filter(item => item.transitionId);
  const id = normalizeEntityId(root.entityId) || entityId;
  const idField = opts.idField || memberId(text(record(root.storage).idField), '');
  const kind = opts.kind || text(root.kind);
  const normalizations: Ns5OntologyFormNormalization[] = [];
  let fields = list(root.fields).map(normalizeField).filter(field => field.fieldId);
  if (idField && fields.some(field => field.fieldId === idField && field.unique === true)) {
    fields = fields.map(field => {
      if (field.fieldId !== idField || field.unique !== true) return field;
      const { unique: _dropped, ...rest } = field;
      return rest;
    });
    normalizations.push({
      kind: 'dropUniqueIdField',
      entityId: id,
      detail: 'idField unique removed; the id is unique by definition.',
    });
  }
  let uniqueKeys = normalizeUniqueKeys(root.uniqueKeys);
  if (idField && uniqueKeys?.some(key => key.includes(idField))) {
    const next = uniqueKeys.filter(key => !key.includes(idField));
    uniqueKeys = next.length ? next : undefined;
    normalizations.push({
      kind: 'dropUniqueKeyIdField',
      entityId: id,
      detail: 'uniqueKeys containing idField removed; the id is unique by definition.',
    });
  }
  const dropped = dropConflictingWriter(
    { entityId: id, ...persistWriter(readWriter(root)) },
    journeys,
    lifecycleStates.length > 0 || transitions.length > 0,
  );
  const withBy = addCitedTransitionActors(id, transitions, journeys);
  if (withBy.normalizations.length) {
    transitions = withBy.transitions;
    normalizations.push(...withBy.normalizations);
  }
  if (dropped.normalization) normalizations.push(dropped.normalization);
  let writer = dropped.entity.writer;
  if (kind === 'valueObject' && writer) {
    writer = undefined;
    normalizations.push({
      kind: 'dropValueObjectTableAttrs',
      entityId: id,
      detail: 'valueObject has no table; writer removed.',
    });
  }
  return {
    entityId: id,
    fields,
    ...(uniqueKeys ? { uniqueKeys } : {}),
    ...(details ? { details } : {}),
    lifecycleStates,
    transitions,
    ...persistWriter(writer),
    ...(normalizations.length ? { normalizations } : {}),
  };
}

export function normalizeNs5OntologyBindings(value: unknown): Ns5OntologyBindingsDraft {
  const root = record(value);
  return {
    bindings: list(root.bindings).map(normalizeBinding).filter(item => item.relationshipId),
  };
}

export function assembleNs5Ontology(
  plan: Ns5OntologyPlanDraft,
  details: Ns5OntologyEntityDraft[],
  bindings?: Ns5OntologyBindingsDraft,
): Ns5OntologyAssembly {
  const byId = new Map(details.map(item => [item.entityId, item]));
  const entities = plan.entities.map(entity => assembleEntity(plan.moduleName, entity, byId.get(entity.entityId)));
  const bound = applyNs5OntologyBindings(plan, entities, bindings);
  return {
    entities: bound.entities,
    index: {
      schemaVersion: NS5_ONTOLOGY_SCHEMA_VERSION,
      moduleName: plan.moduleName,
      businessDomain: plan.businessDomain,
      entities: bound.entities.map(entity => entity.entityId),
      relationships: bound.relationships,
    },
  };
}

export function applyNs5OntologyBindings(
  plan: Ns5OntologyPlanDraft,
  entities: Ns5OntologyEntityArtifact[],
  bindings?: Ns5OntologyBindingsDraft,
): { entities: Ns5OntologyEntityArtifact[]; relationships: Ns5OntologyRelationship[] } {
  const byRelationship = new Map((bindings?.bindings || []).map(item => [item.relationshipId, item.realization]));
  const relationships = plan.relationships.map(relationship => {
    const realization = byRelationship.get(relationship.relationshipId);
    return {
      relationshipId: relationship.relationshipId,
      fromEntity: relationship.fromEntity,
      toEntity: relationship.toEntity,
      type: relationship.type,
      required: relationship.required,
      description: relationship.description,
      persistence: { mode: relationship.persistence.mode },
      realization: realization || emptyRealization(relationship),
    } satisfies Ns5OntologyRelationship;
  });
  return { entities, relationships };
}

export interface Ns5CitedTransition {
  entityId: string;
  transitionId: string;
  actorRef: string;
  stepId: string;
}

/**
 * ns5_49: a `mechanical` or `llm` stage of workflows50 names the entity it writes and, on
 * `effect: transition`, the transition it applies. In the flow v2 order workflows50 runs BEFORE this
 * step, so the citation is forward: the ontology declares what the stage says it makes happen.
 */
export interface Ns5CitedProcessStage {
  entityId: string;
  effect: 'create' | 'update' | 'transition';
  transitionId: string;
  processId: string;
  taskId: string;
}

/** Journey prose that names a personal scope (own / team / assigned). Data for the plan prompt. */
export const NS5_PERSONAL_SCOPE_PATTERN = new RegExp(
  'próprio|própria|minhas|seus|sua equipe|atribuído',
  'i',
);

export interface Ns5PersonalScopeActor {
  actorId: string;
  title: string;
  journeyIds: string[];
}

export function collectNs5PersonalScopeActors(
  actors: ReadonlyArray<{ actorId: string; kind: string; title: string }>,
  journeys: ReadonlyArray<{
    journeyId: string;
    business: {
      actorRef?: string;
      title?: string;
      goal?: string;
      steps: ReadonlyArray<{ title?: string; description?: string }>;
      outcome?: { statement?: string; evidence?: readonly string[] };
    };
  }>,
): Ns5PersonalScopeActor[] {
  const result: Ns5PersonalScopeActor[] = [];
  for (const actor of actors) {
    if (actor.kind !== 'internal' || !actor.actorId) continue;
    const journeyIds: string[] = [];
    for (const journey of journeys) {
      if (journey.business.actorRef !== actor.actorId) continue;
      if (!NS5_PERSONAL_SCOPE_PATTERN.test(personalScopeJourneyText(journey))) continue;
      if (journey.journeyId) journeyIds.push(journey.journeyId);
    }
    if (journeyIds.length) result.push({ actorId: actor.actorId, title: actor.title || '', journeyIds });
  }
  return result;
}

export function formatNs5PersonalScopeActors(items: readonly Ns5PersonalScopeActor[]): string {
  if (!items.length) return '';
  return [
    '## Actors whose scope is personal',
    'Internal actors whose journeys name a personal scope (own records, team, or assignment). This is data, not a rule.',
    ...items.map(item => `- ${item.actorId}${item.title ? ` (${item.title})` : ''}: ${item.journeyIds.join(', ')}`),
  ].join('\n');
}

function personalScopeJourneyText(journey: {
  business: {
    title?: string;
    goal?: string;
    steps: ReadonlyArray<{ title?: string; description?: string }>;
    outcome?: { statement?: string; evidence?: readonly string[] };
  };
}): string {
  const parts = [
    journey.business.title,
    journey.business.goal,
    ...journey.business.steps.flatMap(step => [step.title, step.description]),
    journey.business.outcome?.statement,
    ...(journey.business.outcome?.evidence || []),
  ];
  return parts.filter(Boolean).join('\n');
}

export function collectNs5CitedTransitions(
  journeys: ReadonlyArray<{
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
  }>,
): Ns5CitedTransition[] {
  const cited: Ns5CitedTransition[] = [];
  for (const journey of journeys) {
    const actorRef = journey.business.actorRef || '';
    for (const step of journey.business.steps) {
      if (step.kind !== 'act' || step.effect !== 'transition' || !step.transitionRef || !step.entity) continue;
      cited.push({
        entityId: step.entity,
        transitionId: step.transitionRef,
        actorRef,
        stepId: step.stepId || '',
      });
    }
  }
  return cited;
}

/** The `mechanical`/`llm` stages of every process, in declaration order. Sibling of `collectNs5CitedTransitions`. */
export function collectNs5CitedProcessStages(
  workflows: {
    processes: ReadonlyArray<{
      processId?: string;
      tasks: ReadonlyArray<{
        taskId?: string;
        kind: string;
        entityRef?: string;
        effect?: 'create' | 'update' | 'transition';
        transitionRef?: string;
      }>;
    }>;
  } | null | undefined,
): Ns5CitedProcessStage[] {
  const out: Ns5CitedProcessStage[] = [];
  for (const process of workflows?.processes || []) {
    for (const task of process.tasks || []) {
      if (task.kind !== 'mechanical' && task.kind !== 'llm') continue;
      const entityId = (task.entityRef || '').split('.')[0];
      if (!entityId || !task.effect) continue;
      out.push({
        entityId,
        effect: task.effect,
        transitionId: task.effect === 'transition' ? (task.transitionRef || '') : '',
        processId: process.processId || '',
        taskId: task.taskId || '',
      });
    }
  }
  return out;
}

export function collectNs5CitedEntities(
  journeys: ReadonlyArray<{ business: { steps: ReadonlyArray<{ entity: string; affects?: string[] }> } }>,
): Set<string> {
  const cited = new Set<string>();
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.entity) cited.add(step.entity);
      for (const affect of step.affects || []) {
        if (affect) cited.add(affect);
      }
    }
  }
  return cited;
}

/** Journey view the lifecycle walk understands. Caller supplies index order. */
export interface Ns5LifecycleJourneyView {
  business: {
    actorRef?: string;
    steps: ReadonlyArray<{
      kind: string;
      entity: string;
      affects?: string[];
      stepId?: string;
      effect?: 'create' | 'update' | 'transition';
      transitionRef?: string;
    }>;
  };
}

/**
 * Structural signal for one entity: an `act` with `effect: 'transition'` requires
 * declared transitions; a `decide` requires a branching origin. `create` / `update`
 * do not count (ns5_33: frota relote2, 2 create + 1 update). ontology30 uses this
 * to demand lifecycle; finalize80 I2 uses it only for the decide branching check.
 */
export interface Ns5LifecycleSignal {
  requiresTransitions: boolean;
  requiresBranching: boolean;
}

export function collectNs5LifecycleSignal(
  journeys: ReadonlyArray<Ns5LifecycleJourneyView>,
  entityId: string,
): Ns5LifecycleSignal {
  let requiresTransitions = false;
  let requiresBranching = false;
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.entity !== entityId) continue;
      if (step.kind === 'act' && step.effect === 'transition') requiresTransitions = true;
      else if (step.kind === 'decide') requiresBranching = true;
    }
  }
  return { requiresTransitions, requiresBranching };
}

export function ns5LifecycleHasBranchingOrigin(
  entity: { transitions: ReadonlyArray<{ from: readonly string[] }> },
): boolean {
  const counts = new Map<string, number>();
  for (const transition of entity.transitions) {
    for (const from of transition.from) {
      if (!from) continue;
      counts.set(from, (counts.get(from) || 0) + 1);
    }
  }
  return [...counts.values()].some(count => count >= 2);
}

function assembleEntity(
  moduleName: string,
  plan: Ns5OntologyPlanEntity,
  detail: Ns5OntologyEntityDraft | undefined,
): Ns5OntologyEntityArtifact {
  const storage = { ...plan.storage };
  if (plan.kind === 'mdm') storage.mdmType = storage.mdmType || `${moduleName}.${plan.entityId}`;
  else delete storage.mdmType;
  return {
    schemaVersion: NS5_ONTOLOGY_SCHEMA_VERSION,
    moduleName,
    entityId: plan.entityId,
    title: plan.title,
    description: plan.description,
    kind: plan.kind,
    party: plan.party,
    ...(plan.mdmSubtype ? { mdmSubtype: plan.mdmSubtype } : {}),
    displayField: plan.displayField,
    fields: detail?.fields || [],
    ...(detail?.uniqueKeys?.length ? { uniqueKeys: detail.uniqueKeys } : {}),
    ...(detail?.details && Object.keys(detail.details).length ? { details: detail.details } : {}),
    lifecycleStates: detail?.lifecycleStates || [],
    transitions: detail?.transitions || [],
    storage,
    ...(plan.mutability ? { mutability: plan.mutability } : {}),
    ...persistWriter(
      !entityHasLifecycle(detail)
        ? (detail?.writer && detail.writer !== 'journey' ? detail.writer : plan.writer)
        : (detail?.writer === 'inbound' || plan.writer === 'inbound' ? 'inbound' : undefined),
    ),
  };
}

function entityHasLifecycle(detail: Ns5OntologyEntityDraft | undefined): boolean {
  return (detail?.lifecycleStates.length || 0) > 0 || (detail?.transitions.length || 0) > 0;
}

function addCitedTransitionActors(
  entityId: string,
  transitions: Ns5OntologyEntityArtifact['transitions'],
  journeys: ReadonlyArray<{
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
  }>,
): { transitions: Ns5OntologyEntityArtifact['transitions']; normalizations: Ns5OntologyFormNormalization[] } {
  const cited = collectNs5CitedTransitions(journeys).filter(item => item.entityId === entityId);
  if (!cited.length) return { transitions, normalizations: [] };
  const normalizations: Ns5OntologyFormNormalization[] = [];
  const next = transitions.map(transition => {
    const actors = [...new Set(
      cited.filter(item => item.transitionId === transition.transitionId).map(item => item.actorRef).filter(Boolean),
    )];
    if (!actors.length || !Array.isArray(transition.by)) return transition;
    const missing = actors.filter(actor => !transition.by.includes(actor));
    if (!missing.length) return transition;
    normalizations.push({
      kind: NS5_ONTOLOGY_TRANSITION_BY_ADDED,
      entityId,
      detail: `by added ${missing.join(', ')} on ${transition.transitionId} (cited transitionRef).`,
    });
    return { ...transition, by: [...transition.by, ...missing] };
  });
  return { transitions: next, normalizations };
}

/** Source-SCC states of the transition graph (Tarjan). Isolated states are not nodes. */
export function ns5SourceSccStates(
  transitions: Ns5OntologyEntityArtifact['transitions'],
): string[] {
  const nodes: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    nodes.push(id);
  };
  const edges: Array<[string, string]> = [];
  for (const transition of transitions) {
    add(transition.to);
    for (const from of transition.from) {
      add(from);
      if (from && transition.to) edges.push([from, transition.to]);
    }
  }
  if (!nodes.length) return [];
  const adj = new Map(nodes.map(node => [node, [] as string[]]));
  for (const [from, to] of edges) adj.get(from)!.push(to);
  let next = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const sccOf = new Map<string, number>();
  let sccCount = 0;
  const connect = (v: string) => {
    index.set(v, next);
    low.set(v, next);
    next += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of adj.get(v) || []) {
      if (!index.has(w)) {
        connect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) !== index.get(v)) return;
    let w = '';
    do {
      w = stack.pop()!;
      onStack.delete(w);
      sccOf.set(w, sccCount);
    } while (w !== v);
    sccCount += 1;
  };
  for (const node of nodes) {
    if (!index.has(node)) connect(node);
  }
  const hasIncoming = new Array<boolean>(sccCount).fill(false);
  for (const [from, to] of edges) {
    const a = sccOf.get(from);
    const b = sccOf.get(to);
    if (a !== undefined && b !== undefined && a !== b) hasIncoming[b] = true;
  }
  return nodes.filter(node => !hasIncoming[sccOf.get(node)!]);
}

export function ns5ReachableStates(
  roots: string[],
  transitions: Ns5OntologyEntityArtifact['transitions'],
): Set<string> {
  const seen = new Set(roots);
  const queue = [...roots];
  while (queue.length) {
    const current = queue.shift()!;
    for (const transition of transitions) {
      if (!transition.from.includes(current) || seen.has(transition.to)) continue;
      seen.add(transition.to);
      queue.push(transition.to);
    }
  }
  return seen;
}

function dropConflictingWriter<T extends { entityId: string; writer?: Ns5EntityWriter }>(
  entity: T,
  journeys: ReadonlyArray<Ns5AggregateJourneyView>,
  hasLifecycle: boolean,
): { entity: T; normalization?: Ns5OntologyFormNormalization } {
  const writer = entity.writer;
  if (writer !== 'crud' && writer !== 'inbound') return { entity };
  const writtenByAct = ns5EntityHasActOrAffects(journeys, entity.entityId);
  if (writer === 'inbound' && !writtenByAct) return { entity };
  if (writer === 'crud' && !writtenByAct && !hasLifecycle) return { entity };
  const { writer: _dropped, ...rest } = entity;
  return {
    entity: rest as T,
    normalization: {
      kind: 'dropCrud',
      entityId: entity.entityId,
      detail: writtenByAct
        ? `writer ${writer} removed; an act writes this entity as entity or affects.`
        : `writer ${writer} removed; lifecycleStates or transitions are present.`,
    },
  };
}

function readWriter(source: Record<string, unknown>): Ns5EntityWriter | undefined {
  const writer = text(source.writer);
  if (writer === 'crud' || writer === 'inbound' || writer === 'journey') return writer;
  if (text(source.maintenance) === 'crud') return 'crud';
  return undefined;
}

function persistWriter(writer: Ns5EntityWriter | undefined): { writer?: 'crud' | 'inbound' } {
  if (writer === 'crud' || writer === 'inbound') return { writer };
  return {};
}

function emptyRealization(relationship: Ns5OntologyPlanRelationship): Ns5OntologyRelationship['realization'] {
  return {
    kind: '',
    ownerEntity: relationship.fromEntity,
    from: { entityId: relationship.fromEntity, fieldIds: [] },
    to: { entityId: relationship.toEntity, fieldIds: [] },
  };
}

function normalizePlanEntity(
  value: unknown,
  moduleName: string,
  journeys: ReadonlyArray<Ns5LifecycleJourneyView>,
): Ns5OntologyPlanEntity {
  const source = record(value);
  const storage = record(source.storage);
  const kind = text(source.kind) as Ns5OntologyKind;
  const entityId = normalizeEntityId(source.entityId);
  // The model fills mdmSubtype and mutability on every entity. mdmSubtype is a role on
  // kind mdm; appendOnly contradicts mdm. An act with effect:transition or a decide also
  // contradicts appendOnly (the plan freezes mutability). Drop them here — same class as journeys20 handoffTo.
  const mdmSubtype = kind === 'mdm' ? text(source.mdmSubtype) : '';
  const signal = collectNs5LifecycleSignal(journeys, entityId);
  const mutability = kind !== 'mdm'
    && text(source.mutability) === 'appendOnly'
    && !signal.requiresTransitions
    && !signal.requiresBranching
    ? 'appendOnly' as const
    : undefined;
  const idField = memberId(text(storage.idField), '');
  const target = text(storage.target) as Ns5OntologyStorageTarget;
  const scope = text(storage.scope);
  const mdmType = text(storage.mdmType) || (kind === 'mdm' && moduleName && entityId ? `${moduleName}.${entityId}` : '');
  return {
    entityId,
    title: text(source.title),
    description: text(source.description),
    kind,
    party: text(source.party) as Ns5OntologyParty,
    ...(mdmSubtype ? { mdmSubtype } : {}),
    displayField: memberId(text(source.displayField), ''),
    ...(mutability ? { mutability } : {}),
    ...persistWriter(readWriter(source)),
    storage: {
      target,
      scope,
      idField,
      ...(mdmType ? { mdmType } : {}),
    },
  };
}

function normalizePlanRelationship(value: unknown): Ns5OntologyPlanRelationship {
  const source = record(value);
  const persistence = record(source.persistence);
  return {
    relationshipId: memberId(text(source.relationshipId), ''),
    fromEntity: normalizeEntityId(source.fromEntity),
    toEntity: normalizeEntityId(source.toEntity),
    type: text(source.type),
    required: source.required === true,
    description: text(source.description),
    persistence: { mode: text(persistence.mode) as Ns5OntologyPersistenceMode },
  };
}

function normalizeField(value: unknown): Ns5OntologyField {
  const source = record(value);
  const enumValues = normalizeEnum(source.enum);
  const constraints = normalizeConstraints(source.constraints);
  return {
    fieldId: memberId(text(source.fieldId), ''),
    title: text(source.title),
    type: text(source.type) as Ns5OntologyField['type'],
    required: source.required === true,
    ...(source.unique === true ? { unique: true } : {}),
    ...(enumValues.length ? { enum: enumValues } : {}),
    ...(constraints ? { constraints } : {}),
    description: text(source.description),
  };
}

function normalizeEnum(value: unknown): Ns5OntologyEnumValue[] {
  const seen = new Set<string>();
  const out: Ns5OntologyEnumValue[] = [];
  for (const item of list(value)) {
    if (typeof item === 'string') continue;
    const entry = record(item);
    const code = memberId(text(entry.value), '');
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({ value: code, title: text(entry.title) });
  }
  return out;
}

function normalizeConstraints(value: unknown): Ns5OntologyFieldConstraints | undefined {
  const source = record(value);
  const out: Ns5OntologyFieldConstraints = {};
  if (typeof source.min === 'number' && Number.isFinite(source.min)) out.min = source.min;
  if (typeof source.max === 'number' && Number.isFinite(source.max)) out.max = source.max;
  if (typeof source.maxLength === 'number' && Number.isFinite(source.maxLength)) out.maxLength = source.maxLength;
  if (typeof source.precision === 'number' && Number.isFinite(source.precision)) out.precision = source.precision;
  return Object.keys(out).length ? out : undefined;
}

function normalizeUniqueKeys(value: unknown): string[][] | undefined {
  if (!Array.isArray(value)) return undefined;
  const keys = value.map(item => uniqueMemberIds(item)).filter(key => key.length);
  return keys.length ? keys : undefined;
}

function normalizeDetails(value: unknown): Record<string, Ns5OntologyDetail> | undefined {
  const details: Record<string, Ns5OntologyDetail> = {};
  if (Array.isArray(value)) {
    for (const item of value) {
      const entry = record(item);
      const name = memberId(text(entry.name) || text(entry.fieldId), '');
      const detail = normalizeDetailValue(entry);
      if (name && detail) details[name] = detail;
    }
  } else {
    const source = record(value);
    for (const [key, raw] of Object.entries(source)) {
      if (typeof raw === 'string') continue;
      const name = memberId(key, '');
      const detail = normalizeDetailValue(raw);
      if (name && detail) details[name] = detail;
    }
  }
  return Object.keys(details).length ? details : undefined;
}

function normalizeDetailValue(value: unknown): Ns5OntologyDetail | undefined {
  const source = record(value);
  const description = text(source.description);
  if (!description) return undefined;
  return {
    type: text(source.type) as Ns5OntologyField['type'],
    description,
  };
}

function normalizeLifecycleState(value: unknown): Ns5OntologyEntityArtifact['lifecycleStates'][number] {
  if (typeof value === 'string') {
    return { state: memberId(value, ''), reachedBy: 'actor' };
  }
  const source = record(value);
  const reachedBy = text(source.reachedBy) || 'actor';
  return {
    state: memberId(text(source.state), ''),
    reachedBy: reachedBy as Ns5OntologyReachedBy,
  };
}

function normalizeTransition(value: unknown): Ns5OntologyEntityArtifact['transitions'][number] {
  const source = record(value);
  const ruleRefs = uniqueMemberIds(source.ruleRefs);
  return {
    transitionId: memberId(text(source.transitionId), ''),
    from: uniqueMemberIds(source.from),
    to: memberId(text(source.to), ''),
    by: normalizeBy(source.by),
    description: text(source.description),
    ...(ruleRefs.length ? { ruleRefs } : {}),
  };
}

function normalizeBy(value: unknown): Ns5OntologyTransitionBy {
  if (value === 'system' || value === 'time') return value;
  if (typeof value === 'string') {
    const token = value.trim();
    if (token === 'system' || token === 'time') return token;
    return token ? [memberId(token, '')].filter(Boolean) : [];
  }
  const items = uniqueMemberIds(value);
  if (items.length === 1 && (items[0] === 'system' || items[0] === 'time')) return items[0];
  return items;
}

function normalizeBinding(value: unknown): Ns5OntologyBinding {
  const source = record(value);
  const realization = record(source.realization);
  return {
    relationshipId: memberId(text(source.relationshipId), ''),
    realization: {
      kind: text(realization.kind),
      ownerEntity: normalizeEntityId(realization.ownerEntity),
      from: normalizeEndpoint(realization.from),
      to: normalizeEndpoint(realization.to),
    },
  };
}

function normalizeEndpoint(value: unknown): { entityId: string; fieldIds: string[] } {
  const source = record(value);
  return {
    entityId: normalizeEntityId(source.entityId),
    fieldIds: uniqueMemberIds(source.fieldIds),
  };
}

function uniqueMemberIds(value: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list(value).map(text).map(entry => memberId(entry, '')).filter(Boolean)) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function normalizeEntityId(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  if (ENTITY_ID.test(raw)) return raw;
  const decomposed = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const words = decomposed.replace(/([a-z0-9])([A-Z])/g, '$1 $2').match(/[A-Za-z0-9]+/g) || [];
  return words.map(word => {
    if (/^[A-Z0-9]+$/.test(word)) return word;
    return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
  }).join('');
}

function memberId(value: string, fallback: string): string {
  const id = normalizeModuleName(value || fallback, fallback);
  return MEMBER_ID.test(id) ? id : fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
