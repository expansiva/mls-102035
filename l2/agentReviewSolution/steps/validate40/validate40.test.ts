/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/validate40/validate40.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { mdm } from '/_102034_/l4/ontology/mdm.defs.js';
import { tdm } from '/_102034_/l4/ontology/tdm.defs.js';
import { ddm } from '/_102034_/l4/ontology/ddm.defs.js';
import {
  loadNs5Access, loadNs5Defs, loadNs5Entities, loadNs5Integration, loadNs5JourneyIndex,
  loadNs5Journeys, loadNs5Module, loadNs5OntologyIndex, loadNs5Rules, loadNs5Workflows,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import type { Ns5AccessArtifact, Ns5OntologyAnyEntity, Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';
import { validate40Private } from './validate40.js';

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function commonInventory(moduleName = 'agendaClinica'): Record<string, unknown> {
  const inventory: Record<string, unknown> = {
    'module.defs.ts': loadNs5Module(moduleName),
    'journeys/index.defs.ts': loadNs5JourneyIndex(moduleName),
    'ontology/index.defs.ts': loadNs5OntologyIndex(moduleName),
    'rules.defs.ts': loadNs5Rules(moduleName),
    'workflows.defs.ts': loadNs5Workflows(moduleName),
    'access.defs.ts': loadNs5Access(moduleName),
    'integration.defs.ts': loadNs5Integration(moduleName),
  };
  for (const journey of loadNs5Journeys(moduleName)) inventory[`journeys/${journey.journeyId}.defs.ts`] = journey;
  for (const entity of loadNs5Entities(moduleName)) inventory[`ontology/${entity.entityId}.defs.ts`] = entity;
  return inventory;
}

function v3Inventory(): Record<string, unknown> {
  const inventory = commonInventory();
  const index = loadNs5Defs<Ns5OntologyIndexV3>('steps/ontology30/fixtures', 'agendaClinica-v3', 'index.defs.ts');
  inventory['ontology/index.defs.ts'] = index;
  for (const path of Object.keys(inventory)) if (path.startsWith('ontology/') && path !== 'ontology/index.defs.ts') delete inventory[path];
  for (const row of index.entities) inventory[`ontology/${row.entityId}.defs.ts`] =
    loadNs5Defs<Ns5OntologyAnyEntity>('steps/ontology30/fixtures', 'agendaClinica-v3', `${row.entityId}.defs.ts`);
  // The recorded access fixture predates v3 record paths. Full-record disclosure is valid and avoids
  // repairing the unrelated fixture inside production validation code.
  const access = clone(inventory['access.defs.ts'] as Ns5AccessArtifact);
  access.grants[0].disclosure = { mode: 'fullRecord', description: 'Full operational record for this fixture.' };
  inventory['access.defs.ts'] = access;
  return inventory;
}

const requestKey = 'change-1/request-2';
const initialState = { requestKey, correctionAttemptsUsed: 0 };
const context = { v3: { mdm, tdm, ddm, registryModuleNames: ['agendaClinica'] }, v2: { registryModuleNames: ['agendaClinica'] } };

test('validate40 accepts a supported partial v3 change while reporting unrelated unsupported coverage', async () => {
  const base = v3Inventory();
  const proposal = clone(base);
  const rules = proposal['rules.defs.ts'] as ReturnType<typeof loadNs5Rules>;
  rules.rules[0].description = `${rules.rules[0].description} Clarified.`;
  const result = await validate40Private({ requestKey, state: initialState, base, proposal, context });
  assert.deepEqual(result.affectedAreas, ['rules']);
  assert.equal(result.validation?.coverage.rules.status, 'checked');
  assert.equal(result.validation?.coverage.ontologyEntities.status, 'unsupported');
  assert.equal(result.publishable, true, result.reasons.join('\n'));
  assert.equal(result.status, 'publishable');
  assert.equal(result.state.correctionAttemptsUsed, 0);
  assert.equal(result.mayCorrect, false);
});

test('validate40 keeps a v3 ontology draft when required plan coverage is unsupported', async () => {
  const base = v3Inventory();
  const proposal = clone(base);
  (proposal['ontology/Consulta.defs.ts'] as { title: string }).title = 'Appointment';
  const result = await validate40Private({ requestKey, state: initialState, base, proposal, context });
  assert.deepEqual(result.affectedAreas, ['ontologyAssembly', 'ontologyEntities']);
  assert.equal(result.validation?.coverage.ontologyEntities.status, 'unsupported');
  assert.equal(result.publishable, false);
  assert.equal(result.status, 'draft');
  assert.equal(result.state.correctionAttemptsUsed, 0);
  assert.equal(result.mayCorrect, false);
  assert.deepEqual(result.draft, proposal);
});

test('validate40 keeps a candidate with a gate error as a draft', async () => {
  const base = v3Inventory();
  const proposal = clone(base);
  (proposal['rules.defs.ts'] as ReturnType<typeof loadNs5Rules>).rules[0].description = '';
  const result = await validate40Private({ requestKey, state: initialState, base, proposal, context });
  assert.equal(result.validation?.coverage.rules.status, 'error');
  assert.equal(result.publishable, false);
  assert.equal(result.state.correctionAttemptsUsed, 0);
  assert.equal(result.mayCorrect, true);
  assert.ok(result.validation?.issues.some(issue => issue.severity === 'error'));
});

test('validate40 does not consume corrections for missing context or an operational exception', async () => {
  const base = v3Inventory();
  const proposal = clone(base);
  (proposal['ontology/Consulta.defs.ts'] as { title: string }).title = 'Appointment';
  const missing = await validate40Private({ requestKey, state: { requestKey, correctionAttemptsUsed: 1 }, base, proposal,
    context: { v3: { registryModuleNames: ['agendaClinica'] } } });
  assert.equal(missing.state.correctionAttemptsUsed, 1);
  assert.equal(missing.status, 'draft');
  assert.equal(missing.mayCorrect, false);

  const unsafe = { ...proposal, 'ontology/../Consulta.defs.ts': { title: 'unsafe' } };
  const exception = await validate40Private({ requestKey, state: { requestKey, correctionAttemptsUsed: 1 }, base, proposal: unsafe, context });
  assert.equal(exception.state.correctionAttemptsUsed, 1);
  assert.equal(exception.status, 'draft');
  assert.equal(exception.mayCorrect, false);
  assert.ok(exception.validation?.issues.some(issue => issue.code === 'REVIEW_VALIDATE40_EXCEPTION'));
});

test('validate40 observes correction limit without incrementing it and still recognizes a valid candidate at three', async () => {
  const base = v3Inventory();
  const invalid = clone(base);
  (invalid['rules.defs.ts'] as ReturnType<typeof loadNs5Rules>).rules[0].description = '';
  const atTwo = await validate40Private({ requestKey, state: { requestKey, correctionAttemptsUsed: 2 }, base, proposal: invalid, context });
  assert.equal(atTwo.state.correctionAttemptsUsed, 2);
  assert.equal(atTwo.status, 'draft');
  assert.equal(atTwo.mayCorrect, true);
  const stopped = await validate40Private({ requestKey, state: { requestKey, correctionAttemptsUsed: 3 }, base, proposal: invalid, context });
  assert.equal(stopped.status, 'attempt-limit');
  assert.equal(stopped.state.correctionAttemptsUsed, 3);
  assert.equal(stopped.mayCorrect, false);
  assert.ok(stopped.validation);
  assert.deepEqual(stopped.draft, invalid);

  const valid = clone(base);
  const rules = valid['rules.defs.ts'] as ReturnType<typeof loadNs5Rules>;
  rules.rules[0].description = `${rules.rules[0].description} Clarified.`;
  const recognized = await validate40Private({ requestKey, state: { requestKey, correctionAttemptsUsed: 3 }, base, proposal: valid, context });
  assert.equal(recognized.status, 'publishable', recognized.reasons.join('\n'));
  assert.equal(recognized.state.correctionAttemptsUsed, 3);
  assert.equal(recognized.mayCorrect, false);
  await assert.rejects(() => validate40Private({ requestKey, state: { requestKey: 'other', correctionAttemptsUsed: 0 }, base, proposal: valid, context }), /persisted request/);
});

test('validate40 preserves the existing v2 validator path', async () => {
  const base = commonInventory();
  const proposal = clone(base);
  (proposal['module.defs.ts'] as { title: string }).title = 'Appointment agenda';
  const result = await validate40Private({ requestKey, state: initialState, base, proposal, context });
  assert.equal(result.schemaFamily, 'v2');
  assert.deepEqual(result.affectedAreas, ['module']);
  assert.equal(result.validation?.coverage.module.status, 'checked');
  assert.equal(result.publishable, true, result.reasons.join('\n'));
});
