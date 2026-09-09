/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationRegistry.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNs4SolutionRegistryModuleBlock,
  emptyNs4SolutionRegistry,
  serializeNs4SolutionRegistry,
  upsertNs4SolutionRegistryModule,
} from '/_102035_/l2/agentNewSolution/helpers/organizationRegistry.js';
import { validateNs4SolutionRegistry } from '/_102035_/l2/agentNewSolution/helpers/registryGate.js';
import { ns4Level1Subtypes } from '/_102035_/l2/agentNewSolution/helpers/level1Catalog.js';
import type { Ns4SolutionRegistryModule } from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

const SUBTYPES = ns4Level1Subtypes();

function moduleA(updatedAt = '2026-09-08T10:00:00.000Z'): Ns4SolutionRegistryModule {
  return buildNs4SolutionRegistryModuleBlock({
    moduleName: 'moduleOne',
    actors: [{ actorId: 'clerk', kind: 'internal' }, { actorId: 'customer', kind: 'external' }],
    entities: [
      { entityId: 'Party', kind: 'mdm', party: 'person', storage: { target: 'mdm', mdmType: 'moduleOne.Party' } },
      { entityId: 'Ticket', kind: 'core', party: 'none', storage: { target: 'moduleDatabase' } },
    ],
    updatedAt,
  });
}

function moduleB(): Ns4SolutionRegistryModule {
  return buildNs4SolutionRegistryModuleBlock({
    moduleName: 'moduleTwo',
    actors: [{ actorId: 'customer', kind: 'external' }, { actorId: 'admin', kind: 'internal' }],
    entities: [
      { entityId: 'Party', kind: 'mdm', party: 'person', storage: { target: 'mdm', mdmType: 'moduleTwo.Party' } },
      { entityId: 'Firm', kind: 'mdm', party: 'organization', storage: { target: 'mdm', mdmType: 'moduleTwo.Firm' } },
    ],
    updatedAt: '2026-09-08T11:00:00.000Z',
  });
}

test('empty registry is the first-module starting point', () => {
  const empty = emptyNs4SolutionRegistry();
  assert.deepEqual(empty.modules, []);
  assert.equal(validateNs4SolutionRegistry(empty, SUBTYPES).ok, true);
});

test('rewriting the first module block leaves the second byte-identical', () => {
  const first = moduleA();
  const second = moduleB();
  const withBoth = upsertNs4SolutionRegistryModule(upsertNs4SolutionRegistryModule(emptyNs4SolutionRegistry(), first), second);
  const rewritten = moduleA('2026-09-08T12:00:00.000Z');
  const after = upsertNs4SolutionRegistryModule(withBoth, rewritten);
  assert.equal(after.modules[1], withBoth.modules[1]);
  const beforeJson = serializeNs4SolutionRegistry(withBoth);
  const afterJson = serializeNs4SolutionRegistry(after);
  assert.deepEqual(JSON.parse(afterJson).modules[1], JSON.parse(beforeJson).modules[1]);
  assert.deepEqual(JSON.parse(afterJson).modules[1], second);
  assert.notEqual(beforeJson, afterJson);
  assert.equal(after.modules[0].updatedAt, '2026-09-08T12:00:00.000Z');
  assert.deepEqual(after.modules[1], second);
});

test('registry gate rejects a duplicate module, duplicate role and unknown subtype', () => {
  const block = moduleA();
  const duplicateModule = upsertNs4SolutionRegistryModule(emptyNs4SolutionRegistry(), block);
  duplicateModule.modules.push({ ...block });
  assert.ok(validateNs4SolutionRegistry(duplicateModule, SUBTYPES).issues.some(issue => issue.code === 'NS4_REGISTRY_DUPLICATE_MODULE'));

  const badSubtype = { ...block, roles: [{ mdmSubtype: 'Unknown', role: 'moduleOne.X', namespace: 'moduleOne' }] };
  assert.ok(validateNs4SolutionRegistry(
    { ...emptyNs4SolutionRegistry(), modules: [badSubtype] },
    SUBTYPES,
  ).issues.some(issue => issue.code === 'NS4_REGISTRY_UNKNOWN_SUBTYPE'));
});

test('party none MDM is omitted until a structural subtype exists', () => {
  const block = buildNs4SolutionRegistryModuleBlock({
    moduleName: 'moduleOne',
    actors: [{ actorId: 'clerk', kind: 'internal' }],
    entities: [
      { entityId: 'CatalogItem', kind: 'mdm', party: 'none', storage: { target: 'mdm', mdmType: 'moduleOne.CatalogItem' } },
    ],
    updatedAt: '2026-09-08T10:00:00.000Z',
  });
  assert.deepEqual(block.roles, []);

  const withSubtype = buildNs4SolutionRegistryModuleBlock({
    moduleName: 'moduleOne',
    actors: [{ actorId: 'clerk', kind: 'internal' }],
    entities: [
      {
        entityId: 'CatalogItem', kind: 'mdm', party: 'none', mdmSubtype: 'Product',
        storage: { target: 'mdm', mdmType: 'moduleOne.CatalogItem' },
      },
    ],
    updatedAt: '2026-09-08T10:00:00.000Z',
  });
  assert.deepEqual(withSubtype.roles, [
    { mdmSubtype: 'Product', role: 'moduleOne.CatalogItem', namespace: 'moduleOne' },
  ]);
});
