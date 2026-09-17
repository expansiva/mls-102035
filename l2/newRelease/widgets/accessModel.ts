/// <mls fileReference="_102035_/l2/newRelease/widgets/accessModel.ts" enhancement="_blank" />

import type {
  Ns5AccessArtifact,
  Ns5AccessGrant,
  Ns5ModuleActor,
  Ns5OntologyEntityArtifact,
  Ns5OntologyIndexArtifact,
} from '../../solution/types.js';
import type { NewReleaseValidationIssue } from '../tobe.js';

const SCOPE_RANK: Record<Ns5AccessGrant['dataScope']['mode'], number> = {
  own: 1,
  assigned: 2,
  related: 3,
  custom: 4,
  organization: 5,
  public: 6,
};

const DISCLOSURE_RANK: Record<Ns5AccessGrant['disclosure']['mode'], number> = {
  aggregateOnly: 1,
  summaryOnly: 2,
  fieldsOnly: 3,
  fullRecord: 4,
};

export interface AccessAnchorPath {
  entityId: string;
  entities: string[];
  relationships: string[];
}

export function accessGrantsForActor(
  access: Pick<Ns5AccessArtifact, 'grants'>,
  actorId: string,
): Ns5AccessGrant[] {
  return access.grants.filter(grant => grant.actorRef === actorId);
}

export function bestAccessGrant(
  grants: readonly Ns5AccessGrant[],
  actorId: string,
  entityId: string,
): Ns5AccessGrant | null {
  return grants
    .filter(grant => grant.actorRef === actorId && grant.entityRefs.includes(entityId))
    .sort((left, right) => {
      const scope = SCOPE_RANK[right.dataScope.mode] - SCOPE_RANK[left.dataScope.mode];
      if (scope) return scope;
      const disclosure = DISCLOSURE_RANK[right.disclosure.mode] - DISCLOSURE_RANK[left.disclosure.mode];
      return disclosure || left.grantId.localeCompare(right.grantId);
    })[0] || null;
}

export function accessJourneyCount(
  journeys: ReadonlyArray<{ business: { actorRef: string } }>,
  actorId: string,
): number {
  return journeys.filter(journey => journey.business.actorRef === actorId).length;
}

function neighbors(index: Ns5OntologyIndexArtifact, entityId: string) {
  return index.relationships
    .filter(relationship => relationship.required
      && (relationship.fromEntity === entityId || relationship.toEntity === entityId))
    .map(relationship => ({
      entityId: relationship.fromEntity === entityId ? relationship.toEntity : relationship.fromEntity,
      relationshipId: relationship.relationshipId,
    }));
}

export function accessAnchorPath(
  fromEntity: string,
  anchorEntity: string,
  index: Ns5OntologyIndexArtifact,
  maxHops = 6,
): AccessAnchorPath | null {
  if (!fromEntity || !anchorEntity) return null;
  if (fromEntity === anchorEntity) return { entityId: fromEntity, entities: [fromEntity], relationships: [] };
  const queue: Array<{ current: string; entities: string[]; relationships: string[] }> = [
    { current: fromEntity, entities: [fromEntity], relationships: [] },
  ];
  const visited = new Set([fromEntity]);
  while (queue.length) {
    const item = queue.shift()!;
    if (item.relationships.length >= maxHops) continue;
    for (const next of neighbors(index, item.current)) {
      if (visited.has(next.entityId)) continue;
      const entities = [...item.entities, next.entityId];
      const relationships = [...item.relationships, next.relationshipId];
      if (next.entityId === anchorEntity) return { entityId: fromEntity, entities, relationships };
      visited.add(next.entityId);
      queue.push({ current: next.entityId, entities, relationships });
    }
  }
  return null;
}

export function reachablePersonAnchors(
  entityRefs: readonly string[],
  entities: readonly Ns5OntologyEntityArtifact[],
  index: Ns5OntologyIndexArtifact | null,
): Ns5OntologyEntityArtifact[] {
  if (!entityRefs.length || !index) return [];
  return entities.filter(entity => entity.party === 'person'
    && entityRefs.every(entityRef => accessAnchorPath(entityRef, entity.entityId, index) !== null));
}

export function accessAnchorPaths(
  grant: Ns5AccessGrant,
  index: Ns5OntologyIndexArtifact | null,
): AccessAnchorPath[] {
  const anchor = grant.dataScope.anchorEntity;
  if (!anchor || !index) return [];
  return grant.entityRefs
    .map(entityId => accessAnchorPath(entityId, anchor, index))
    .filter((path): path is AccessAnchorPath => !!path);
}

export function accessFieldRefs(
  grant: Pick<Ns5AccessGrant, 'entityRefs'>,
  entities: readonly Ns5OntologyEntityArtifact[],
): string[] {
  const result: string[] = [];
  for (const entity of entities) {
    if (!grant.entityRefs.includes(entity.entityId)) continue;
    const own = [...entity.fields, ...(entity.fieldsBase || [])]
      .map(field => `${entity.entityId}.${field.fieldId}`);
    const details = Object.keys(entity.details || {}).map(name => `${entity.entityId}.details.${name}`);
    const id = [...entity.fields, ...(entity.fieldsBase || [])].some(field => field.fieldId === entity.storage.idField)
      ? []
      : [`${entity.entityId}.${entity.storage.idField}`];
    result.push(...id, ...own, ...details);
  }
  return [...new Set(result)];
}

export function accessFieldLabel(
  ref: string,
  entities: readonly Ns5OntologyEntityArtifact[],
): string {
  const [entityId, member, detailName] = ref.split('.');
  const entity = entities.find(item => item.entityId === entityId);
  if (!entity) return ref;
  if (member === 'details' && detailName) return entity.details?.[detailName]?.description || detailName;
  if (member === entity.storage.idField) return member;
  return [...entity.fields, ...(entity.fieldsBase || [])]
    .find(field => field.fieldId === member)?.title || member || ref;
}

function upperFirst(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : '';
}

export function nextAccessGrantId(
  access: Pick<Ns5AccessArtifact, 'grants'>,
  actorId: string,
  entityId: string,
): string {
  const base = `${actorId}Acesso${upperFirst(entityId || 'entidade')}`;
  const ids = new Set(access.grants.map(grant => grant.grantId));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

export function newAccessGrant(
  access: Pick<Ns5AccessArtifact, 'grants'>,
  actor: Ns5ModuleActor,
  entityId: string,
  copy: { title: string; description: string; scopeDescription: string; disclosureDescription: string },
): Ns5AccessGrant {
  return {
    grantId: nextAccessGrantId(access, actor.actorId, entityId),
    actorRef: actor.actorId,
    title: copy.title,
    description: copy.description,
    entityRefs: entityId ? [entityId] : [],
    dataScope: { mode: 'organization', description: copy.scopeDescription },
    disclosure: { mode: 'fullRecord', description: copy.disclosureDescription },
  };
}

export function accessOracleIssues(issues: readonly NewReleaseValidationIssue[]): NewReleaseValidationIssue[] {
  const checks = new Set(['I3', 'I8', 'I10', 'I13']);
  return issues.filter(issue => issue.artifact === 'access.defs.ts'
    || checks.has(issue.code)
    || [...checks].some(check => issue.code.endsWith(`_${check}`)));
}
