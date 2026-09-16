/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/access60/gate.ts" enhancement="_blank"/>

import type {
  Ns5AccessGrant,
  Ns5ModuleActor,
} from '/_102035_/l2/solution/types.js';
import {
  anchorPath,
  disclosureListIsProprio,
  grantResolvableFieldRefs,
  isAccessFieldRef,
  isLimitedDisclosureMode,
  isPersonScopeMode,
  ns5AccessFieldRefExists,
  ns5AccessIdentityRef,
  ns5AccessResolvableFieldRefs,
  splitAccessFieldRef,
  NS5_ACCESS_DISCLOSURE_MODES,
  NS5_ACCESS_SCOPE_MODES,
  type Ns5AccessEntityView,
  type Ns5AccessRelationshipView,
} from '/_102035_/l2/agentNewSolution5/steps/access60/contracts.js';
import { ns5ResolveEntityWriter } from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;

export interface Ns5AccessGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5AccessGateResult {
  ok: boolean;
  issues: Ns5AccessGateIssue[];
}

export interface Ns5AccessGateContext {
  moduleName?: string;
  actors: readonly Ns5ModuleActor[];
  entities: readonly Ns5AccessEntityView[];
  relationships: readonly Ns5AccessRelationshipView[];
  journeys: ReadonlyArray<{
    journeyId: string;
    business: {
      actorRef: string;
      steps?: ReadonlyArray<{
        stepId?: string;
        kind: string;
        entity: string;
        affects?: readonly string[];
        effect?: string;
      }>;
    };
  }>;
}

