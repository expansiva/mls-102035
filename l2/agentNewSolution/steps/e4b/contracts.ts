/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e4b/contracts.ts" enhancement="_blank"/>

/**
 * E4B access realization: reconcile the E3 access matrix with the E4 ontology.
 * Bindings and synthesized authorities are machine artifacts — never fields on the human grant.
 */

import { sha256Ns4 } from '/_102035_/l2/agentNewSolution/steps/e2/contracts.js';
import type { Ns4E2Review } from '/_102035_/l2/agentNewSolution/steps/e2/contracts.js';
import type {
  Ns4AccessGrant, Ns4AccessScopeMode, Ns4DisclosureMode, Ns4E3Review,
} from '/_102035_/l2/agentNewSolution/steps/e3/contracts.js';
import type { Ns4E4Review, Ns4OntologyEntity, Ns4OntologyRelationship } from '/_102035_/l2/agentNewSolution/steps/e4/contracts.js';

export const NS4_ACCESS_BINDINGS_SCHEMA_VERSION = '2026-09-08-ns4-access-bindings-v1' as const;
export const NS4_PERSON_LOGIN_FIELD = 'platformUserId' as const;
export const NS4_SYNTH_AUTHORITY_PREFIX = 'synth:' as const;
const MAX_ANCHOR_HOPS = 3;

export type Ns4AnchorDirection = 'forward' | 'incoming';

export interface Ns4AccessAnchorHop {
  entityRef: string;
  fieldId: string;
  targetEntityRef: string;
  direction: Ns4AnchorDirection;
}

export interface Ns4AccessAnchor {
  hops: Ns4AccessAnchorHop[];
  terminus: { entityRef: string; fieldId: typeof NS4_PERSON_LOGIN_FIELD };
}

export interface Ns4AccessBinding {
  profileRef: string;
  authorityRef: string;
  entityRef: string;
  dataScope: { mode: Ns4AccessScopeMode; description: string };
  disclosure: {
    mode: Ns4DisclosureMode;
    description: string;
    allowedInformation: string[];
    deniedInformation: string[];
  };
  anchor: Ns4AccessAnchor | null;
  /** Present when `anchor` is null: organization / custom / public have no person path. */
  anchorReason?: string;
}

export interface Ns4SynthesizedAuthority {
  authorityRef: string;
  entityRef: string;
  profileRef: string;
  dataScope: Ns4AccessBinding['dataScope'];
  disclosure: Ns4AccessBinding['disclosure'];
  sourceGrant: { profileRef: string; authorityRef: string };
  anchor: Ns4AccessAnchor | null;
}

export interface Ns4AccessBindingsArtifact {
  schemaVersion: typeof NS4_ACCESS_BINDINGS_SCHEMA_VERSION;
  moduleName: string;
  compiledFromAccessHash: string;
  compiledFromOntologyHash: string;
  bindings: Ns4AccessBinding[];
  synthesizedAuthorities: Ns4SynthesizedAuthority[];
  bindingsHash: string;
}

export interface Ns4E4BProposal {
  profileRef: string;
  authorityRef: string;
  entityRef: string;
  hops: Ns4AccessAnchorHop[];
  /** The model names a field the ontology does not have; the gate turns this into a finding. */
  missingField?: { entityRef: string; fieldId: string };
}

export interface Ns4E4BSources {
  moduleName: string;
  access: Ns4E3Review;
  ontology: Ns4E4Review;
  journeys: Ns4E2Review;
  accessHash: string;
  ontologyHash: string;
}

export interface Ns4E4BFinding {
  code: string;
  path: string;
  message: string;
  repairStep?: 'e4-ontology' | 'e4b-access-realization';
}

export interface Ns4E4BCompileResult {
  artifact: Ns4AccessBindingsArtifact;
  findings: Ns4E4BFinding[];
}

export function ns4SynthesizedAuthorityRef(entityRef: string, profileRef: string): string {
  return `${NS4_SYNTH_AUTHORITY_PREFIX}${entityRef}:${profileRef}`;
}

export function ns4GrantCoversEntity(
  grant: Ns4AccessGrant,
  entityRef: string,
  access: Pick<Ns4E3Review, 'authorities'>,
  journeys: Pick<Ns4E2Review, 'journeys'>,
): boolean {
  return ns4EntityIdsCoveredByGrant(grant, access, journeys).includes(entityRef);
}

