/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e4b/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  compileNs4AccessBindings, NS4_PERSON_LOGIN_FIELD, ns4CatalogueProfileIds, ns4SynthesizedAuthorityRef,
  type Ns4E4BSources,
} from '/_102035_/l2/agentNewSolution/steps/e4b/contracts.js';
import { validateNs4AccessBindings } from '/_102035_/l2/agentNewSolution/steps/e4b/gate.js';
import { deriveNs4E8Model } from '/_102035_/l2/agentNewSolution/steps/e8/tiers.js';
import { buildNs4NavigationRealizedAccess, compileNs4ClassicL4 } from '/_102035_/l2/agentNewSolution/steps/e9/classic.js';

const ce05 = JSON.parse(readFileSync(new URL('fixtures/ce05-like.json', import.meta.url), 'utf8'));
const ce01 = JSON.parse(readFileSync(new URL('fixtures/ce01-like.json', import.meta.url), 'utf8'));
const ce09 = JSON.parse(readFileSync(new URL('fixtures/ce09-like.json', import.meta.url), 'utf8'));
const ce03 = JSON.parse(readFileSync(new URL('fixtures/ce03-like.json', import.meta.url), 'utf8'));

function asSources(fixture: typeof ce05): Ns4E4BSources {
  return {
    moduleName: fixture.moduleName,
    access: fixture.access,
    ontology: fixture.ontology,
    journeys: fixture.journeys,
    accessHash: fixture.accessHash,
    ontologyHash: fixture.ontologyHash,
  };
}

test('ce05-like own grant anchors OrdenServicio.clienteId to Person.platformUserId', async () => {
  const compiled = await compileNs4AccessBindings(asSources(ce05));
  assert.deepEqual(compiled.findings, []);
  const own = compiled.artifact.bindings.find(item => item.profileRef === 'cliente')!;
  assert.equal(own.dataScope.mode, 'own');
  assert.equal(own.anchor?.hops[0].entityRef, 'OrdenServicio');
  assert.equal(own.anchor?.hops[0].fieldId, 'clienteId');
  assert.equal(own.anchor?.terminus.fieldId, NS4_PERSON_LOGIN_FIELD);
  assert.equal(own.anchor?.terminus.entityRef, 'Cliente');
  const org = compiled.artifact.bindings.find(item => item.profileRef === 'recepcionista')!;
  assert.equal(org.anchor, null);
  const gate = validateNs4AccessBindings(compiled.artifact, asSources(ce05));
  assert.equal(gate.ok, true);
});

test('ce05-like catalogue profileRefs exclude the external own profile', () => {
  const profiles = ns4CatalogueProfileIds('OrdenServicio', ce05.access, ce05.journeys);
  assert.deepEqual(profiles, ['recepcionista']);
  const ontology = {
    ...ce05.ontology, planId: 'e4-ontology-review', title: 'O', reviewRound: 1, userLanguage: 'es', changeSummary: [],
    entities: ce05.ontology.entities.map((entity: any) => ({
      ...entity,
      description: entity.title,
      ownership: entity.ownership || 'moduleOwned',
      sourceRefs: { journeyIds: [], featureIds: [], authorityRefs: [] },
      lifecycleStates: entity.lifecycleStates || [],
      lifecyclePredicates: entity.lifecyclePredicates || [],
      useRules: entity.useRules || [],
    })),
  };
  const model = deriveNs4E8Model({
    journeys: { ...ce05.journeys, features: [], userLanguage: 'es', planId: 'e2-review', title: 'J', reviewRound: 1 },
    access: { ...ce05.access, planId: 'e3-access-review', title: 'A', reviewRound: 1, changeSummary: [] },
    ontology,
    useCases: [
      { useCaseId: 'captureOrden', compiledFrom: ['abrirOrden.captureOrden'], entityRefs: ['OrdenServicio'], useRules: [], transitionRefs: [], kind: 'command', title: 'Open' },
      { useCaseId: 'inspectOrden', compiledFrom: ['consultarMisOrdenes.inspectOrden'], entityRefs: ['OrdenServicio'], useRules: [], transitionRefs: [], kind: 'query', title: 'Inspect' },
    ],
    workflows: [],
  } as any);
  const catalogue = model.workspaces.find(workspace => workspace.workspaceId === 'ordenServicioCatalogue');
  assert.ok(catalogue);
  assert.equal(catalogue!.profileRefs.includes('cliente'), false);
  assert.ok(catalogue!.profileRefs.includes('recepcionista'));
  const list = model.operations.find(operation => operation.operationId === 'listOrdenServicio')!;
  assert.deepEqual(list.authorityRefs, [ns4SynthesizedAuthorityRef('OrdenServicio', 'recepcionista')]);
  const portal = model.operations.find(operation => operation.useCaseId === 'inspectOrden')!;
  assert.ok(portal.authorityRefs.includes('svc:own-orders'));
  assert.equal(model.operations.every(operation => operation.authorityRefs.length > 0), true);
});

test('ce01-like assigned grant walks the direct professional hop', async () => {
  const compiled = await compileNs4AccessBindings(asSources(ce01));
  assert.deepEqual(compiled.findings, []);
  const binding = compiled.artifact.bindings[0];
  assert.equal(binding.anchor?.hops[0].fieldId, 'professionalId');
  assert.equal(binding.anchor?.terminus.entityRef, 'Professional');
  assert.equal(validateNs4AccessBindings(compiled.artifact, asSources(ce01)).ok, true);
});

