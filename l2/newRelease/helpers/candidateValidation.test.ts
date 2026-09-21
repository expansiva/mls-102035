/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateValidation.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { mdm } from '/_102034_/l4/ontology/mdm.defs.js';
import { tdm } from '/_102034_/l4/ontology/tdm.defs.js';
import { ddm } from '/_102034_/l4/ontology/ddm.defs.js';
import {
  loadNs5Access, loadNs5Defs, loadNs5Integration, loadNs5JourneyIndex, loadNs5Journeys,
  loadNs5Module, loadNs5Rules, loadNs5Workflows,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import type { Ns5OntologyAnyEntity, Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';
import type { NewReleaseArtifact, NewReleaseOverlaySources, Ns5TobeArtifactPath } from '/_102035_/l2/newRelease/tobe.js';
import { candidateCanPublish, validateV3Candidate } from './candidateValidation.js';

function artifact<T>(relative: Ns5TobeArtifactPath, value: T): NewReleaseArtifact<T> {
  return { path: relative, source: 'asis', value };
}

function actualV3(): NewReleaseOverlaySources {
  const module = artifact('module.defs.ts', loadNs5Module('agendaClinica'));
  const journeyIndex = artifact('journeys/index.defs.ts', loadNs5JourneyIndex('agendaClinica'));
  const journeys = loadNs5Journeys('agendaClinica').map(row => artifact(`journeys/${row.journeyId}.defs.ts`, row));
  const index = loadNs5Defs<Ns5OntologyIndexV3>('steps/ontology30/fixtures', 'agendaClinica-v3', 'index.defs.ts');
  const ontologyIndex = artifact('ontology/index.defs.ts', index);
  const entities = index.entities.map(row => artifact(`ontology/${row.entityId}.defs.ts`,
    loadNs5Defs<Ns5OntologyAnyEntity>('steps/ontology30/fixtures', 'agendaClinica-v3', `${row.entityId}.defs.ts`)));
  const rules = artifact('rules.defs.ts', loadNs5Rules('agendaClinica'));
  const workflows = artifact('workflows.defs.ts', loadNs5Workflows('agendaClinica'));
  const access = artifact('access.defs.ts', loadNs5Access('agendaClinica'));
  const integration = artifact('integration.defs.ts', loadNs5Integration('agendaClinica'));
  const all: NewReleaseArtifact<unknown>[] = [module, journeyIndex, ...journeys, ontologyIndex, ...entities, rules, workflows, access, integration];
  return { module, journeyIndex, journeys, ontologyIndex, entities, rules, workflows, access, integration, all };
}

const context = {
  mdm, tdm, ddm,
  registryModuleNames: ['agendaClinica'],
};

test('existing v3 fixture records every area and exposes its real access defect', () => {
  const result = validateV3Candidate(actualV3(), context);
  for (const area of ['module', 'journeys', 'ontologyAssembly', 'rules', 'workflows', 'integration'] as const) {
    assert.equal(result.coverage[area].status, 'checked', `${area}: ${result.coverage[area].reason}; ${JSON.stringify(result.issues.filter(issue => issue.severity === 'error').slice(0, 5))}`);
  }
  assert.equal(result.coverage.access.status, 'error');
  assert.ok(result.issues.some(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_PATH_UNKNOWN'));
  assert.equal(result.coverage.ontologyEntities.status, 'unsupported');
  assert.equal(result.coverage.oracle.status, 'unsupported');
  assert.equal(result.ok, false);
  assert.equal(candidateCanPublish(result, ['oracle']), false);
  assert.equal(candidateCanPublish(result, ['rules']), false, 'an unrelated L4 error still blocks publication');
});

test('v3 relationship endpoint mutation is reported by the assembly gate', () => {
  const source = actualV3();
  const index = source.ontologyIndex.value!;
  if (!('platformOntology' in index)) throw new Error('Expected v3 index');
  source.ontologyIndex.value = { ...index, relationships: [{ ...index.relationships[0], to: 'UnknownEntity' }, ...index.relationships.slice(1)] };
  const result = validateV3Candidate(source, context);
  assert.equal(result.coverage.ontologyAssembly.status, 'error');
  assert.ok(result.issues.some(issue => issue.code === 'NS5_ONTOLOGY_RELATIONSHIP_ENDPOINT'));
});

test('v3 grant, workflow and integration mutations cannot be silently approved', () => {
  const cases = [
    { mutate: (s: NewReleaseOverlaySources) => { s.access.value!.grants[0].entityRefs = ['UnknownEntity']; }, area: 'access' as const },
    { mutate: (s: NewReleaseOverlaySources) => { s.workflows.value!.processes[0].tasks[0].next = ['unknownTask']; }, area: 'workflows' as const },
    { mutate: (s: NewReleaseOverlaySources) => { s.integration.value!.outbound[0].entityRefs = ['UnknownEntity']; }, area: 'integration' as const },
  ];
  for (const one of cases) {
    const source = actualV3();
    one.mutate(source);
    const result = validateV3Candidate(source, context);
    assert.notEqual(result.coverage[one.area].status, 'checked', one.area);
    assert.ok(result.issues.some(issue => issue.artifact === `${one.area}.defs.ts` && issue.severity === 'error'), one.area);
  }
});

test('missing platform catalog or transient plan is unsupported, not green', () => {
  const sources = actualV3();
  const withoutCatalog = validateV3Candidate(sources);
  assert.equal(withoutCatalog.coverage.ontologyAssembly.status, 'unsupported');
  assert.equal(withoutCatalog.ok, false);
  const withoutTdm = validateV3Candidate(sources, { mdm, ddm });
  assert.equal(withoutTdm.coverage.ontologyAssembly.status, 'unsupported');
  const withoutPlan = validateV3Candidate(sources, { mdm, tdm, ddm });
  assert.equal(withoutPlan.coverage.ontologyEntities.status, 'unsupported');
  assert.equal(candidateCanPublish(withoutPlan, ['ontologyEntities']), false);
  assert.equal(withoutPlan.ok, false);
});
