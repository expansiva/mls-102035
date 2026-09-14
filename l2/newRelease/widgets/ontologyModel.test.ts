/// <mls fileReference="_102035_/l2/newRelease/widgets/ontologyModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5OntologyEntityArtifact, Ns5OntologyIndexArtifact } from '../../solution/types.js';
import {
  buildOntologyGraph,
  ontologyFieldCounts,
  ontologyResolvableFields,
  removeOntologyState,
  sanitizeOntologyConstraints,
  updateOntologyField,
  updateOntologyRelationship,
} from './ontologyModel.js';

const entity = (entityId: string, kind: Ns5OntologyEntityArtifact['kind']): Ns5OntologyEntityArtifact => ({
  schemaVersion: '2026-09-11-ns5-ontology-v2',
  moduleName: 'compras',
  entityId,
  title: entityId,
  description: `Entidade ${entityId}`,
  kind,
  party: 'none',
  displayField: 'id',
  fields: [{ fieldId: 'id', title: 'Id', type: 'uuid', required: true, description: 'Id' }],
  lifecycleStates: [{ state: 'open', reachedBy: 'actor' }, { state: 'closed', reachedBy: 'actor' }],
  transitions: [{ transitionId: 'close', from: ['open'], to: 'closed', by: ['buyer'], description: 'Close' }],
  storage: { target: 'moduleDatabase', scope: 'module', idField: 'id' },
});

const index: Ns5OntologyIndexArtifact = {
  schemaVersion: '2026-09-11-ns5-ontology-v2',
  moduleName: 'compras',
  businessDomain: 'Compras',
  entities: ['Order', 'Supplier'],
  relationships: [{
    relationshipId: 'orderSupplier', fromEntity: 'Order', toEntity: 'Supplier', type: 'manyToOne',
    required: true, description: 'Fornecedor do pedido', persistence: { mode: 'moduleReference' },
    realization: {
      kind: 'fieldReference', ownerEntity: 'Order',
      from: { entityId: 'Order', fieldIds: ['supplierId'] }, to: { entityId: 'Supplier', fieldIds: ['id'] },
    },
  }],
};

test('ontology graph derives one node per entity and one cardinality-labelled link', () => {
  const supplier = {
    ...entity('Supplier', 'mdm'),
    displayField: 'name',
    fieldsBase: [{ fieldId: 'name', title: 'Name', type: 'string', required: true, description: 'Name' }],
  } satisfies Ns5OntologyEntityArtifact;
  const graph = buildOntologyGraph(index, [entity('Order', 'core'), supplier], ['#1', '#2']);
  assert.deepEqual(graph.nodes.map(node => node.id), ['Order', 'Supplier']);
  assert.equal(graph.nodes[1].category, 1);
  assert.deepEqual(graph.links.map(link => [link.source, link.target, link.value]), [['Order', 'Supplier', 'N:1']]);
  assert.equal(graph.categories[1].name, 'mdm');
  assert.deepEqual(graph.nodes[1].baseFields, ['name']);
  assert.equal(graph.nodes[1].displayField, 'name');
});

test('field helpers keep namespace and master-data fields separate while resolving both', () => {
  const supplier = {
    ...entity('Supplier', 'mdm'),
    fieldsBase: [{ fieldId: 'name', title: 'Name', type: 'string', required: true, description: 'Name' }],
  } satisfies Ns5OntologyEntityArtifact;
  assert.deepEqual(ontologyFieldCounts(supplier), { namespace: 1, base: 1, total: 2 });
  assert.deepEqual(ontologyResolvableFields(supplier).map(field => field.fieldId), ['id', 'name']);
});

test('editing one entity and one relationship preserves unrelated artifacts', () => {
  const order = entity('Order', 'core');
  const supplier = entity('Supplier', 'mdm');
  const changed = updateOntologyField(order, 'id', { title: 'Identifier' });
  assert.equal(changed.fields[0].title, 'Identifier');
  assert.equal(supplier.fields[0].title, 'Id');

  const other = { ...index.relationships[0], relationshipId: 'supplierParent' };
  const indexWithOther = { ...index, relationships: [...index.relationships, other] };
  const changedIndex = updateOntologyRelationship(indexWithOther, 'orderSupplier', { required: false });
  assert.equal(changedIndex.relationships[0].required, false);
  assert.equal(index.relationships[0].required, true);
  assert.deepEqual(changedIndex.relationships[1], other);
  assert.deepEqual(supplier, entity('Supplier', 'mdm'));
});

test('type changes remove incompatible constraints and state removal drops dangling transitions', () => {
  assert.deepEqual(sanitizeOntologyConstraints('string', { min: 1, maxLength: 20, precision: 2 }), { maxLength: 20 });
  const changed = removeOntologyState(entity('Order', 'core'), 'closed');
  assert.deepEqual(changed.lifecycleStates.map(item => item.state), ['open']);
  assert.equal(changed.transitions.length, 0);
});

test('seven entities and ten relationships build well below the 300 ms interaction budget', () => {
  const entities = Array.from({ length: 7 }, (_, position) => entity(`Entity${position + 1}`, position % 2 ? 'supporting' : 'core'));
  const relationships = Array.from({ length: 10 }, (_, position) => ({
    ...index.relationships[0],
    relationshipId: `relationship${position + 1}`,
    fromEntity: entities[position % entities.length].entityId,
    toEntity: entities[(position + 1) % entities.length].entityId,
  }));
  const started = performance.now();
  const graph = buildOntologyGraph({ ...index, entities: entities.map(item => item.entityId), relationships }, entities, ['#1', '#2']);
  const elapsed = performance.now() - started;
  assert.equal(graph.nodes.length, 7);
  assert.equal(graph.links.length, 10);
  assert.ok(elapsed < 300, `graph model took ${elapsed.toFixed(2)} ms`);
});
