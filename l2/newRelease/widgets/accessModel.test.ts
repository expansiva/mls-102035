/// <mls fileReference="_102035_/l2/newRelease/widgets/accessModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5AccessArtifact, Ns5OntologyEntityArtifact, Ns5OntologyIndexArtifact } from '../../solution/types.js';
import {
  accessMatrixRows,
  accessTextNodes,
  patchAccessActor,
  patchAccessGrant,
  accessAnchorPath,
  accessFieldRefs,
  accessFieldLabel,
  bestAccessGrant,
  newAccessGrant,
  reachablePersonAnchors,
} from './accessModel.js';

const access: Ns5AccessArtifact = {
  schemaVersion: 3,
  moduleName: 'orders',
  actors: [{ actorId: 'agent', kind: 'internal', origin: 'named', title: 'Agent', description: 'Handles orders.' }],
  grants: [
    {
      grantId: 'agentOwn', actorRef: 'agent', title: 'Own', description: 'Own orders.', entityRefs: ['Order'],
      dataScope: { mode: 'own', anchorEntity: 'Customer', description: 'Only own orders.' },
      disclosure: { mode: 'fullRecord', description: 'Every field.' },
    },
    {
      grantId: 'agentOrganization', actorRef: 'agent', title: 'Organization', description: 'All orders.', entityRefs: ['Order'],
      dataScope: { mode: 'organization', description: 'Organization orders.' },
      disclosure: { mode: 'fieldsOnly', deniedFields: ['Order.secret'], description: 'Without secrets.' },
    },
  ],
};

const index: Ns5OntologyIndexArtifact = {
  schemaVersion: 3,
  moduleName: 'orders',
  businessDomain: 'Orders',
  entities: ['Order', 'Customer'],
  relationships: [{
    relationshipId: 'orderCustomer', fromEntity: 'Order', toEntity: 'Customer', type: 'manyToOne', required: true,
    description: 'Order customer.', persistence: { mode: 'moduleReference' },
  }],
};

function entity(entityId: string, party: Ns5OntologyEntityArtifact['party']): Ns5OntologyEntityArtifact {
  return {
    schemaVersion: 3, moduleName: 'orders', entityId, title: entityId, description: entityId,
    kind: 'core', party, displayField: 'name',
    fields: [
      { fieldId: 'name', title: 'Name', type: 'string', required: true, description: 'Name.' },
      { fieldId: 'secret', title: 'Secret', type: 'string', required: false, description: 'Secret.' },
    ],
    details: { score: { type: 'number', description: 'Score.' } },
    lifecycleStates: [], transitions: [],
    storage: { target: 'moduleDatabase', scope: 'orders', idField: 'id' },
  };
}

test('matrix chooses the broadest effective grant for an actor and entity', () => {
  assert.equal(bestAccessGrant(access.grants, 'agent', 'Order')?.grantId, 'agentOrganization');
  assert.equal(bestAccessGrant(access.grants, 'agent', 'Customer'), null);
});

test('person anchors require a path through required relationships', () => {
  assert.deepEqual(accessAnchorPath('Order', 'Customer', index), {
    entityId: 'Order', entities: ['Order', 'Customer'], relationships: ['orderCustomer'],
  });
  assert.deepEqual(reachablePersonAnchors(['Order'], [entity('Order', 'none'), entity('Customer', 'person')], index)
    .map(item => item.entityId), ['Customer']);
  assert.deepEqual(reachablePersonAnchors(['Order'], [entity('Customer', 'person')], { ...index, relationships: [] }), []);
});

test('field choices and new grants are constrained to the selected entity', () => {
  const order = {
    ...entity('Order', 'none'),
    fieldsBase: [{ fieldId: 'docId', title: 'Document', type: 'string', required: true, description: 'Document.' }],
  } satisfies Ns5OntologyEntityArtifact;
  const fields = accessFieldRefs(access.grants[0], [order, entity('Customer', 'person')]);
  assert.deepEqual(fields, ['Order.id', 'Order.name', 'Order.secret', 'Order.docId', 'Order.details.score']);
  assert.equal(accessFieldLabel('Order.docId', [order]), 'Document');
  assert.equal(accessFieldLabel('Order.name', [order]), 'Name');
  const grant = newAccessGrant(access, access.actors[0], 'Customer', {
    title: 'New access', description: 'Review this grant.', scopeDescription: 'Organization data.', disclosureDescription: 'Full record.',
  });
  assert.equal(grant.grantId, 'agentAcessoCustomer');
  assert.deepEqual(grant.entityRefs, ['Customer']);
  assert.equal(grant.dataScope.mode, 'organization');
  assert.equal(grant.disclosure.mode, 'fullRecord');
});