test('ce09-like assigned grant walks the intermediate VehicleAssignment hop', async () => {
  const compiled = await compileNs4AccessBindings(asSources(ce09));
  assert.deepEqual(compiled.findings, []);
  const hops = compiled.artifact.bindings[0].anchor?.hops || [];
  assert.ok(hops.some(hop => hop.fieldId === 'vehicleId' && hop.direction === 'incoming'));
  assert.ok(hops.some(hop => hop.fieldId === 'driverId'));
  assert.equal(compiled.artifact.bindings[0].anchor?.terminus.entityRef, 'Driver');
  assert.equal(validateNs4AccessBindings(compiled.artifact, asSources(ce09)).ok, true);
});

test('ce03-like missing manager field is NS4_E4B_ANCHOR_FIELD_MISSING with repairStep e4-ontology', async () => {
  const compiled = await compileNs4AccessBindings(asSources(ce03));
  assert.ok(compiled.findings.some(finding => finding.code === 'NS4_E4B_ANCHOR_FIELD_MISSING' && finding.repairStep === 'e4-ontology'));
  const proposed = await compileNs4AccessBindings(asSources(ce03), [{
    profileRef: 'gestor',
    authorityRef: 'exp:team-expenses',
    entityRef: 'Expense',
    hops: [],
    missingField: { entityRef: 'Team', fieldId: 'managerId' },
  }]);
  assert.equal(proposed.findings[0].code, 'NS4_E4B_ANCHOR_FIELD_MISSING');
  assert.match(proposed.findings[0].message, /Team\.managerId/);
  const broken = structuredClone(compiled.artifact);
  const own = broken.bindings[0];
  own.anchor = {
    hops: [{ entityRef: 'Team', fieldId: 'managerId', targetEntityRef: 'Person', direction: 'forward' }],
    terminus: { entityRef: 'Person', fieldId: NS4_PERSON_LOGIN_FIELD },
  };
  const gate = validateNs4AccessBindings(broken, asSources(ce03));
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4B_ANCHOR_FIELD_MISSING' && issue.repairStep === 'e4-ontology'));
});

test('gate rejects a hop that does not continue from the previous entity', async () => {
  const compiled = await compileNs4AccessBindings(asSources(ce01));
  const broken = structuredClone(compiled.artifact);
  broken.bindings[0].anchor = {
    hops: [{ entityRef: 'Appointment', fieldId: 'professionalId', targetEntityRef: 'Professional', direction: 'incoming' }],
    terminus: { entityRef: 'Professional', fieldId: NS4_PERSON_LOGIN_FIELD },
  };
  const gate = validateNs4AccessBindings(broken, asSources(ce01));
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4B_ANCHOR_HOP_INVALID' || issue.code === 'NS4_E4B_ANCHOR_FIELD_MISSING'));
});

test('E9 writes V4 operationAuthorityRefs from the E8 model', async () => {
  const ontology = {
    ...ce05.ontology, planId: 'e4-ontology-review', title: 'O', reviewRound: 1, userLanguage: 'es', changeSummary: [],
    entities: ce05.ontology.entities.map((entity: any) => ({
      ...entity,
      description: entity.title,
      ownership: entity.ownership || 'moduleOwned',
      sourceRefs: { journeyIds: [], featureIds: [], authorityRefs: [] },
      lifecycleStates: [],
      lifecyclePredicates: [],
      useRules: [],
    })),
  };
  const input: any = {
    journeys: { ...ce05.journeys, features: [], userLanguage: 'es', planId: 'e2-review', title: 'J', reviewRound: 1 },
    access: { ...ce05.access, planId: 'e3-access-review', title: 'A', reviewRound: 1, changeSummary: [] },
    ontology,
    useCases: [
      { useCaseId: 'captureOrden', compiledFrom: ['abrirOrden.captureOrden'], entityRefs: ['OrdenServicio'], useRules: [], transitionRefs: [], kind: 'command', title: 'Open' },
      { useCaseId: 'inspectOrden', compiledFrom: ['consultarMisOrdenes.inspectOrden'], entityRefs: ['OrdenServicio'], useRules: [], transitionRefs: [], kind: 'query', title: 'Inspect' },
    ],
    workflows: [],
  };
  const model = deriveNs4E8Model(input);
  const classic = await compileNs4ClassicL4(model, input.ontology);
  const v4 = await buildNs4NavigationRealizedAccess({
    schemaVersion: '2026-08-10-ns4-access-matrix-v3',
    moduleName: 'ordenServicioLike',
    userLanguage: 'es',
    title: 'Access',
    profiles: ce05.access.profiles,
    authorities: ce05.access.authorities,
    grants: ce05.access.grants,
    accessHash: 'sha256:access-ce05',
    approvedBy: 'auto',
    approvedAt: '2026-09-08T00:00:00.000Z',
    realization: { status: 'useCasesCompiled', compiledFromAccessHash: 'sha256:access-ce05', useCaseAuthorityRefs: [], realizationHash: 'sha256:x' },
  } as any, model, classic);
  assert.equal(v4.realization.status, 'navigationCompiled');
  assert.ok(v4.realization.operationAuthorityRefs.length);
  assert.equal(v4.realization.operationAuthorityRefs.every(row => row.authorityRefs.length > 0), true);
});

test('e4b sources stay English in comments and identifiers', () => {
  const files = [
    readFileSync(new URL('contracts.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('gate.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('agentNs4E4B.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('gate.test.ts', import.meta.url), 'utf8'),
  ];
  for (const source of files) {
    assert.doesNotMatch(source, /portuguese\s*\?/);
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
      if (!isComment) continue;
      assert.doesNotMatch(line, /[À-ÿ]/, trimmed);
    }
  }
});
