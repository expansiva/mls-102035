/// <mls fileReference="_102035_/l2/newRelease/widgets/accessModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5AccessArtifact, Ns5OntologyEntityArtifact, Ns5OntologyIndexArtifact } from '../../solution/types.js';
import {
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