export function ns4EntityIdsCoveredByGrant(
  grant: Ns4AccessGrant,
  access: Pick<Ns4E3Review, 'authorities'>,
  journeys: Pick<Ns4E2Review, 'journeys'>,
): string[] {
  const authority = access.authorities.find(item => item.authorityRef === grant.authorityRef);
  if (!authority) return [];
  const entities = new Set<string>();
  const journeyById = new Map(journeys.journeys.map(journey => [journey.journeyId, journey]));
  for (const ref of authority.journeyStepRefs) {
    const dot = ref.indexOf('.');
    if (dot <= 0) continue;
    const journey = journeyById.get(ref.slice(0, dot));
    const stepId = ref.slice(dot + 1);
    const step = journey?.business.steps.find(item => item.stepId === stepId);
    if (step?.entity) entities.add(step.entity);
  }
  return [...entities].sort();
}

/** Catalogue audience: profiles with an organization-scope grant covering the entity. */
export function ns4CatalogueProfileIds(
  entityRef: string,
  access: Pick<Ns4E3Review, 'grants' | 'authorities'>,
  journeys: Pick<Ns4E2Review, 'journeys'>,
): string[] {
  const profiles = new Set<string>();
  for (const grant of access.grants) {
    if (grant.dataScope.mode !== 'organization') continue;
    if (ns4GrantCoversEntity(grant, entityRef, access, journeys)) profiles.add(grant.profileRef);
  }
  return [...profiles].sort();
}

export function ns4JourneyAuthorityRefs(
  compiledFrom: string[],
  access: Pick<Ns4E3Review, 'authorities'>,
): string[] {
  const refs = new Set<string>();
  for (const authority of access.authorities) {
    if (compiledFrom.some(ref => authority.journeyStepRefs.includes(ref))) refs.add(authority.authorityRef);
  }
  return [...refs].sort();
}

export async function compileNs4AccessBindings(
  sources: Ns4E4BSources,
  proposals: Ns4E4BProposal[] = [],
): Promise<Ns4E4BCompileResult> {
  const findings: Ns4E4BFinding[] = [];
  const graph = buildFieldGraph(sources.ontology);
  const personEntities = new Set(sources.ontology.entities.filter(isPersonEntity).map(entity => entity.entityId));
  const proposalByKey = new Map(proposals.map(item => [proposalKey(item), item]));
  const bindings: Ns4AccessBinding[] = [];

  for (const grant of sources.access.grants) {
    const entityRefs = ns4EntityIdsCoveredByGrant(grant, sources.access, sources.journeys);
    for (const entityRef of entityRefs) {
      const path = `bindings.${grant.profileRef}.${grant.authorityRef}.${entityRef}`;
      const needsAnchor = grant.dataScope.mode === 'own'
        || grant.dataScope.mode === 'assigned'
        || grant.dataScope.mode === 'related';
      let anchor: Ns4AccessAnchor | null = null;
      let anchorReason: string | undefined;
      if (!needsAnchor) {
        anchorReason = anchorReasonFor(grant.dataScope.mode);
      } else {
        const proposal = proposalByKey.get(proposalKey({ profileRef: grant.profileRef, authorityRef: grant.authorityRef, entityRef }));
        if (proposal?.missingField) {
          findings.push(missingFieldFinding(path, proposal.missingField.entityRef, proposal.missingField.fieldId));
        } else if (proposal?.hops.length) {
          const checked = checkAnchorPath(proposal.hops, entityRef, graph, personEntities, path);
          if (checked.finding) findings.push(checked.finding);
          else anchor = checked.anchor ?? null;
        } else {
          const unique = uniquePersonPath(entityRef, graph, personEntities);
          if (unique) {
            anchor = unique;
          } else {
            findings.push(missingFieldFinding(path, entityRef, NS4_PERSON_LOGIN_FIELD));
          }
        }
      }
      bindings.push({
        profileRef: grant.profileRef,
        authorityRef: grant.authorityRef,
        entityRef,
        dataScope: { mode: grant.dataScope.mode, description: grant.dataScope.description },
        disclosure: {
          mode: grant.disclosure.mode,
          description: grant.disclosure.description,
          allowedInformation: [...grant.disclosure.allowedInformation],
          deniedInformation: [...grant.disclosure.deniedInformation],
        },
        anchor,
        ...(anchorReason ? { anchorReason } : {}),
      });
    }
  }

  bindings.sort((left, right) =>
    `${left.profileRef}|${left.authorityRef}|${left.entityRef}`
      .localeCompare(`${right.profileRef}|${right.authorityRef}|${right.entityRef}`));

  const synthesizedAuthorities = synthesizeAuthorities(bindings);
  const contract = {
    schemaVersion: NS4_ACCESS_BINDINGS_SCHEMA_VERSION,
    moduleName: sources.moduleName,
    compiledFromAccessHash: sources.accessHash,
    compiledFromOntologyHash: sources.ontologyHash,
    bindings,
    synthesizedAuthorities,
  };
  const artifact: Ns4AccessBindingsArtifact = {
    ...contract,
    bindingsHash: await sha256Ns4(contract),
  };
  return { artifact, findings };
}

