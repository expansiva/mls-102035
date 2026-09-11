/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/access60/gate.ts" enhancement="_blank"/>

import type {
  Ns5AccessAuthority,
  Ns5AccessGrant,
  Ns5AccessProfile,
} from '/_102035_/l2/solution/types.js';
import {
  anchorPath,
  disclosureListIsProprio,
  grantResolvableFieldRefs,
  isAccessFieldRef,
  isLimitedDisclosureMode,
  isPersonScopeMode,
  ns5AccessFieldRefExists,
  splitAccessFieldRef,
  NS5_ACCESS_DISCLOSURE_MODES,
  NS5_ACCESS_PROFILE_KINDS,
  NS5_ACCESS_SCOPE_MODES,
  type Ns5AccessEntityView,
  type Ns5AccessRelationshipView,
} from '/_102035_/l2/agentNewSolution5/steps/access60/contracts.js';

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
  actorIds: readonly string[];
  entities: readonly Ns5AccessEntityView[];
  relationships: readonly Ns5AccessRelationshipView[];
  journeys: ReadonlyArray<{ journeyId: string; business: { actorRef: string } }>;
}

export function validateNs5Access(
  profiles: Ns5AccessProfile[],
  authorities: Ns5AccessAuthority[],
  grants: Ns5AccessGrant[],
  context: Ns5AccessGateContext,
): Ns5AccessGateResult {
  const issues: Ns5AccessGateIssue[] = [];
  const entityById = new Map(context.entities.map(entity => [entity.entityId, entity]));
  const actorIds = new Set(context.actorIds.filter(Boolean));
  const profileIds = new Set<string>();
  const authorityIds = new Set<string>();
  const grantedProfiles = new Set<string>();
  const grantPairs = new Set<string>();
  const coveredActors = new Set<string>();

  profiles.forEach((profile, index) => {
    const base = `profiles[${index}]`;
    if (!MEMBER_ID.test(profile.profileId)) {
      error(issues, 'NS5_ACCESS_PROFILE_ID', 'profileId must be lowerCamel.', `${base}.profileId`);
    }
    if (profile.profileId && profileIds.has(profile.profileId)) {
      error(issues, 'NS5_ACCESS_PROFILE_ID_DUPLICATE', `Duplicate profileId ${profile.profileId}.`, `${base}.profileId`);
    }
    if (profile.profileId) profileIds.add(profile.profileId);
    if (!(NS5_ACCESS_PROFILE_KINDS as readonly string[]).includes(profile.kind)) {
      error(issues, 'NS5_ACCESS_PROFILE_KIND', 'Profile kind must be internal, external or anonymous.', `${base}.kind`);
    }
    if (profile.kind === 'internal' && !profile.actorRefs.length) {
      error(issues, 'NS5_ACCESS_INTERNAL_ACTOR', 'An internal profile must map to at least one actor.', `${base}.actorRefs`);
    }
    profile.actorRefs.forEach((actorRef, position) => {
      const path = `${base}.actorRefs[${position}]`;
      if (!MEMBER_ID.test(actorRef)) {
        error(issues, 'NS5_ACCESS_PROFILE_ACTOR', 'actorRefs must be lowerCamel actor ids.', path);
      } else if (!actorIds.has(actorRef)) {
        error(issues, 'NS5_ACCESS_PROFILE_ACTOR_UNKNOWN', `Unknown actor ${actorRef}.`, path);
      }
      coveredActors.add(actorRef);
    });
  });

  authorities.forEach((authority, index) => {
    const base = `authorities[${index}]`;
    if (!MEMBER_ID.test(authority.authorityId)) {
      error(issues, 'NS5_ACCESS_AUTHORITY_ID', 'authorityId must be lowerCamel.', `${base}.authorityId`);
    }
    if (authority.authorityId && authorityIds.has(authority.authorityId)) {
      error(issues, 'NS5_ACCESS_AUTHORITY_ID_DUPLICATE', `Duplicate authorityId ${authority.authorityId}.`, `${base}.authorityId`);
    }
    if (authority.authorityId) authorityIds.add(authority.authorityId);
    if (!authority.title.trim()) error(issues, 'NS5_ACCESS_AUTHORITY_TITLE', 'Authority title is required.', `${base}.title`);
    if (!authority.description.trim()) {
      error(issues, 'NS5_ACCESS_AUTHORITY_DESCRIPTION', 'Authority description is required.', `${base}.description`);
    }
  });

  grants.forEach((grant, index) => {
    const base = `grants[${index}]`;
    if (!MEMBER_ID.test(grant.grantId)) {
      error(issues, 'NS5_ACCESS_GRANT_ID', 'grantId must be lowerCamel.', `${base}.grantId`);
    }
    if (!profileIds.has(grant.profileRef)) {
      error(issues, 'NS5_ACCESS_GRANT_PROFILE', `Unknown profile ${grant.profileRef}.`, `${base}.profileRef`);
    }
    if (!authorityIds.has(grant.authorityRef)) {
      error(issues, 'NS5_ACCESS_GRANT_AUTHORITY', `Unknown authority ${grant.authorityRef}.`, `${base}.authorityRef`);
    }
    const pair = `${grant.profileRef}\u0000${grant.authorityRef}`;
    if (grant.profileRef && grant.authorityRef && grantPairs.has(pair)) {
      error(issues, 'NS5_ACCESS_GRANT_DUPLICATE_PAIR', `Duplicate grant for ${grant.profileRef} and ${grant.authorityRef}.`, base);
    }
    if (grant.profileRef && grant.authorityRef) grantPairs.add(pair);
    grantedProfiles.add(grant.profileRef);

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

    const profile = profiles.find(item => item.profileId === grant.profileRef);
    if (profile?.kind === 'external' && grant.dataScope.mode !== 'own') {
      error(issues, 'NS5_ACCESS_EXTERNAL_OWN', 'An external profile only receives own grants.', `${base}.dataScope.mode`);
    }
    if (grant.dataScope.mode === 'public' && profile?.kind !== 'anonymous') {
      error(issues, 'NS5_ACCESS_PUBLIC_ANONYMOUS', 'public scope is only for an anonymous profile.', `${base}.dataScope.mode`);
    }
    if (profile?.kind === 'anonymous' && grant.dataScope.mode !== 'public') {
      error(issues, 'NS5_ACCESS_PUBLIC_ANONYMOUS', 'An anonymous profile only receives public grants.', `${base}.dataScope.mode`);
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

  profileIds.forEach(profileId => {
    if (!grantedProfiles.has(profileId)) {
      error(issues, 'NS5_ACCESS_PROFILE_NO_GRANT', `Profile ${profileId} has no grant.`, 'grants');
    }
  });

  context.journeys.forEach((journey, index) => {
    const actorRef = journey.business.actorRef;
    if (!actorRef) return;
    if (coveredActors.has(actorRef)) return;
    error(
      issues,
      'NS5_ACCESS_JOURNEY_ACTOR',
      `Journey ${journey.journeyId} actor ${actorRef} is not covered by any profile.`,
      `journeys[${index}].business.actorRef`,
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
      error(issues, 'NS5_ACCESS_FIELD_FORMAT', 'Fields must be Entity.field or Entity.details.name.', path);
      return;
    }
    const parsed = splitAccessFieldRef(ref);
    const entity = parsed ? entityById.get(parsed.entityId) : undefined;
    if (!entity || !parsed || !ns5AccessFieldRefExists(ref, entity)) {
      error(issues, 'NS5_ACCESS_FIELD_UNKNOWN', `Unknown field ref ${ref}.`, path);
    }
  });
}

function error(issues: Ns5AccessGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}
