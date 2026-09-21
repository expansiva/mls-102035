/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/reconcile30/reconcile30.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadNs5Access, loadNs5Defs, loadNs5Entities, loadNs5Integration, loadNs5JourneyIndex, loadNs5Journeys,
  loadNs5Module, loadNs5OntologyIndex, loadNs5Rules, loadNs5Workflows,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import type { Ns5AccessArtifact, Ns5OntologyAnyEntity, Ns5OntologyIndexV3, Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';
import { reconcile30Private } from './reconcile30.js';

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function inventory(moduleName = 'agendaClinica'): Record<string, unknown> {
  const result: Record<string, unknown> = {
    'module.defs.ts': loadNs5Module(moduleName),
    'journeys/index.defs.ts': loadNs5JourneyIndex(moduleName),
    'ontology/index.defs.ts': loadNs5OntologyIndex(moduleName),
    'rules.defs.ts': loadNs5Rules(moduleName),
    'workflows.defs.ts': loadNs5Workflows(moduleName),
    'access.defs.ts': loadNs5Access(moduleName),
    'integration.defs.ts': loadNs5Integration(moduleName),
  };
  for (const journey of loadNs5Journeys(moduleName)) result[`journeys/${journey.journeyId}.defs.ts`] = journey;
  for (const entity of loadNs5Entities(moduleName)) result[`ontology/${entity.entityId}.defs.ts`] = entity;
  return result;
}

const context = { v2: { registryModuleNames: ['agendaClinica'] } };

function v3Inventory(): Record<string, unknown> {
  const result = inventory();
  const index = loadNs5Defs<Ns5OntologyIndexV3>('steps/ontology30/fixtures', 'agendaClinica-v3', 'index.defs.ts');
  result['ontology/index.defs.ts'] = index;
  for (const path of Object.keys(result)) if (path.startsWith('ontology/') && path !== 'ontology/index.defs.ts') delete result[path];
  for (const row of index.entities) result[`ontology/${row.entityId}.defs.ts`] =
    loadNs5Defs<Ns5OntologyAnyEntity>('steps/ontology30/fixtures', 'agendaClinica-v3', `${row.entityId}.defs.ts`);
  return result;
}

test('reconcile30 treats a textual rule edit as requiring no dependency mutation', async () => {
  const base = inventory();
  const proposal = clone(base);
  const rules = proposal['rules.defs.ts'] as ReturnType<typeof loadNs5Rules>;
  rules.rules[0].description = `${rules.rules[0].description} Clarified.`;
  const before = JSON.stringify(proposal);
  const result = await reconcile30Private(base, proposal, context);
  assert.equal(result.status, 'ready', result.clarification);
  assert.deepEqual(result.directAreas, ['rules']);
  assert.deepEqual(result.dependencyAreas, ['rules']);
  assert.deepEqual(result.mutations, []);
  assert.equal(JSON.stringify(proposal), before);
  assert.deepEqual(result.draft['module.defs.ts'], proposal['module.defs.ts']);
});

test('reconcile30 reports a broken workflow reference instead of inventing a task', async () => {
  const base = inventory();
  const proposal = clone(base);
  const workflows = proposal['workflows.defs.ts'] as Ns5WorkflowsArtifact;
  workflows.processes[0].tasks[0].next = ['missingTask'];
  const result = await reconcile30Private(base, proposal, context);
  assert.equal(result.status, 'clarification');
  assert.ok(result.diagnostics.some(item => item.area === 'workflows' && item.status === 'clarification'));
  assert.ok(result.clarification.includes('workflows'));
  assert.deepEqual(result.mutations, []);
  assert.deepEqual(result.draft, proposal);
  assert.deepEqual((result.draft['workflows.defs.ts'] as Ns5WorkflowsArtifact).processes[0].tasks[0].next, ['missingTask']);
});

test('reconcile30 preserves unaffected content around a structural access defect', async () => {
  const base = inventory();
  const proposal = clone(base);
  const access = proposal['access.defs.ts'] as Ns5AccessArtifact;
  access.grants[0].entityRefs = ['UnknownEntity'];
  const unchangedModule = clone(proposal['module.defs.ts']);
  const result = await reconcile30Private(base, proposal, context);
  assert.equal(result.status, 'clarification');
  assert.deepEqual(result.mutations, []);
  assert.deepEqual(result.draft['module.defs.ts'], unchangedModule);
  assert.deepEqual((result.draft['access.defs.ts'] as Ns5AccessArtifact).grants[0].entityRefs, ['UnknownEntity']);
});

test('reconcile30 returns unsupported when an affected area lacks real validation context', async () => {
  const base = v3Inventory();
  const proposal = clone(base);
  (proposal['ontology/Consulta.defs.ts'] as { title: string }).title = 'Appointment';
  const result = await reconcile30Private(base, proposal, {});
  assert.equal(result.status, 'unsupported');
  assert.ok(result.diagnostics.some(item => item.area === 'ontologyAssembly' && item.status === 'unsupported'));
  assert.deepEqual(result.mutations, []);
  assert.deepEqual(result.draft, proposal);
});