export function validateNs5Access(
  grants: Ns5AccessGrant[],
  context: Ns5AccessGateContext,
): Ns5AccessGateResult {
  const issues: Ns5AccessGateIssue[] = [];
  const entityById = new Map(context.entities.map(entity => [entity.entityId, entity]));
  const actors = context.actors || [];
  const actorById = new Map(actors.map(actor => [actor.actorId, actor]));
  const actorIds = new Set(actors.map(actor => actor.actorId).filter(Boolean));
  const grantedActors = new Set<string>();

  if (!actors.length) {
    error(issues, 'NS5_ACCESS_ACTORS', 'At least one actor is required.', 'actors');
  }
  const seenActorIds = new Set<string>();
  actors.forEach((actor, index) => {
    const path = `actors[${index}]`;
    if (!MEMBER_ID.test(actor.actorId)) {
      error(issues, 'NS5_ACCESS_ACTOR_ID', 'actorId must be lowerCamel.', `${path}.actorId`);
    }
    if (actor.actorId && seenActorIds.has(actor.actorId)) {
      error(issues, 'NS5_ACCESS_ACTOR_DUPLICATE', `Duplicate actorId ${actor.actorId}.`, `${path}.actorId`);
    }
    if (actor.actorId) seenActorIds.add(actor.actorId);
  });

  grants.forEach((grant, index) => {
    const base = `grants[${index}]`;
    if (!MEMBER_ID.test(grant.grantId)) {
      error(issues, 'NS5_ACCESS_GRANT_ID', 'grantId must be lowerCamel.', `${base}.grantId`);
    }
    if (!grant.title.trim()) {
      error(issues, 'NS5_ACCESS_GRANT_TITLE', 'Grant title is required.', `${base}.title`);
    }
    if (!grant.description.trim()) {
      error(issues, 'NS5_ACCESS_GRANT_DESCRIPTION', 'Grant description is required.', `${base}.description`);
    }
    if (!actorIds.has(grant.actorRef)) {
      error(issues, 'NS5_ACCESS_GRANT_ACTOR', `Unknown actor ${grant.actorRef}.`, `${base}.actorRef`);
    }
    grantedActors.add(grant.actorRef);

    if (!grant.entityRefs.length) {
      error(issues, 'NS5_ACCESS_GRANT_NO_ENTITY', 'Every grant lists at least one entity.', `${base}.entityRefs`);
    }
    grant.entityRefs.forEach((entityId, position) => {
      const path = `${base}.entityRefs[${position}]`;
      if (!ENTITY_ID.test(entityId)) {
        error(issues, 'NS5_ACCESS_GRANT_ENTITY', 'entityRefs must be UpperCamel entity ids.', path);
      } else if (!entityById.has(entityId)) {
        error(issues, 'NS5_ACCESS_GRANT_ENTITY_UNKNOWN', `Unknown entity ${entityId}.`, path);
      }
    });

    if (!(NS5_ACCESS_SCOPE_MODES as readonly string[]).includes(grant.dataScope.mode)) {
      error(issues, 'NS5_ACCESS_SCOPE_MODE', 'Unknown dataScope.mode.', `${base}.dataScope.mode`);
    }
    if (!grant.dataScope.description.trim()) {
      error(issues, 'NS5_ACCESS_SCOPE_DESCRIPTION', 'Data scope must be explained.', `${base}.dataScope.description`);
    }

    const actor = actorById.get(grant.actorRef);
    if (actor?.kind === 'external' && grant.dataScope.mode !== 'own') {
      error(issues, 'NS5_ACCESS_EXTERNAL_OWN', 'An external actor only receives own grants.', `${base}.dataScope.mode`);
    }

    if (isPersonScopeMode(grant.dataScope.mode)) {
      const anchor = grant.dataScope.anchorEntity || '';
      if (!anchor) {
        error(issues, 'NS5_ACCESS_ANCHOR_REQUIRED', `${grant.dataScope.mode} scope names the person anchorEntity.`, `${base}.dataScope.anchorEntity`);
      } else {
        const anchorEntity = entityById.get(anchor);
        if (!anchorEntity) {
          error(issues, 'NS5_ACCESS_ANCHOR_UNKNOWN', `Unknown anchorEntity ${anchor}.`, `${base}.dataScope.anchorEntity`);
        } else if (anchorEntity.party !== 'person') {
          error(issues, 'NS5_ACCESS_ANCHOR_NOT_PERSON', `anchorEntity ${anchor} is not party: person.`, `${base}.dataScope.anchorEntity`);
        } else {
          grant.entityRefs.forEach((entityId, position) => {
            if (!entityById.has(entityId)) return;
            if (anchorPath(entityId, anchor, context.relationships) === null) {
              error(
                issues,
                'NS5_ACCESS_ANCHOR_UNREACHABLE',
                `${entityId} cannot reach ${anchor} by required relationships.`,
                `${base}.entityRefs[${position}]`,
              );
            }
          });
        }
      }
    }

    if (grant.dataScope.mode === 'custom') {
      const personIds = context.entities
        .filter(entity => entity.party === 'person' && entity.entityId)
        .map(entity => entity.entityId);
      if (!personIds.length) {
        warning(
          issues,
          'NS5_ACCESS_CUSTOM_WITHOUT_PERSON',
          `custom grant ${grant.grantId} has no party: person entity in the module; access60 cannot create one.`,
          `${base}.dataScope.mode`,
        );
      } else {
        const reachable = reachablePersonIds(grant.entityRefs, personIds, context.relationships);
        if (reachable.length && descriptionCitesActor(grant, actor)) {
          error(
            issues,
            'NS5_ACCESS_CUSTOM_HAS_ANCHOR',
            `custom grant ${grant.grantId} has a reachable person; use own/assigned/related with anchorEntity ${reachable[0]}.`,
            `${base}.dataScope.mode`,
          );
        }
      }
    }

    if (!(NS5_ACCESS_DISCLOSURE_MODES as readonly string[]).includes(grant.disclosure.mode)) {
      error(issues, 'NS5_ACCESS_DISCLOSURE_MODE', 'Unknown disclosure.mode.', `${base}.disclosure.mode`);
    }
    if (!grant.disclosure.description.trim()) {
      error(issues, 'NS5_ACCESS_DISCLOSURE_DESCRIPTION', 'Disclosure boundary must be explained.', `${base}.disclosure.description`);
    }
    const allowed = grant.disclosure.allowedFields || [];
    const denied = grant.disclosure.deniedFields || [];
    if (isLimitedDisclosureMode(grant.disclosure.mode)) {
      const total = grantResolvableFieldRefs(grant, entityById);
      const proprio = disclosureListIsProprio(allowed, total) || disclosureListIsProprio(denied, total);
      if (!proprio) {
        error(
          issues,
          'NS5_ACCESS_DISCLOSURE_FIELDS',
          `${grant.disclosure.mode} names allowedFields or deniedFields as a proper subset of the grant entities' resolvable fields.`,
          `${base}.disclosure`,
        );
      }
      checkDisclosureIdsOnly(issues, grant, allowed, entityById, base);
    }
    checkFieldList(issues, allowed, entityById, `${base}.disclosure.allowedFields`);
    checkFieldList(issues, denied, entityById, `${base}.disclosure.deniedFields`);
  });

  const seenGrantIds = new Set<string>();
  grants.forEach((grant, index) => {
    if (!grant.grantId) return;
    if (seenGrantIds.has(grant.grantId)) {
      error(issues, 'NS5_ACCESS_GRANT_ID_DUPLICATE', `Duplicate grantId ${grant.grantId}.`, `grants[${index}].grantId`);
    }
    seenGrantIds.add(grant.grantId);
  });

  actorIds.forEach(actorId => {
    if (!grantedActors.has(actorId)) {
      error(issues, 'NS5_ACCESS_ACTOR_NO_GRANT', `Actor ${actorId} has no grant.`, 'grants');
    }
  });

  context.journeys.forEach((journey, index) => {
    const actorRef = journey.business.actorRef;
    if (!actorRef) return;
    if (grantedActors.has(actorRef)) return;
    error(
      issues,
      'NS5_ACCESS_JOURNEY_ACTOR',
      `Journey ${journey.journeyId} actor ${actorRef} has no grant.`,
      `journeys[${index}].business.actorRef`,
    );
  });

  const writerPlan = {
    entities: context.entities.map(entity => ({
      entityId: entity.entityId,
      kind: entity.kind || '',
      writer: entity.writer,
    })),
    relationships: context.relationships.map(item => ({
      relationshipId: item.relationshipId,
      fromEntity: item.fromEntity,
      toEntity: item.toEntity,
      type: item.type || '',
      required: item.required,
    })),
  };
  const writerJourneys = context.journeys.map(journey => ({
    journeyId: journey.journeyId,
    business: {
      actorRef: journey.business.actorRef,
      steps: journey.business.steps || [],
    },
  }));
  context.entities.forEach((entity, index) => {
    if (!entity.entityId) return;
    if (ns5ResolveEntityWriter(entity, writerPlan, writerJourneys).kind !== 'crud') return;
    const covered = grants.some(grant => {
      if (!grant.entityRefs.includes(entity.entityId)) return false;
      return actorById.get(grant.actorRef)?.kind === 'internal';
    });
    if (covered) return;
    error(
      issues,
      'NS5_ACCESS_CRUD_WITHOUT_INTERNAL_GRANT',
      `CRUD entity ${entity.entityId} has no grant from an internal actor.`,
      `entities[${index}].entityId`,
    );
  });

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatNs5AccessGate(issues: Ns5AccessGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

function checkFieldList(
  issues: Ns5AccessGateIssue[],
  refs: readonly string[],
  entityById: Map<string, Ns5AccessEntityView>,
  base: string,
): void {
  refs.forEach((ref, position) => {
    const path = `${base}[${position}]`;
    if (!isAccessFieldRef(ref)) {
      error(issues, 'NS5_ACCESS_FIELD_FORMAT', 'Fields must be Entity, Entity.field or a path of the record.', path);
      return;
    }
    const parsed = splitAccessFieldRef(ref);
    const entity = parsed ? entityById.get(parsed.entityId) : undefined;
    if (entity && parsed && ns5AccessFieldRefExists(ref, entity)) return;
    // ns5_40 T2: an entity whose data is the MDM record answers with paths, so say so — the repair is
    // "use a path of the tree", not "this field id does not exist".
    if (entity?.paths) {
      error(
        issues,
        'NS5_ACCESS_DISCLOSURE_PATH_UNKNOWN',
        `${ref} is no path of the ${entity.entityId} record.`,
        path,
      );
      return;
    }
    error(issues, 'NS5_ACCESS_FIELD_UNKNOWN', `Unknown field ref ${ref}.`, path);
  });
}

/**
 * ns5_40 T2, the measured symptom. A `fieldsOnly` grant that names an entity ONLY by its identity while
 * that entity resolves more than its identity has disclosed nothing usable: read literally, the actor
 * sees a uuid and no name. That is what the six ab_01 plans detected and ignored.
 *
 * The guard is "resolves more than its identity" on purpose, and not "is an MDM role": on a v2 module a
 * namespace-only mdm entity resolves nothing BUT its identity, so listing the id was the only thing the
 * model could say and there is nothing to warn about. Measured over the thirteen access fixtures:
 * without that guard 8 grant/entity pairs in 5 v2 modules trip; with it, 0.
 */
function checkDisclosureIdsOnly(
  issues: Ns5AccessGateIssue[],
  grant: Ns5AccessGrant,
  allowed: readonly string[],
  entityById: Map<string, Ns5AccessEntityView>,
  base: string,
): void {
  if (!allowed.length) return;
  grant.entityRefs.forEach((entityId, position) => {
    const entity = entityById.get(entityId);
    if (!entity) return;
    const identity = ns5AccessIdentityRef(entity);
    if (!identity) return;
    const named = allowed.filter(ref => ref === entityId || ref.startsWith(`${entityId}.`));
    if (!named.length || !named.every(ref => ref === identity)) return;
    if (!ns5AccessResolvableFieldRefs(entity).some(ref => ref !== identity)) return;
    warning(
      issues,
      'NS5_ACCESS_DISCLOSURE_IDS_ONLY',
      `${grant.grantId} discloses ${entityId} only as ${identity}; name the paths the actor reads (${entityId}.<path>) or use fullRecord.`,
      `${base}.entityRefs[${position}]`,
    );
  });
}

function error(issues: Ns5AccessGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}

function warning(issues: Ns5AccessGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'warning', code, message, ...(path ? { path } : {}) });
}

function descriptionCitesActor(
  grant: Ns5AccessGrant,
  actor: Ns5ModuleActor | undefined,
): boolean {
  if (!actor) return false;
  const hay = `${grant.description}\n${grant.dataScope.description}`.toLowerCase();
  if (actor.actorId && hay.includes(actor.actorId.toLowerCase())) return true;
  const title = (actor.title || '').trim();
  return Boolean(title) && hay.includes(title.toLowerCase());
}

function reachablePersonIds(
  entityRefs: readonly string[],
  personIds: readonly string[],
  relationships: Ns5AccessGateContext['relationships'],
): string[] {
  const hits: Array<{ id: string; hops: number }> = [];
  for (const personId of personIds) {
    let best = Infinity;
    for (const entityId of entityRefs) {
      if (!entityId) continue;
      const path = anchorPath(entityId, personId, relationships);
      if (path === null) continue;
      best = Math.min(best, path.length);
    }
    if (best !== Infinity) hits.push({ id: personId, hops: best });
  }
  hits.sort((left, right) => left.hops - right.hops);
  return hits.map(item => item.id);
}
