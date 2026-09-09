/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e4b/gate.ts" enhancement="_blank"/>

import type { Ns4E2Review } from '/_102035_/l2/agentNewSolution/steps/e2/contracts.js';
import type { Ns4E3Review } from '/_102035_/l2/agentNewSolution/steps/e3/contracts.js';
import type { Ns4E4Review, Ns4OntologyEntity } from '/_102035_/l2/agentNewSolution/steps/e4/contracts.js';
import { ns4Level1FieldIds } from '/_102035_/l2/agentNewSolution/helpers/level1Catalog.js';
import {
  checkAnchorPath, isPersonEntity, missingFieldFinding, NS4_ACCESS_BINDINGS_SCHEMA_VERSION,
  NS4_PERSON_LOGIN_FIELD, ns4AccessFieldGraph, ns4DisclosureProjectionId, ns4EntityIdsCoveredByGrant,
  ns4NeedsDisclosureProjection, ns4SynthesizedAuthorityRef,
  type Ns4AccessBinding, type Ns4AccessBindingsArtifact, type Ns4E4BFinding,
} from '/_102035_/l2/agentNewSolution/steps/e4b/contracts.js';

export interface Ns4E4BGateSources {
  access: Pick<Ns4E3Review, 'moduleName' | 'grants' | 'authorities' | 'profiles'>;
  ontology: Pick<Ns4E4Review, 'moduleName' | 'entities' | 'relationships'>;
  journeys: Pick<Ns4E2Review, 'journeys'>;
}

export interface Ns4E4BGateResult {
  ok: boolean;
  issues: Ns4E4BFinding[];
}

