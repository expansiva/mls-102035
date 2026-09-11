/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import {
  NS5_ONTOLOGY_SCHEMA_VERSION,
  type Ns5ModuleArtifact,
  type Ns5OntologyEntityArtifact,
  type Ns5OntologyField,
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
  storage: Ns5OntologyEntityArtifact['storage'];
}

export interface Ns5OntologyPlanRelationship {
  relationshipId: string;
  fromEntity: string;
  toEntity: string;
  type: string;
  required: boolean;
  persistence: { mode: Ns5OntologyPersistenceMode };
}

export interface Ns5OntologyPlanDraft {
  moduleName: string;
  businessDomain: string;
  entities: Ns5OntologyPlanEntity[];
  relationships: Ns5OntologyPlanRelationship[];
  /** Organization-wide aggregates; copied onto module.defs.ts at persist. */
  moduleDetails?: Record<string, string>;
  /**
   * Ids removed by `liftNs5AggregateOnlyEntities` after fan-out. Not an LLM field;
   * normalize drops it. The ontology gate skips `NS5_ONTOLOGY_JOURNEY_ENTITY` for these
   * names so a locate→inspect of the former panel still closes ontology30.
   */
  liftedAggregateEntities?: string[];
}

export interface Ns5OntologyEntityDraft {
  entityId: string;
  fields: Ns5OntologyField[];
  details?: Record<string, string>;
  lifecycleStates: Ns5OntologyEntityArtifact['lifecycleStates'];
  transitions: Ns5OntologyEntityArtifact['transitions'];
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

export function buildNs5OntologyPlanTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5OntologyPlan',
    'Submit the frozen ontology overview: entities (kind, party, mdmSubtype, displayField, storage), relationships without realization, and moduleDetails for organization-wide aggregates.',
    schema,
  );
}

export function buildNs5OntologyEntityTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Entity',
    'Submit fields, calculated details, lifecycle states and allowed transitions for one frozen entity.',
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
  const entities = list(root.entities).map(item => normalizePlanEntity(item, moduleName, journeys)).filter(entity => entity.entityId);
  const moduleDetails = normalizeDetails(root.moduleDetails);
  return {
    moduleName: memberId(text(root.moduleName) || moduleName, moduleName),
    businessDomain: text(root.businessDomain),
    entities,
    relationships: list(root.relationships).map(normalizePlanRelationship).filter(item => item.relationshipId),
    ...(moduleDetails ? { moduleDetails } : {}),
  };
}

