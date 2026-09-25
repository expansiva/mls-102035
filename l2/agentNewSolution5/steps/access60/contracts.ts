/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/access60/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import { resolvableFieldIds } from '/_102035_/l2/solution/lib.js';
import {
  NS5_ACCESS_SCHEMA_VERSION,
  type Ns5AccessActor,
  type Ns5AccessArtifact,
  type Ns5AccessDataScope,
  type Ns5AccessGrant,
  type Ns5ModuleActor,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
/**
 * A disclosure reference: the entity root (`Consulta`) or any path under it — one segment on a v2 module
 * (`Consulta.status`, `Comanda.details.total`), any depth on a v3 record (`Paciente.details.person.birthDate`).
 * ns5_40 T2 widened this; v2 refs match exactly as before.
 */
const FIELD_REF = /^[A-Z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*$/;

export const NS5_ACCESS_MAX_ANCHOR_HOPS = 6 as const;

export const NS5_ACCESS_SCOPE_MODES = ['own', 'assigned', 'related', 'public', 'organization', 'custom'] as const;
export const NS5_ACCESS_DISCLOSURE_MODES = ['fullRecord', 'fieldsOnly', 'summaryOnly', 'aggregateOnly'] as const;
export const NS5_ACCESS_PERSON_SCOPE_MODES = ['own', 'assigned', 'related'] as const;
export const NS5_ACCESS_LIMITED_DISCLOSURE_MODES = ['fieldsOnly', 'summaryOnly'] as const;

export type Ns5AccessScopeMode = typeof NS5_ACCESS_SCOPE_MODES[number];
export type Ns5AccessDisclosureMode = typeof NS5_ACCESS_DISCLOSURE_MODES[number];

export interface Ns5AccessActorPerson {
  actorRef: string;
  /** Role entity this actor is, or `''` when the module has no person record for them. */
  personEntity: string;
}

export interface Ns5AccessNormalization {
  grants: Ns5AccessGrant[];
  actorPersons: Ns5AccessActorPerson[];
}

export type Ns5AccessFormNormalizationKind =
  | 'disclosureFullRecord'
  | 'dropAnchorEntity'
  | 'anchorFromActor'
  | 'personEntityMissing';

/** Deterministic form change recorded on the access60 draft and on pipeline.json. */
export interface Ns5AccessFormNormalization {
  kind: Ns5AccessFormNormalizationKind;
  detail: string;
  grantId?: string;
  /** anchorFromActor: the anchor the model wrote. Empty when there was none. */
  from?: string;
  /** anchorFromActor: the actor's personEntity. */
  to?: string;
}

export interface Ns5AccessEntityView {
  entityId: string;
  party: 'person' | 'organization' | 'none' | string;
  kind?: string;
  fields: ReadonlyArray<{ fieldId: string }>;
  details?: Record<string, unknown>;
  storage?: { idField: string };
  writer?: 'journey' | 'crud' | 'inbound';
  /**
   * ns5_40 T2. Every reference this entity resolves, as `resolvableFieldPaths` enumerates it — the
   * entity root and the whole tree of the record. Present only on a v3 entity, whose data is the MDM
   * record and not a flat `fields` list; when it is present it REPLACES `fields`/`details` as the
   * resolvable set. A v2 view never carries it, which is why nothing changes for the eleven v2 modules.
   */
  paths?: readonly string[];
}

export interface Ns5AccessRelationshipView {
  relationshipId: string;
  fromEntity: string;
  toEntity: string;
  required: boolean;
  type?: string;
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
    'Submit grants by actorRef with title and description, plus actorPersons (one item per given actor; personEntity is the role entity they are, or ""). Do not emit actors, profiles, authorities, hops, landing or realization. Disclosure names Entity.field. own/assigned anchor on that personEntity; related anchors on the other person.',
    schema,
  );
}

export function normalizeNs5AccessPayload(value: unknown): Ns5AccessNormalization {
  const root = record(value);
  return {
    grants: list(root.grants).map(normalizeGrant).filter(grant => grant.grantId || grant.actorRef),
    actorPersons: list(root.actorPersons).map(normalizeActorPerson).filter((item): item is Ns5AccessActorPerson => item !== null),
  };
}

/**
 * Pipeline actors plus the tool's actorPersons. A pipeline actor missing from the map gets
 * `personEntity: ''` and `personEntityMissing`. An actorRef that is not a pipeline actor is dropped.
 */
export function mergeNs5AccessActors(
  actors: readonly Ns5ModuleActor[],
  actorPersons: readonly Ns5AccessActorPerson[],
): { actors: Ns5AccessActor[]; normalizations: Ns5AccessFormNormalization[] } {
  const known = new Set(actors.map(actor => actor.actorId).filter(Boolean));
  const declared = new Map<string, string>();
  for (const item of actorPersons) {
    if (!known.has(item.actorRef)) continue;
    declared.set(item.actorRef, item.personEntity);
  }
  const normalizations: Ns5AccessFormNormalization[] = [];
  const next = actors.map(actor => {
    if (!declared.has(actor.actorId)) {
      normalizations.push({
        kind: 'personEntityMissing',
        detail: `Actor ${actor.actorId} omitted from actorPersons; personEntity is ''.`,
      });
      return { ...actor, personEntity: '' };
    }
    return { ...actor, personEntity: declared.get(actor.actorId) ?? '' };
  });
  return { actors: next, normalizations };
}

/**
 * Post-LLM form cleanup: fieldsOnly with no real restriction becomes fullRecord;
 * anchorEntity is dropped unless the scope is own/assigned/related;
 * own/assigned whose actor has a personEntity anchors on that person.
 */
export function applyNs5AccessFormNormalizations(
  grants: Ns5AccessGrant[],
  entities: readonly Ns5AccessEntityView[],
  actors: readonly Ns5AccessActor[],
): { grants: Ns5AccessGrant[]; normalizations: Ns5AccessFormNormalization[] } {
  const entityById = new Map(entities.map(entity => [entity.entityId, entity]));
  const personByActor = new Map(actors.map(actor => [actor.actorId, actor.personEntity ?? '']));
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
    const person = personByActor.get(current.actorRef) ?? '';
    if ((current.dataScope.mode === 'own' || current.dataScope.mode === 'assigned') && person && current.dataScope.anchorEntity !== person) {
      const from = current.dataScope.anchorEntity || '';
      current = {
        ...current,
        dataScope: { ...current.dataScope, anchorEntity: person },
      };
      normalizations.push({
        kind: 'anchorFromActor',
        grantId: current.grantId,
        from,
        to: person,
        detail: `anchorEntity ${from || '(none)'} replaced by actor personEntity ${person}.`,
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
  actors: readonly Ns5AccessActor[],
  grants: Ns5AccessGrant[],
): Ns5AccessArtifact {
  return {
    schemaVersion: NS5_ACCESS_SCHEMA_VERSION,
    moduleName,
    actors: [...actors],
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
  // v3: the enumerated tree is the whole truth, branches and leaves alike.
  if (entity.paths) return entity.paths.includes(ref);
  if (parsed.detailsName) return Boolean(entity.details && parsed.detailsName in entity.details);
  if (resolvableFieldIds(entity).has(parsed.fieldId)) return true;
  return Boolean(entity.details && parsed.fieldId in entity.details);
}

export function ns5AccessResolvableFieldRefs(entity: Ns5AccessEntityView): string[] {
  if (entity.paths) return [...entity.paths];
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

/** The identity reference of a view: `<Entity>.<idField>`. Empty when the view declares no storage. */
export function ns5AccessIdentityRef(entity: Ns5AccessEntityView): string {
  return entity.storage?.idField ? `${entity.entityId}.${entity.storage.idField}` : '';
}

/**
 * `Entity`, `Entity.field`, `Entity.details.name`, `Entity.details.branch.leaf` — split at the first dot.
 * `fieldId` and `detailsName` keep exactly the v2 meaning: a deeper path leaves `detailsName` empty and
 * puts the whole path in `fieldId`, which no v2 `fields` list can contain, so a v2 view still says no.
 */
export function splitAccessFieldRef(
  ref: string,
): { entityId: string; fieldId: string; detailsName: string; path: string } | null {
  if (!isAccessFieldRef(ref)) return null;
  const dot = ref.indexOf('.');
  const entityId = dot < 0 ? ref : ref.slice(0, dot);
  const path = dot < 0 ? '' : ref.slice(dot + 1);
  const details = /^details\.([a-z][A-Za-z0-9]*)$/.exec(path);
  return {
    entityId,
    path,
    fieldId: details ? details[1] : path,
    detailsName: details ? details[1] : '',
  };
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

function normalizeActorPerson(value: unknown): Ns5AccessActorPerson | null {
  const source = record(value);
  const actorRef = memberId(text(source.actorRef), '');
  if (!actorRef) return null;
  return { actorRef, personEntity: text(source.personEntity) };
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