export function validateNs4AccessBindings(
  artifact: Ns4AccessBindingsArtifact,
  sources: Ns4E4BGateSources,
  projections: readonly Ns4OntologyEntity[] = [],
): Ns4E4BGateResult {
  const issues: Ns4E4BFinding[] = [];
  if (artifact.schemaVersion !== NS4_ACCESS_BINDINGS_SCHEMA_VERSION) {
    issues.push({
      code: 'NS4_E4B_SCHEMA',
      path: 'schemaVersion',
      message: `Access bindings must use ${NS4_ACCESS_BINDINGS_SCHEMA_VERSION}.`,
      repairStep: 'e4b-access-realization',
    });
  }
  if (artifact.moduleName !== sources.access.moduleName || artifact.moduleName !== sources.ontology.moduleName) {
    issues.push({
      code: 'NS4_E4B_MODULE',
      path: 'moduleName',
      message: 'Access bindings must belong to the same module as the approved access matrix and ontology.',
      repairStep: 'e4b-access-realization',
    });
  }

  const graph = ns4AccessFieldGraph(sources.ontology);
  const personEntities = new Set(sources.ontology.entities.filter(isPersonEntity).map(entity => entity.entityId));
  const expectedKeys = new Set<string>();
  for (const grant of sources.access.grants) {
    for (const entityRef of ns4EntityIdsCoveredByGrant(grant, sources.access, sources.journeys)) {
      expectedKeys.add(`${grant.profileRef}|${grant.authorityRef}|${entityRef}`);
    }
  }
  const seen = new Set<string>();
  for (const binding of artifact.bindings) {
    const key = `${binding.profileRef}|${binding.authorityRef}|${binding.entityRef}`;
    const path = `bindings.${binding.profileRef}.${binding.authorityRef}.${binding.entityRef}`;
    if (seen.has(key)) {
      issues.push({
        code: 'NS4_E4B_BINDING_DUPLICATE',
        path,
        message: `Duplicate access binding for ${key}.`,
        repairStep: 'e4b-access-realization',
      });
    }
    seen.add(key);
    if (!expectedKeys.has(key)) {
      issues.push({
        code: 'NS4_E4B_BINDING_UNKNOWN',
        path,
        message: `Binding ${key} has no covering grant in the approved access matrix.`,
        repairStep: 'e4b-access-realization',
      });
    }
    const needsAnchor = binding.dataScope.mode === 'own'
      || binding.dataScope.mode === 'assigned'
      || binding.dataScope.mode === 'related';
    if (!needsAnchor) {
      if (binding.anchor) {
        issues.push({
          code: 'NS4_E4B_ANCHOR_UNEXPECTED',
          path,
          message: `${binding.dataScope.mode} scope must not carry a person anchor.`,
          repairStep: 'e4b-access-realization',
        });
      }
      continue;
    }
    if (!binding.anchor) {
      issues.push(missingFieldFinding(path, binding.entityRef, NS4_PERSON_LOGIN_FIELD));
      continue;
    }
    if (binding.anchor.terminus.fieldId !== NS4_PERSON_LOGIN_FIELD) {
      issues.push({
        code: 'NS4_E4B_ANCHOR_TERMINUS',
        path: `${path}.terminus`,
        message: `Person login field must be ${NS4_PERSON_LOGIN_FIELD}.`,
        repairStep: 'e4b-access-realization',
      });
    }
    const checked = checkAnchorPath(binding.anchor.hops, binding.entityRef, graph, personEntities, path);
    if (checked.finding) issues.push(checked.finding);
  }
  issues.push(...validateDisclosureProjections(artifact.bindings, sources, projections));
  for (const key of expectedKeys) {
    if (!seen.has(key)) {
      issues.push({
        code: 'NS4_E4B_BINDING_MISSING',
        path: `bindings.${key}`,
        message: `Grant covering ${key} has no access binding.`,
        repairStep: 'e4b-access-realization',
      });
    }
  }

  const synthKeys = new Set<string>();
  for (const authority of artifact.synthesizedAuthorities) {
    const expected = ns4SynthesizedAuthorityRef(authority.entityRef, authority.profileRef);
    if (authority.authorityRef !== expected) {
      issues.push({
        code: 'NS4_E4B_SYNTH_REF',
        path: `synthesizedAuthorities.${authority.authorityRef}`,
        message: `Synthesized authority id must be ${expected}.`,
        repairStep: 'e4b-access-realization',
      });
    }
    synthKeys.add(`${authority.entityRef}|${authority.profileRef}`);
  }
  for (const binding of artifact.bindings) {
    if (!synthKeys.has(`${binding.entityRef}|${binding.profileRef}`)) {
      issues.push({
        code: 'NS4_E4B_SYNTH_MISSING',
        path: `synthesizedAuthorities.${ns4SynthesizedAuthorityRef(binding.entityRef, binding.profileRef)}`,
        message: `Binding ${binding.entityRef} x ${binding.profileRef} has no synthesized authority.`,
        repairStep: 'e4b-access-realization',
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

function validateDisclosureProjections(
  bindings: Ns4AccessBinding[],
  sources: Ns4E4BGateSources,
  projections: readonly Ns4OntologyEntity[],
): Ns4E4BFinding[] {
  const issues: Ns4E4BFinding[] = [];
  const profileById = new Map(sources.access.profiles.map(profile => [profile.profileId, profile]));
  const entityById = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  const projectionById = new Map<string, Ns4OntologyEntity>();
  for (const entity of sources.ontology.entities) projectionById.set(entity.entityId, entity);
  for (const entity of projections) projectionById.set(entity.entityId, entity);
  const grantByKey = new Map(sources.access.grants.map(grant => [`${grant.profileRef}|${grant.authorityRef}`, grant]));

  for (const binding of bindings) {
    const grant = grantByKey.get(`${binding.profileRef}|${binding.authorityRef}`);
    const profileKind = profileById.get(binding.profileRef)?.kind;
    if (!grant || !ns4NeedsDisclosureProjection(grant, profileKind)) continue;
    const path = `bindings.${binding.profileRef}.${binding.authorityRef}.${binding.entityRef}`;
    const expectedId = ns4DisclosureProjectionId(binding.entityRef, binding.profileRef);
    const projection = (binding.projectionRef && projectionById.get(binding.projectionRef))
      || projectionById.get(expectedId);
    if (!binding.projectionRef || !projection) {
      issues.push({
        code: 'NS4_E4B_DISCLOSURE_PROJECTION_REQUIRED',
        path,
        message: `External ${binding.disclosure.mode} grant needs a disclosure projection ${expectedId}.`,
        repairStep: 'e4b-access-realization',
      });
      continue;
    }
    if (binding.projectionRef !== expectedId) {
      issues.push({
        code: 'NS4_E4B_DISCLOSURE_PROJECTION_REQUIRED',
        path: `${path}.projectionRef`,
        message: `Disclosure projection id must be ${expectedId}.`,
        repairStep: 'e4b-access-realization',
      });
    }
    const source = entityById.get(binding.entityRef);
    if (!source) continue;
    const sourceFieldIds = source.fields.map(field => field.fieldId);
    const sourceSet = new Set(sourceFieldIds);
    const allowed = allowedDisclosureFieldIds(source, sources.ontology);
    const projectedIds = projection.fields.map(field => field.fieldId);
    for (const fieldId of projectedIds) {
      if (!allowed.has(fieldId)) {
        issues.push({
          code: 'NS4_E4B_DISCLOSURE_FIELD_UNKNOWN',
          path: `${path}.projection.fields`,
          message: `Disclosure projection field ${fieldId} is not a field of ${source.entityId} or level-1 base.`,
          repairStep: 'e4b-access-realization',
        });
      }
    }
    if (binding.disclosure.mode !== 'aggregateOnly') {
      const fromSource = projectedIds.filter(fieldId => sourceSet.has(fieldId));
      if (!fromSource.length || fromSource.length >= sourceFieldIds.length) {
        issues.push({
          code: 'NS4_E4B_DISCLOSURE_NOT_PROPER_SUBSET',
          path: `${path}.projection.fields`,
          message: `Disclosure projection must be a proper subset of ${source.entityId} fields.`,
          repairStep: 'e4b-access-realization',
        });
      }
    }
    const excluded = binding.excludedFields || [];
    if (!excluded.length) {
      issues.push({
        code: 'NS4_E4B_DISCLOSURE_EXCLUDED_FIELDS_REQUIRED',
        path: `${path}.excludedFields`,
        message: 'Disclosure projection must declare excludedFields (field ids the model left out).',
        repairStep: 'e4b-access-realization',
      });
    }
  }
  return issues;
}

function allowedDisclosureFieldIds(
  entity: Ns4OntologyEntity,
  ontology: Pick<Ns4E4Review, 'entities'>,
): Set<string> {
  const allowed = new Set(entity.fields.map(field => field.fieldId));
  for (const other of ontology.entities) {
    if (!other.mdmSubtype) continue;
    for (const fieldId of ns4Level1FieldIds(other.mdmSubtype)) allowed.add(fieldId);
  }
  return allowed;
}
