/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import {
  NS5_ONTOLOGY_SCHEMA_VERSION,
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
    'Submit the frozen ontology overview: entities (kind, party, mdmSubtype, displayField, storage) and relationships without realization.',
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

export function normalizeNs5OntologyPlan(value: unknown, moduleName: string): Ns5OntologyPlanDraft {
  const root = record(value);
  const entities = list(root.entities).map(item => normalizePlanEntity(item, moduleName)).filter(entity => entity.entityId);
  return {
    moduleName: memberId(text(root.moduleName) || moduleName, moduleName),
    businessDomain: text(root.businessDomain),
    entities,
    relationships: list(root.relationships).map(normalizePlanRelationship).filter(item => item.relationshipId),
  };
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

function normalizePlanEntity(value: unknown, moduleName: string): Ns5OntologyPlanEntity {
  const source = record(value);
  const storage = record(source.storage);
  const kind = text(source.kind) as Ns5OntologyKind;
  const entityId = normalizeEntityId(source.entityId);
  // The model fills mdmSubtype and mutability on every entity. mdmSubtype is a role on
  // kind mdm; appendOnly contradicts mdm. Drop them here — same class as journeys20 handoffTo.
  const mdmSubtype = kind === 'mdm' ? text(source.mdmSubtype) : '';
  const mutability = kind !== 'mdm' && text(source.mutability) === 'appendOnly' ? 'appendOnly' as const : undefined;
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
  return {
    transitionId: memberId(text(source.transitionId), ''),
    from: uniqueMemberIds(source.from),
    to: memberId(text(source.to), ''),
    by: normalizeBy(source.by),
    description: text(source.description),
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