function synthesizeAuthorities(bindings: Ns4AccessBinding[]): Ns4SynthesizedAuthority[] {
  const byKey = new Map<string, Ns4SynthesizedAuthority>();
  for (const binding of bindings) {
    const authorityRef = ns4SynthesizedAuthorityRef(binding.entityRef, binding.profileRef);
    const existing = byKey.get(authorityRef);
    if (existing) continue;
    byKey.set(authorityRef, {
      authorityRef,
      entityRef: binding.entityRef,
      profileRef: binding.profileRef,
      dataScope: binding.dataScope,
      disclosure: binding.disclosure,
      sourceGrant: { profileRef: binding.profileRef, authorityRef: binding.authorityRef },
      anchor: binding.anchor,
    });
  }
  return [...byKey.values()].sort((left, right) => left.authorityRef.localeCompare(right.authorityRef));
}

export function isPersonEntity(entity: Ns4OntologyEntity): boolean {
  return entity.mdmSubtype === 'Person' || entity.party === 'person' || entity.entityId === 'Person';
}

export interface Ns4AccessFieldEdge {
  entityRef: string;
  fieldId: string;
  targetEntityRef: string;
  direction: Ns4AnchorDirection;
}

export function ns4AccessFieldGraph(ontology: Pick<Ns4E4Review, 'relationships'>): Ns4AccessFieldEdge[] {
  return buildFieldGraph(ontology);
}

