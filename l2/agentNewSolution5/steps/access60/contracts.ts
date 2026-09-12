/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/access60/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import { resolvableFieldIds } from '/_102035_/l2/solution/lib.js';
import {
  NS5_ACCESS_SCHEMA_VERSION,
  type Ns5AccessArtifact,
  type Ns5AccessDataScope,
  type Ns5AccessGrant,
  type Ns5ModuleActor,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const FIELD_REF = /^[A-Z][A-Za-z0-9]*\.(?:details\.)?[a-z][A-Za-z0-9]*$/;

export const NS5_ACCESS_MAX_ANCHOR_HOPS = 6 as const;

export const NS5_ACCESS_SCOPE_MODES = ['own', 'assigned', 'related', 'public', 'organization', 'custom'] as const;
export const NS5_ACCESS_DISCLOSURE_MODES = ['fullRecord', 'fieldsOnly', 'summaryOnly', 'aggregateOnly'] as const;
export const NS5_ACCESS_PERSON_SCOPE_MODES = ['own', 'assigned', 'related'] as const;
export const NS5_ACCESS_LIMITED_DISCLOSURE_MODES = ['fieldsOnly', 'summaryOnly'] as const;

export type Ns5AccessScopeMode = typeof NS5_ACCESS_SCOPE_MODES[number];
export type Ns5AccessDisclosureMode = typeof NS5_ACCESS_DISCLOSURE_MODES[number];

export interface Ns5AccessNormalization {
  grants: Ns5AccessGrant[];
}

export type Ns5AccessFormNormalizationKind = 'disclosureFullRecord' | 'dropAnchorEntity';

/** Deterministic form change recorded on the access60 draft, not on the artifact. */
export interface Ns5AccessFormNormalization {
  kind: Ns5AccessFormNormalizationKind;
  grantId: string;
  detail: string;
}

export interface Ns5AccessEntityView {
  entityId: string;
  party: 'person' | 'organization' | 'none' | string;
  fields: ReadonlyArray<{ fieldId: string }>;
  details?: Record<string, unknown>;
  storage?: { idField: string };
  maintenance?: 'crud';
}

export interface Ns5AccessRelationshipView {
  relationshipId: string;
  fromEntity: string;
  toEntity: string;
  required: boolean;
}

export interface Ns5AccessAnchorHop {
  fromEntity: string;
  toEntity: string;
  relationshipId: string;
}

export interface Ns5AccessRefCatalog {
  actorIds: string[];
  entityIds: string[];
  fieldRefs: string[];
  personEntityIds: string[];
  journeyActorIds: string[];
}

export function buildNs5AccessTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Access',
    'Submit grants by actorRef with title and description. Do not emit actors, profiles, authorities, hops, landing or realization. Disclosure names Entity.field; own/assigned/related name the person anchorEntity.',
    schema,
  );
}

export function normalizeNs5AccessPayload(value: unknown): Ns5AccessNormalization {
  const root = record(value);
  return {
    grants: list(root.grants).map(normalizeGrant).filter(grant => grant.grantId || grant.actorRef),
  };
}

/**
 * Post-LLM form cleanup: fieldsOnly with no real restriction becomes fullRecord;
 * anchorEntity is dropped unless the scope is own/assigned/related.
 */
export function applyNs5AccessFormNormalizations(
  grants: Ns5AccessGrant[],
  entities: readonly Ns5AccessEntityView[],
): { grants: Ns5AccessGrant[]; normalizations: Ns5AccessFormNormalization[] } {
  const entityById = new Map(entities.map(entity => [entity.entityId, entity]));
  const normalizations: Ns5AccessFormNormalization[] = [];
  const next = grants.map(grant => {
    let current: Ns5AccessGrant = {
      ...grant,
      dataScope: { ...grant.dataScope },
      disclosure: {
        ...grant.disclosure,
        ...(grant.disclosure.allowedFields ? { allowedFields: [...grant.disclosure.allowedFields] } : {}),
        ...(grant.disclosure.deniedFields ? { deniedFields: [...grant.disclosure.deniedFields] } : {}),
      },
    };
    const allowed = current.disclosure.allowedFields || [];
    const denied = current.disclosure.deniedFields || [];
    const total = grantResolvableFieldRefs(current, entityById);
    if (
      current.disclosure.mode === 'fieldsOnly'
      && coversAllResolvable(allowed, total)
      && denied.length === 0
    ) {
      current = {
        ...current,
        disclosure: { mode: 'fullRecord', description: current.disclosure.description },
      };
      normalizations.push({
        kind: 'disclosureFullRecord',
        grantId: current.grantId,
        detail: 'fieldsOnly allowedFields covered every resolvable field; mode is fullRecord.',
      });
    }
    if (current.dataScope.anchorEntity && !isPersonScopeMode(current.dataScope.mode)) {
      current = {
        ...current,
        dataScope: { mode: current.dataScope.mode, description: current.dataScope.description },
      };
      normalizations.push({
        kind: 'dropAnchorEntity',
        grantId: current.grantId,
        detail: `anchorEntity removed; ${current.dataScope.mode} is not own/assigned/related.`,
      });
    }
    return current;
  });
  return { grants: next, normalizations };
}