/** Copies organization-wide aggregates onto the module envelope. Empty omits the field. */
export function applyNs5ModuleDetails(
  module: Ns5ModuleArtifact,
  details: Record<string, string> | undefined,
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
 * Same predicate as `NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY`: core/supporting, details
 * not empty, no journey `act` on it or in `affects`.
 */
export function isNs5AggregateOnlyEntity(
  entity: { entityId: string; kind: string; details?: Record<string, string> },
  journeys: ReadonlyArray<Ns5AggregateJourneyView>,
): boolean {
  return (entity.kind === 'core' || entity.kind === 'supporting')
    && !!entity.details
    && Object.keys(entity.details).length > 0
    && !ns5EntityHasActOrAffects(journeys, entity.entityId);
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
 * drop them from the plan. A relationship to another entity is not lifted (the gate
 * stays as the net). Two lifted entities claiming the same details key is an error;
 * a key already on `moduleDetails` is kept, not overwritten.
 */
export function liftNs5AggregateOnlyEntities(
  plan: Ns5OntologyPlanDraft,
  details: Ns5OntologyEntityDraft[],
  journeys: ReadonlyArray<Ns5AggregateJourneyView>,
): Ns5AggregateLiftResult {
  const byId = new Map(details.map(item => [item.entityId, item]));
  const merged: Record<string, string> = { ...(plan.moduleDetails || {}) };
  const origin = new Map<string, string>();
  for (const key of Object.keys(merged)) origin.set(key, 'moduleDetails');
  const toRemove = new Set<string>();
  const issues: Ns5AggregateLiftIssue[] = [];

  for (const entity of plan.entities) {
    const detail = byId.get(entity.entityId);
    if (!detail) continue;
    if (!isNs5AggregateOnlyEntity({ entityId: entity.entityId, kind: entity.kind, details: detail.details }, journeys)) {
      continue;
    }
    if (plan.relationships.some(item => item.fromEntity === entity.entityId || item.toEntity === entity.entityId)) {
      continue;
    }
    for (const [key, description] of Object.entries(detail.details || {})) {
      const previous = origin.get(key);
      if (previous && previous !== 'moduleDetails') {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_AGGREGATE_DETAIL_COLLISION',
          message: `Aggregate '${key}' is defined on ${previous}.details and ${entity.entityId}.details.`,
          path: `entities.${entity.entityId}.details.${key}`,
        });
      } else if (!previous) {
        merged[key] = description;
        origin.set(key, entity.entityId);
      }
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
  const nextPlan: Ns5OntologyPlanDraft = {
    ...plan,
    entities: plan.entities.filter(entity => !toRemove.has(entity.entityId)),
    relationships: plan.relationships.filter(item => !toRemove.has(item.fromEntity) && !toRemove.has(item.toEntity)),
    ...(Object.keys(merged).length ? { moduleDetails: merged } : {}),
    liftedAggregateEntities: liftedEntityIds,
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

export function normalizeNs5OntologyEntity(value: unknown, entityId: string): Ns5OntologyEntityDraft {
  const root = record(value);
  const details = normalizeDetails(root.details);
  return {
    entityId: normalizeEntityId(root.entityId) || entityId,
    fields: list(root.fields).map(normalizeField).filter(field => field.fieldId),
    ...(details ? { details } : {}),
    lifecycleStates: list(root.lifecycleStates).map(normalizeLifecycleState).filter(item => item.state),
    transitions: list(root.transitions).map(normalizeTransition).filter(item => item.transitionId),
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
      persistence: { mode: relationship.persistence.mode },
      realization: realization || emptyRealization(relationship),
    } satisfies Ns5OntologyRelationship;
  });
  return { entities, relationships };
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
    steps: ReadonlyArray<{ kind: string; entity: string }>;
  };
}

/**
 * Structural I2 signal for one entity: a second `act` (after the first create) requires
 * declared transitions; a `decide` requires a branching origin. Same walk finalize80.checkI2
 * uses — ontology30 imports this; finalize80 must not recompute it.
 */
export interface Ns5LifecycleSignal {
  requiresTransitions: boolean;
  requiresBranching: boolean;
}

export function collectNs5LifecycleSignal(
  journeys: ReadonlyArray<Ns5LifecycleJourneyView>,
  entityId: string,
): Ns5LifecycleSignal {
  let acts = 0;
  let requiresBranching = false;
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.entity !== entityId) continue;
      if (step.kind === 'act') acts += 1;
      else if (step.kind === 'decide') requiresBranching = true;
    }
  }
  return { requiresTransitions: acts >= 2, requiresBranching };
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
    ...(detail?.details && Object.keys(detail.details).length ? { details: detail.details } : {}),
    lifecycleStates: detail?.lifecycleStates || [],
    transitions: detail?.transitions || [],
    storage,
    ...(plan.mutability ? { mutability: plan.mutability } : {}),
  };
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
  // kind mdm; appendOnly contradicts mdm. A second act or a decide also contradicts
  // appendOnly (the plan freezes mutability). Drop them here — same class as journeys20 handoffTo.
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
    persistence: { mode: text(persistence.mode) as Ns5OntologyPersistenceMode },
  };
}

function normalizeField(value: unknown): Ns5OntologyField {
  const source = record(value);
  const enumValues = uniqueMemberIds(source.enum);
  return {
    fieldId: memberId(text(source.fieldId), ''),
    title: text(source.title),
    type: text(source.type) as Ns5OntologyField['type'],
    required: source.required === true,
    ...(enumValues.length ? { enum: enumValues } : {}),
    description: text(source.description),
  };
}

function normalizeDetails(value: unknown): Record<string, string> | undefined {
  if (Array.isArray(value)) {
    const details: Record<string, string> = {};
    for (const item of value) {
      const entry = record(item);
      const name = memberId(text(entry.name) || text(entry.fieldId), '');
      const description = text(entry.description);
      if (name && description) details[name] = description;
    }
    return Object.keys(details).length ? details : undefined;
  }
  const source = record(value);
  const details: Record<string, string> = {};
  for (const [key, raw] of Object.entries(source)) {
    const name = memberId(key, '');
    const description = text(raw);
    if (name && description) details[name] = description;
  }
  return Object.keys(details).length ? details : undefined;
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