function buildFieldGraph(ontology: Pick<Ns4E4Review, 'relationships'>): Ns4AccessFieldEdge[] {
  const edges: Ns4AccessFieldEdge[] = [];
  const seen = new Set<string>();
  const add = (edge: Ns4AccessFieldEdge) => {
    const key = `${edge.direction}|${edge.entityRef}|${edge.fieldId}|${edge.targetEntityRef}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(edge);
  };
  for (const relationship of ontology.relationships) {
    for (const edge of edgesOf(relationship)) add(edge);
  }
  return edges;
}

function edgesOf(relationship: Ns4OntologyRelationship): Ns4AccessFieldEdge[] {
  const realization = relationship.realization;
  if (!realization) return [];
  const fromEntity = realization.from.entityId || relationship.fromEntity;
  const toEntity = realization.to.entityId || relationship.toEntity;
  const fromField = realization.from.fieldIds[0];
  const toField = realization.to.fieldIds[0];
  const edges: Ns4AccessFieldEdge[] = [];
  // `incoming` keeps the same field owner as `forward`; the walk uses direction to reverse it.
  if (fromField && fromEntity && toEntity) {
    edges.push({ entityRef: fromEntity, fieldId: fromField, targetEntityRef: toEntity, direction: 'forward' });
    edges.push({ entityRef: fromEntity, fieldId: fromField, targetEntityRef: toEntity, direction: 'incoming' });
  }
  if (toField && toEntity && fromEntity && toField !== fromField) {
    edges.push({ entityRef: toEntity, fieldId: toField, targetEntityRef: fromEntity, direction: 'forward' });
    edges.push({ entityRef: toEntity, fieldId: toField, targetEntityRef: fromEntity, direction: 'incoming' });
  }
  return edges;
}

function uniquePersonPath(
  startEntity: string,
  graph: Ns4AccessFieldEdge[],
  personEntities: Set<string>,
): Ns4AccessAnchor | null {
  if (personEntities.has(startEntity)) {
    return { hops: [], terminus: { entityRef: startEntity, fieldId: NS4_PERSON_LOGIN_FIELD } };
  }
  const paths: Ns4AccessAnchorHop[][] = [];
  const queue: Array<{ entity: string; hops: Ns4AccessAnchorHop[]; visited: Set<string> }> = [
    { entity: startEntity, hops: [], visited: new Set([startEntity]) },
  ];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.hops.length >= MAX_ANCHOR_HOPS) continue;
    for (const edge of graph.filter(item =>
      (item.direction === 'forward' && item.entityRef === current.entity)
      || (item.direction === 'incoming' && item.targetEntityRef === current.entity))) {
      const nextEntity = edge.direction === 'forward' ? edge.targetEntityRef : edge.entityRef;
      if (current.visited.has(nextEntity)) continue;
      const hop: Ns4AccessAnchorHop = {
        entityRef: edge.entityRef,
        fieldId: edge.fieldId,
        targetEntityRef: edge.targetEntityRef,
        direction: edge.direction,
      };
      const hops = [...current.hops, hop];
      if (personEntities.has(nextEntity)) {
        paths.push(hops);
        continue;
      }
      const visited = new Set(current.visited);
      visited.add(nextEntity);
      queue.push({ entity: nextEntity, hops, visited });
    }
  }
  if (paths.length !== 1) return null;
  const hops = paths[0];
  const last = hops[hops.length - 1];
  const terminusEntity = last.direction === 'forward' ? last.targetEntityRef : last.entityRef;
  return { hops, terminus: { entityRef: terminusEntity, fieldId: NS4_PERSON_LOGIN_FIELD } };
}

export function checkAnchorPath(
  hops: Ns4AccessAnchorHop[],
  startEntity: string,
  graph: Ns4AccessFieldEdge[],
  personEntities: Set<string>,
  path: string,
): { anchor?: Ns4AccessAnchor; finding?: Ns4E4BFinding } {
  if (!hops.length) {
    if (personEntities.has(startEntity)) {
      return { anchor: { hops: [], terminus: { entityRef: startEntity, fieldId: NS4_PERSON_LOGIN_FIELD } } };
    }
    return { finding: missingFieldFinding(path, startEntity, NS4_PERSON_LOGIN_FIELD) };
  }
  let cursor = startEntity;
  for (const hop of hops) {
    const match = graph.find(edge =>
      edge.entityRef === hop.entityRef
      && edge.fieldId === hop.fieldId
      && edge.targetEntityRef === hop.targetEntityRef
      && edge.direction === hop.direction);
    if (!match) {
      return { finding: missingFieldFinding(path, hop.entityRef, hop.fieldId) };
    }
    if (hop.direction === 'forward') {
      if (hop.entityRef !== cursor) {
        return {
          finding: {
            code: 'NS4_E4B_ANCHOR_HOP_INVALID',
            path,
            message: `Anchor hop ${hop.entityRef}.${hop.fieldId} does not continue from ${cursor}.`,
            repairStep: 'e4b-access-realization',
          },
        };
      }
      cursor = hop.targetEntityRef;
    } else {
      if (hop.targetEntityRef !== cursor) {
        return {
          finding: {
            code: 'NS4_E4B_ANCHOR_HOP_INVALID',
            path,
            message: `Incoming hop ${hop.entityRef}.${hop.fieldId} does not arrive at ${cursor}.`,
            repairStep: 'e4b-access-realization',
          },
        };
      }
      cursor = hop.entityRef;
    }
  }
  if (!personEntities.has(cursor)) {
    return {
      finding: {
        code: 'NS4_E4B_ANCHOR_TERMINUS',
        path,
        message: `Anchor path from ${startEntity} ends on ${cursor}, which is not a Person.`,
        repairStep: 'e4b-access-realization',
      },
    };
  }
  return { anchor: { hops, terminus: { entityRef: cursor, fieldId: NS4_PERSON_LOGIN_FIELD } } };
}

export function missingFieldFinding(path: string, entityRef: string, fieldId: string): Ns4E4BFinding {
  return {
    code: 'NS4_E4B_ANCHOR_FIELD_MISSING',
    path,
    message: `Scope anchor needs ${entityRef}.${fieldId}, which is not in the ontology.`,
    repairStep: 'e4-ontology',
  };
}

function proposalKey(item: { profileRef: string; authorityRef: string; entityRef: string }): string {
  return `${item.profileRef}|${item.authorityRef}|${item.entityRef}`;
}

function anchorReasonFor(mode: Ns4AccessScopeMode): string {
  if (mode === 'organization') return 'organization scope is not a person predicate';
  if (mode === 'public') return 'public scope is anonymous';
  return 'custom scope is a state predicate, not a person path';
}