export function grantResolvableFieldRefs(
  grant: Pick<Ns5AccessGrant, 'entityRefs'>,
  entityById: Map<string, Ns5AccessEntityView>,
): string[] {
  const refs: string[] = [];
  const seen = new Set<string>();
  for (const entityId of grant.entityRefs) {
    const entity = entityById.get(entityId);
    if (!entity) continue;
    for (const ref of ns5AccessResolvableFieldRefs(entity)) {
      if (seen.has(ref)) continue;
      seen.add(ref);
      refs.push(ref);
    }
  }
  return refs;
}

export function disclosureListIsProprio(list: readonly string[], total: readonly string[]): boolean {
  return list.length > 0 && !coversAllResolvable(list, total);
}

function coversAllResolvable(list: readonly string[], total: readonly string[]): boolean {
  if (!total.length) return list.length === 0;
  const have = new Set(list);
  return total.every(ref => have.has(ref));
}

export function buildNs5AccessArtifact(
  moduleName: string,
  actors: Ns5ModuleActor[],
  grants: Ns5AccessGrant[],
): Ns5AccessArtifact {
  return {
    schemaVersion: NS5_ACCESS_SCHEMA_VERSION,
    moduleName,
    actors,
    grants,
  };
}

export function collectNs5AccessRefCatalog(
  actors: ReadonlyArray<{ actorId: string }>,
  entities: readonly Ns5AccessEntityView[],
  journeys: ReadonlyArray<{ business: { actorRef: string } }>,
): Ns5AccessRefCatalog {
  const entityIds: string[] = [];
  const fieldRefs: string[] = [];
  const personEntityIds: string[] = [];
  for (const entity of entities) {
    if (!entity.entityId) continue;
    entityIds.push(entity.entityId);
    if (entity.party === 'person') personEntityIds.push(entity.entityId);
    for (const ref of ns5AccessResolvableFieldRefs(entity)) fieldRefs.push(ref);
  }
  const journeyActorIds: string[] = [];
  const seenActors = new Set<string>();
  for (const journey of journeys) {
    const actorRef = journey.business.actorRef;
    if (!actorRef || seenActors.has(actorRef)) continue;
    seenActors.add(actorRef);
    journeyActorIds.push(actorRef);
  }
  return {
    actorIds: actors.map(actor => actor.actorId).filter(Boolean),
    entityIds,
    fieldRefs,
    personEntityIds,
    journeyActorIds,
  };
}

/**
 * Shortest path of required relationships from `fromEntity` to `anchorEntity`.
 * Empty array when they are the same entity. Null when unreachable.
 * The path is derived for the gate and the backend; it is never stored on the grant.
 */
export function anchorPath(
  fromEntity: string,
  anchorEntity: string,
  relationships: readonly Ns5AccessRelationshipView[],
  maxHops = NS5_ACCESS_MAX_ANCHOR_HOPS,
): Ns5AccessAnchorHop[] | null {
  if (!fromEntity || !anchorEntity) return null;
  if (fromEntity === anchorEntity) return [];
  const edges = requiredEdges(relationships);
  const queue: Array<{ entity: string; hops: Ns5AccessAnchorHop[] }> = [
    { entity: fromEntity, hops: [] },
  ];
  const visited = new Set<string>([fromEntity]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current.hops.length >= maxHops) continue;
    const outgoing = edges.get(current.entity);
    if (!outgoing) continue;
    for (const hop of outgoing) {
      if (visited.has(hop.toEntity)) continue;
      const hops = [...current.hops, hop];
      if (hop.toEntity === anchorEntity) return hops;
      visited.add(hop.toEntity);
      queue.push({ entity: hop.toEntity, hops });
    }
  }
  return null;
}