test('matrix keeps separate overlapping grants and marks only the declared actor', () => {
  const source = structuredClone(access);
  source.actors.push({ ...source.actors[0], actorId: 'manager', title: 'Manager' });
  source.grants.push({ ...source.grants[0], grantId: 'unknown', actorRef: 'missing' });
  const before = structuredClone(source);
  assert.deepEqual(accessMatrixRows(source).map(row => [row.grant.grantId, row.cells]), [
    ['agentOwn', [true, false]], ['agentOrganization', [true, false]], ['unknown', [false, false]],
  ]);
  const nodes = accessTextNodes(source, 'Unknown role');
  assert.deepEqual(nodes[0].children.map(node => node.id), ['grant:agentOwn', 'grant:agentOrganization']);
  assert.equal(nodes[1].children.length, 0);
  assert.equal(nodes[2].children[0].id, 'grant:unknown');
  assert.deepEqual(source, before);
});

test('property edits protect identities and preserve other rows and nested values', () => {
  const before = structuredClone(access);
  const actor = patchAccessActor(access, 'agent', { title: 'Operator', origin: 'inferred', personEntity: 'Customer', actorId: 'forged' } as {title: string});
  assert.equal(actor.actors[0].actorId, 'agent');
  assert.equal(actor.actors[0].personEntity, 'Customer');
  assert.deepEqual(actor.grants, access.grants);
  const grant = patchAccessGrant(actor, 'agentOwn', { title: 'Changed', actorRef: 'manager', grantId: 'forged' } as {title: string});
  assert.equal(grant.grants[0].grantId, 'agentOwn');
  assert.equal(grant.grants[0].actorRef, 'manager');
  assert.deepEqual(grant.grants[0].dataScope, access.grants[0].dataScope);
  assert.deepEqual(grant.grants[0].disclosure, access.grants[0].disclosure);
  assert.deepEqual(grant.grants[1], access.grants[1]);
  assert.deepEqual(access, before);
});

test('v3 nested disclosure fields and required person paths are available', () => {
  const order: import('../../solution/types.js').Ns5OntologyEntityV3 = {
    schemaVersion: '2026-09-15-ns5-ontology-v3', moduleName: 'orders', entityId: 'Order', title: 'Order', description: '',
    kind: 'entity', class: 'core', storage: {target: 'moduleDatabase', table: 'order'}, displayField: 'details.customer.name',
    record: { fields: { id: { type: 'uuid' }, details: { type: 'object', fields: { customer: {type: 'object', fields: {name: {type: 'string', title: 'Customer name'}}} } } } },
    relationships: {}, capabilities: {}, rules: [],
  };
  const customer: import('../../solution/types.js').Ns5OntologyEntityV3 = {
    schemaVersion: '2026-09-15-ns5-ontology-v3', moduleName: 'orders', entityId: 'Customer', title: 'Customer', description: '',
    kind: 'role', subtype: 'Person', source: '/platform', roleTag: 'orders.Customer', displayField: 'id',
    record: {fields: {id: {type: 'uuid'}}}, relationships: {}, capabilities: {}, rules: [],
  };
  const v3Index: import('../../solution/types.js').Ns5OntologyIndexV3 = {
    schemaVersion: '2026-09-15-ns5-ontology-v3', moduleName: 'orders', businessDomain: 'Orders', platformOntology: '/platform',
    moduleNamespace: { key: 'orders', description: '' }, entities: [{entityId: 'Order', kind: 'entity'}, {entityId: 'Customer', kind: 'role'}],
    relationships: [{relationshipId: 'customer', from: 'Order', to: 'Customer', required: true, mode: 'fk', type: 'manyToOne', description: ''}],
  };
  assert.ok(accessFieldRefs(access.grants[0], [order, customer]).includes('Order.details.customer.name'));
  assert.equal(accessFieldLabel('Order.details.customer.name', [order]), 'Customer name');
  assert.deepEqual(reachablePersonAnchors(['Order'], [order, customer], v3Index).map(entity => entity.entityId), ['Customer']);
  assert.deepEqual(accessAnchorPath('Order', 'Customer', v3Index)?.relationships, ['customer']);
  assert.deepEqual(reachablePersonAnchors(['Order'], [order, customer], {...v3Index, relationships: [{...v3Index.relationships[0], required: false}]}), []);
});


test('clearing the optional person entity removes the key and preserves all other data', () => {
  const source = structuredClone(access);
  source.actors[0].personEntity = 'Customer';
  source.actors.push({ ...source.actors[0], actorId: 'manager' });
  const before = structuredClone(source);
  const result = patchAccessActor(source, 'agent', { personEntity: '' });
  assert.equal(Object.hasOwn(result.actors[0], 'personEntity'), false);
  const { personEntity, ...expected } = source.actors[0];
  assert.deepEqual(result.actors[0], expected);
  assert.deepEqual(result.actors[1], source.actors[1]);
  assert.deepEqual(result.grants, source.grants);
  assert.deepEqual(patchAccessActor(source, 'agent', { title: 'Renamed' }).actors[0].personEntity, 'Customer');
  assert.deepEqual(source, before);
});
