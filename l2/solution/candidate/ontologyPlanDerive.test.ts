/// <mls fileReference="_102035_/l2/solution/candidate/ontologyPlanDerive.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveOntologyPlan } from '/_102035_/l2/solution/candidate/ontologyPlanDerive.js';
import type { Ns5OntologyV3PlanDraft } from '/_102035_/l2/solution/gates/ontology30/contractsV3.js';
import type { Ns5OntologyEntityV3, Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

const index = {
  schemaVersion: 'v3',
  moduleName: 'sala',
  businessDomain: 'Mesas',
  platformOntology: 'mdm',
  moduleNamespace: { key: 'sala', description: 'Sala' },
  entities: [
    { entityId: 'Mesa', kind: 'entity', class: 'core' },
    { entityId: 'Garcom', kind: 'role', subtype: 'person' },
    { entityId: 'SemArquivo', kind: 'entity', class: 'supporting' },
  ],
  relationships: [{
    relationshipId: 'mesaGarcom', from: 'Mesa', to: 'Garcom', type: 'manyToOne', required: true,
    mode: 'fk', field: 'Mesa.garcomId', description: 'Quem atende',
  }, {
    relationshipId: 'mesaItens', from: 'Mesa', to: 'Item', type: 'oneToMany', required: false,
    mode: 'throughTable', through: 'Item', description: 'Itens',
  }],
} as Ns5OntologyIndexV3;

const mesa = {
  entityId: 'Mesa', kind: 'entity', class: 'core', title: 'Mesa', description: 'Uma mesa',
  displayField: 'name', writer: 'crud', storage: { target: 'moduleDatabase', table: 'mesa', kind: 'relational' },
} as Ns5OntologyEntityV3;
const garcom = {
  entityId: 'Garcom', kind: 'role', title: 'Garçom', description: 'Quem atende', displayField: 'name',
} as Ns5OntologyEntityV3;

const frozen = {
  moduleName: 'sala',
  businessDomain: 'Outro',
  entities: [{ entityId: 'Mesa', kind: 'entity', family: 'ddm', title: 'old', description: 'old', displayField: 'old' }],
  relationships: [],
  normalizations: [{ kind: 'tightened', entityId: 'Mesa', detail: 'kept' }],
} as Ns5OntologyV3PlanDraft;

test('deriveOntologyPlan keeps frozen family and derives the rest from the edition', () => {
  const plan = deriveOntologyPlan(index, [mesa, garcom], frozen);
  assert.equal(plan.moduleName, 'sala');
  assert.equal(plan.businessDomain, 'Mesas');
  assert.equal(plan.entities.find(row => row.entityId === 'Mesa')?.family, 'ddm');
  assert.equal(plan.entities.find(row => row.entityId === 'Mesa')?.title, 'Mesa');
  assert.equal(plan.entities.find(row => row.entityId === 'Mesa')?.storage?.table, 'mesa');
  assert.equal(plan.entities.find(row => row.entityId === 'Garcom')?.family, 'mdm');
  assert.equal(plan.entities.some(row => row.entityId === 'SemArquivo'), false);
  assert.equal(plan.relationships[0]?.field, 'Mesa.garcomId');
  assert.equal(plan.relationships[1]?.through, 'Item');
  assert.equal(plan.normalizations?.[0]?.detail, 'kept');

  const open = deriveOntologyPlan(index, [mesa, garcom], null);
  assert.equal(open.entities.find(row => row.entityId === 'Mesa')?.family, 'tdm');
  assert.deepEqual(open.normalizations, []);

  const edited = deriveOntologyPlan({
    ...index,
    relationships: index.relationships.map(row => row.relationshipId === 'mesaGarcom' ? { ...row, mode: 'throughTable' as const, through: 'Item' } : row),
  }, [mesa, garcom], frozen);
  assert.equal(edited.relationships.find(row => row.relationshipId === 'mesaGarcom')?.mode, 'throughTable');
});