export function ns5AccessFieldRefExists(ref: string, entity: Ns5AccessEntityView): boolean {
  const parsed = splitAccessFieldRef(ref);
  if (!parsed || parsed.entityId !== entity.entityId) return false;
  if (parsed.detailsName) return Boolean(entity.details && parsed.detailsName in entity.details);
  if (resolvableFieldIds(entity).has(parsed.fieldId)) return true;
  return Boolean(entity.details && parsed.fieldId in entity.details);
}

export function ns5AccessResolvableFieldRefs(entity: Ns5AccessEntityView): string[] {
  const refs: string[] = [];
  const seen = new Set<string>();
  const add = (ref: string) => {
    if (!ref || seen.has(ref)) return;
    seen.add(ref);
    refs.push(ref);
  };
  for (const fieldId of resolvableFieldIds(entity)) add(`${entity.entityId}.${fieldId}`);
  if (entity.details) {
    for (const name of Object.keys(entity.details)) {
      if (!name) continue;
      add(`${entity.entityId}.details.${name}`);
    }
  }
  return refs;
}

export function splitAccessFieldRef(ref: string): { entityId: string; fieldId: string; detailsName: string } | null {
  const details = /^([A-Z][A-Za-z0-9]*)\.details\.([a-z][A-Za-z0-9]*)$/.exec(ref);
  if (details) return { entityId: details[1], fieldId: details[2], detailsName: details[2] };
  const field = /^([A-Z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)$/.exec(ref);
  if (field) return { entityId: field[1], fieldId: field[2], detailsName: '' };
  return null;
}

export function isAccessFieldRef(ref: string): boolean {
  return FIELD_REF.test(ref);
}

export function isPersonScopeMode(mode: string): boolean {
  return (NS5_ACCESS_PERSON_SCOPE_MODES as readonly string[]).includes(mode);
}

export function isLimitedDisclosureMode(mode: string): boolean {
  return (NS5_ACCESS_LIMITED_DISCLOSURE_MODES as readonly string[]).includes(mode);
}

function requiredEdges(relationships: readonly Ns5AccessRelationshipView[]): Map<string, Ns5AccessAnchorHop[]> {
  const edges = new Map<string, Ns5AccessAnchorHop[]>();
  const add = (fromEntity: string, toEntity: string, relationshipId: string) => {
    if (!fromEntity || !toEntity || fromEntity === toEntity) return;
    const hop: Ns5AccessAnchorHop = { fromEntity, toEntity, relationshipId };
    const listFor = edges.get(fromEntity) || [];
    if (listFor.some(item => item.toEntity === toEntity && item.relationshipId === relationshipId)) return;
    listFor.push(hop);
    edges.set(fromEntity, listFor);
  };
  for (const relationship of relationships) {
    if (!relationship.required) continue;
    add(relationship.fromEntity, relationship.toEntity, relationship.relationshipId);
    add(relationship.toEntity, relationship.fromEntity, relationship.relationshipId);
  }
  return edges;
}

function normalizeGrant(value: unknown): Ns5AccessGrant {
  const source = record(value);
  const scope = record(source.dataScope);
  const disclosure = record(source.disclosure);
  const dataScope: Ns5AccessDataScope = {
    mode: text(scope.mode) as Ns5AccessScopeMode,
    description: text(scope.description),
  };
  const anchorEntity = entityId(text(scope.anchorEntity));
  if (anchorEntity) dataScope.anchorEntity = anchorEntity;
  const next: Ns5AccessGrant = {
    grantId: memberId(text(source.grantId) || text(source.id), ''),
    actorRef: memberId(text(source.actorRef) || text(source.profileRef), ''),
    title: text(source.title),
    description: text(source.description),
    entityRefs: unique(strings(source.entityRefs).map(entityId).filter(Boolean)),
    dataScope,
    disclosure: {
      mode: text(disclosure.mode) as Ns5AccessDisclosureMode,
      description: text(disclosure.description),
    },
  };
  const allowed = unique(strings(disclosure.allowedFields));
  const denied = unique(strings(disclosure.deniedFields));
  if (allowed.length) next.disclosure.allowedFields = allowed;
  if (denied.length) next.disclosure.deniedFields = denied;
  return next;
}

function memberId(value: string, fallback: string): string {
  const id = normalizeModuleName(value || fallback, fallback);
  return MEMBER_ID.test(id) ? id : fallback;
}

function entityId(value: string): string {
  return ENTITY_ID.test(value) ? value : '';
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
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

function strings(value: unknown): string[] {
  return list(value).map(text).filter(Boolean);
}
