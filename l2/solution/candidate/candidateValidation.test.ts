/// <mls fileReference="_102035_/l2/solution/candidate/candidateValidation.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { mdm } from '/_102034_/l4/ontology/mdm.defs.js';
import { tdm } from '/_102034_/l4/ontology/tdm.defs.js';
import { ddm } from '/_102034_/l4/ontology/ddm.defs.js';
import {
  loadNs5Access, loadNs5Defs, loadNs5Integration, loadNs5JourneyIndex, loadNs5Journeys,
  loadNs5Module, loadNs5Rules, loadNs5Workflows,
} from '/_102035_/l2/solution/testing/ns5RealFixtures.test.js';
import { isNs5OntologyEntityV3, type Ns5OntologyEntityV3, type Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';
import type { NewReleaseArtifact, NewReleaseOverlaySources, NewReleaseOverlayValidation, NewReleaseValidationIssue, Ns5TobeArtifactPath } from '/_102035_/l2/solution/candidate/tobePaths.js';
import { applyScreenBaseline, candidateCanPublish, unavailableCandidateCoverage, validateV3Candidate } from '/_102035_/l2/solution/candidate/candidateValidation.js';
import { deriveOntologyPlan } from '/_102035_/l2/solution/candidate/ontologyPlanDerive.js';
import type { Ns5OntologyV3PlanDraft } from '/_102035_/l2/solution/gates/ontology30/contractsV3.js';

function artifact<T>(relative: Ns5TobeArtifactPath, value: T): NewReleaseArtifact<T> {
  return { path: relative, source: 'asis', value };
}

function actualV3(): NewReleaseOverlaySources {
  const module = artifact('module.defs.ts', loadNs5Module('agendaClinica'));
  const journeyIndex = artifact('journeys/index.defs.ts', loadNs5JourneyIndex('agendaClinica'));
  const journeys = loadNs5Journeys('agendaClinica').map(row => artifact(`journeys/${row.journeyId}.defs.ts`, row));
  const index = loadNs5Defs<Ns5OntologyIndexV3>('fixtures/ontology30', 'agendaClinica-v3', 'index.defs.ts');
  const ontologyIndex = artifact('ontology/index.defs.ts', index);
  const entities = index.entities.map(row => artifact(`ontology/${row.entityId}.defs.ts`,
    loadNs5Defs<Ns5OntologyAnyEntity>('fixtures/ontology30', 'agendaClinica-v3', `${row.entityId}.defs.ts`)));
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
  assert.equal(result.coverage.ontologyEntities.status, 'checked');
  assert.equal(result.coverage.oracle.status, 'error', result.coverage.oracle.reason);
  assert.match(result.coverage.oracle.reason || '', /attendanceNote/);
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

test('a new rules error blocks publication and an error already on the module does not', () => {
  const base = actualV3();
  const broken = actualV3();
  const rule = broken.rules.value!;
  if (!('rules' in rule) || !Array.isArray(rule.rules)) throw new Error('Expected a rules catalog');
  rule.rules[0].description = '';
  const result = validateV3Candidate(broken, context, base);
  assert.equal(result.coverage.rules.status, 'error');
  assert.ok(result.issues.some(issue => issue.artifact === 'rules.defs.ts' && issue.severity === 'error' && !issue.baseline));
  assert.equal(candidateCanPublish(result, ['rules']), false);

  const same = validateV3Candidate(actualV3(), context, actualV3());
  const oldErrors = same.issues.filter(issue => issue.severity === 'error');
  assert.ok(oldErrors.length > 0);
  assert.ok(oldErrors.every(issue => issue.baseline === true));
  assert.equal(same.coverage.oracle.status, 'checked');
  assert.equal(same.coverage.access.status, 'checked');
  assert.equal(same.coverage.ontologyEntities.status, 'checked');
  assert.equal(candidateCanPublish(same, ['rules']), true);
  assert.equal(same.ok, true);
  const oldWarnings = same.issues.filter(issue => issue.severity === 'warning');
  assert.ok(oldWarnings.length > 0);
  assert.ok(oldWarnings.every(issue => issue.baseline === true));

  const noBase = validateV3Candidate(actualV3(), context);
  assert.ok(noBase.issues.some(issue => issue.severity === 'error' && !issue.baseline));
  assert.equal(noBase.coverage.oracle.status, 'error');
  assert.equal(candidateCanPublish(noBase, ['oracle']), false);
  assert.ok(noBase.issues.filter(issue => issue.severity === 'warning').every(issue => !issue.baseline));
});

test('warning baseline matches artifact, path and code without changing verdicts or severity', () => {
  const warning: NewReleaseValidationIssue = {
    artifact: 'workflows.defs.ts', path: 'processes[0].functions', code: 'LEGACY_WARNING',
    message: 'Existing observation', severity: 'warning', source: 'gate',
  };
  const coverage = unavailableCandidateCoverage('unused');
  for (const area of Object.keys(coverage) as (keyof typeof coverage)[]) coverage[area] = { status: 'checked' };
  const current: NewReleaseOverlayValidation = {
    ok: true, coverage, oracle: null,
    issues: [
      { ...warning, message: 'Updated wording', source: 'oracle' },
      { ...warning, artifact: 'rules.defs.ts' },
      { ...warning, path: 'processes[1].functions' },
      { ...warning, code: 'NEW_WARNING' },
    ],
  };
  const result = applyScreenBaseline(current, [warning], []);
  assert.deepEqual(result.issues.map(issue => issue.baseline), [true, undefined, undefined, undefined]);
  assert.ok(result.issues.every(issue => issue.severity === 'warning'));
  assert.deepEqual(result.coverage, coverage);
  assert.equal(result.ok, true);
  assert.equal(candidateCanPublish(result, ['workflows']), true);
  assert.equal(applyScreenBaseline(current, undefined, []), current);

  const error = { ...warning, severity: 'error' as const };
  const failed = applyScreenBaseline({ ...current, ok: false, issues: [error] }, [warning], []);
  assert.equal(failed.issues[0].baseline, undefined, 'an earlier warning must not exempt a new error');
  assert.equal(failed.issues[0].severity, 'error');
  assert.equal(failed.ok, false);
  assert.equal(candidateCanPublish(failed, ['workflows']), false);
});

test('missing platform catalog is unsupported; a missing frozen plan still checks entity gates', () => {
  const sources = actualV3();
  const withoutCatalog = validateV3Candidate(sources);
  assert.equal(withoutCatalog.coverage.ontologyAssembly.status, 'unsupported');
  assert.equal(withoutCatalog.ok, false);
  const withoutTdm = validateV3Candidate(sources, { mdm, ddm });
  assert.equal(withoutTdm.coverage.ontologyAssembly.status, 'unsupported');
  const withoutPlan = validateV3Candidate(sources, { mdm, tdm, ddm });
  assert.equal(withoutPlan.coverage.ontologyEntities.status, 'checked');
  assert.notEqual(withoutPlan.coverage.ontologyEntities.status, 'unsupported');
  assert.equal(withoutPlan.ok, false);
});

test('edited ontology index still runs entity gates, and a real content error is refused', () => {
  const index = actualV3().ontologyIndex.value!;
  const fk = index.relationships.find(row => row.mode === 'fk' && row.field && row.field.includes('.'));
  assert.ok(fk, 'fixture has an fk relationship');

  const added = actualV3();
  const addedIndex = added.ontologyIndex.value!;
  added.ontologyIndex.value = {
    ...addedIndex,
    relationships: [...addedIndex.relationships, { ...fk!, relationshipId: 'extraSeating' }],
  };
  const addedResult = validateV3Candidate(added, context);
  assert.equal(addedResult.coverage.ontologyEntities.status, 'checked', addedResult.coverage.ontologyEntities.reason);

  const donor = added.entities.find(item => item.value && 'kind' in item.value && item.value.kind === 'entity');
  assert.ok(donor?.value);
  const created = actualV3();
  const createdIndex = created.ontologyIndex.value!;
  const file = structuredClone(donor.value) as NonNullable<typeof donor.value>;
  if (!('kind' in file) || file.kind !== 'entity') throw new Error('Expected a table entity');
  file.entityId = 'SideNote';
  file.relationships = {};
  created.entities = [...created.entities, artifact('ontology/SideNote.defs.ts', file)];
  created.ontologyIndex.value = {
    ...createdIndex,
    entities: [...createdIndex.entities, { entityId: 'SideNote', kind: 'entity', class: file.class }],
  };
  const createdResult = validateV3Candidate(created, context);
  assert.equal(createdResult.coverage.ontologyEntities.status, 'checked', JSON.stringify(createdResult.issues.filter(issue => issue.code.startsWith('NS5_ONTOLOGY')).slice(0, 4)));

  const retargeted = actualV3();
  const retargetedIndex = retargeted.ontologyIndex.value!;
  retargeted.ontologyIndex.value = {
    ...retargetedIndex,
    relationships: retargetedIndex.relationships.map(row => row.relationshipId === fk!.relationshipId
      ? { ...row, mode: 'throughTable' as const, through: row.to }
      : row),
  };
  const retargetedResult = validateV3Candidate(retargeted, context);
  assert.equal(retargetedResult.coverage.ontologyEntities.status, 'checked', retargetedResult.coverage.ontologyEntities.reason);

  const broken = actualV3();
  const brokenIndex = broken.ontologyIndex.value!;
  const owner = fk!.field!.split('.')[0];
  broken.ontologyIndex.value = {
    ...brokenIndex,
    relationships: brokenIndex.relationships.map(row => row.relationshipId === fk!.relationshipId
      ? { ...row, field: `${owner}.missingColumn` }
      : row),
  };
  const brokenResult = validateV3Candidate(broken, context);
  assert.equal(brokenResult.coverage.ontologyEntities.status, 'error');
  assert.ok(brokenResult.issues.some(issue => issue.code === 'NS5_ONTOLOGY_FK_FIELD_UNRESOLVED'));

  const table = createdIndex.entities.find(row => row.kind === 'entity');
  assert.ok(table);
  const frozen: Ns5OntologyV3PlanDraft = {
    moduleName: createdIndex.moduleName,
    businessDomain: createdIndex.businessDomain,
    entities: [{ entityId: table.entityId, kind: 'entity', family: 'ddm', title: 't', description: 'd', displayField: 'name' }],
    relationships: [],
    normalizations: [{ kind: 'tightened', entityId: table.entityId, detail: 'kept' }],
  };
  const files = created.entities.map(item => item.value).filter((item): item is Ns5OntologyEntityV3 => item !== null && isNs5OntologyEntityV3(item));
  const derived = deriveOntologyPlan(createdIndex, files, frozen);
  assert.equal(derived.entities.find(row => row.entityId === table.entityId)?.family, 'ddm');
  assert.equal(derived.normalizations?.[0]?.kind, 'tightened');
  const withFamily = validateV3Candidate(actualV3(), { ...context, ontologyPlan: frozen });
  const kept = withFamily.issues.some(issue => issue.code === 'NS5_ONTOLOGY_DDM_HAS_STATE' || issue.code === 'NS5_ONTOLOGY_DDM_UNIQUE_KEY');
  assert.equal(kept, true);
});
