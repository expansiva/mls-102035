/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e4b/mdmIdField.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NS4_ACCESS_BINDINGS_SCHEMA_VERSION,
  ns4DisclosureProjectionId,
  ns4SynthesizedAuthorityRef,
  type Ns4AccessBindingsArtifact,
} from '/_102035_/l2/agentNewSolution/steps/e4b/contracts.js';
import { validateNs4AccessBindings, type Ns4E4BGateSources } from '/_102035_/l2/agentNewSolution/steps/e4b/gate.js';
import type { Ns4OntologyEntity } from '/_102035_/l2/agentNewSolution/steps/e4/contracts.js';

function mdmEmptySources(): Ns4E4BGateSources {
  return {
    access: {
      moduleName: 'mod',
      grants: [{
        profileRef: 'guest',
        authorityRef: 'view:mesa',
        reason: 'See tables.',
        dataScope: { mode: 'organization', description: 'All tables.' },
        disclosure: {
          mode: 'fieldsOnly', description: 'Identity.', allowedInformation: ['id'], deniedInformation: [],
        },
        useRules: [],
      }],
      authorities: [{ authorityRef: 'view:mesa', title: 'View', description: 'View.', journeyStepRefs: ['browse.inspectMesa'], informationNeeds: [] }],
      profiles: [{ profileId: 'guest', title: 'Guest', kind: 'external', description: 'Guest.', actorRefs: ['guest'], landingIntent: 'Tables.' }],
    },
    ontology: {
      moduleName: 'mod',
      entities: [{
        entityId: 'Mesa',
        title: 'Table',
        description: 'Table.',
        kind: 'mdm',
        ownership: 'moduleOwned',
        mdmSubtype: 'Location',
        sourceRefs: { journeyIds: ['browse'], featureIds: [], authorityRefs: ['view:mesa'] },
        fields: [],
        lifecycleStates: [],
        lifecyclePredicates: [],
        useRules: [],
        storage: { target: 'mdm', scope: 'organization', idField: 'mesaId', mdmType: 'mod.Mesa', notes: '' },
      }],
      relationships: [],
    },
    journeys: {
      journeys: [{
        journeyId: 'browse',
        business: {
          actorRef: 'guest',
          title: 'Browse',
          goal: 'See tables.',
          entry: { mode: 'coldStart' },
          useRules: [],
          steps: [{ stepId: 'inspectMesa', kind: 'inspect', entity: 'Mesa', title: 'See.', description: 'Seen.', featureRefs: [] }],
          outcome: { statement: 'Seen.', evidence: [] },
        },
      }],
    },
  } as unknown as Ns4E4BGateSources;
}

function artifactWithProjection(fieldIds: string[]): {
  artifact: Ns4AccessBindingsArtifact;
  projections: Ns4OntologyEntity[];
} {
  const projectionId = ns4DisclosureProjectionId('Mesa', 'guest');
  const disclosure = {
    mode: 'fieldsOnly' as const, description: 'Identity.', allowedInformation: ['id'], deniedInformation: [],
  };
  const dataScope = { mode: 'organization' as const, description: 'All tables.' };
  const artifact: Ns4AccessBindingsArtifact = {
    schemaVersion: NS4_ACCESS_BINDINGS_SCHEMA_VERSION,
    moduleName: 'mod',
    compiledFromAccessHash: 'sha256:access',
    compiledFromOntologyHash: 'sha256:ontology',
    bindings: [{
      profileRef: 'guest',
      authorityRef: 'view:mesa',
      entityRef: 'Mesa',
      dataScope,
      disclosure,
      anchor: null,
      projectionRef: projectionId,
      excludedFields: ['name'],
    }],
    synthesizedAuthorities: [{
      authorityRef: ns4SynthesizedAuthorityRef('Mesa', 'guest'),
      entityRef: 'Mesa',
      profileRef: 'guest',
      dataScope,
      disclosure,
      sourceGrant: { profileRef: 'guest', authorityRef: 'view:mesa' },
      anchor: null,
    }],
    bindingsHash: 'sha256:bindings',
  };
  const projections: Ns4OntologyEntity[] = [{
    entityId: projectionId,
    title: projectionId,
    description: 'View.',
    kind: 'projection',
    ownership: 'derived',
    sourceRefs: { journeyIds: [], featureIds: [], authorityRefs: [] },
    fields: fieldIds.map(fieldId => ({
      fieldId, title: fieldId, type: 'uuid', required: true, description: fieldId, constraints: [],
    })),
    lifecycleStates: [],
    lifecyclePredicates: [],
    useRules: [],
    storage: { target: 'derived', scope: 'none', notes: '' },
    derivation: { from: 'Mesa', filter: { op: 'eq', field: 'mesaId', value: 'selected' }, aggregate: [] },
  } as unknown as Ns4OntologyEntity];
  return { artifact, projections };
}

test('mdm storage.idField is an allowed disclosure field even when fields[] is empty', () => {
  const { artifact, projections } = artifactWithProjection(['mesaId']);
  const gate = validateNs4AccessBindings(artifact, mdmEmptySources(), projections);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E4B_DISCLOSURE_FIELD_UNKNOWN'), false, JSON.stringify(gate.issues));
});

test('a disclosure field that is neither resolvable nor level-1 still fails NS4_E4B_DISCLOSURE_FIELD_UNKNOWN', () => {
  const { artifact, projections } = artifactWithProjection(['noSuchField']);
  const gate = validateNs4AccessBindings(artifact, mdmEmptySources(), projections);
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E4B_DISCLOSURE_FIELD_UNKNOWN');
  assert.ok(hit.some(issue => /noSuchField/.test(issue.message)), JSON.stringify(gate.issues));
});
