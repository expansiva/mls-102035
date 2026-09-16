/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationRegistry.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import mdm from '/_102034_/l4/ontology/mdm.defs.js';
import agendaClinicaPaciente from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/Paciente.defs.js';
import { ns5OntologyEntityView } from '/_102035_/l2/solution/ontologyView.js';
import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';
import {
  buildNs4SolutionRegistryModuleBlock,
  emptyNs4SolutionRegistry,
  NS4_REGISTRY_LEVEL1_SCHEMA_VERSION,
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

  const badSubtype = { ...block, roles: [{ subtype: 'Unknown', roleTag: 'moduleOne.X', namespace: 'moduleOne' }] };
  assert.ok(validateNs4SolutionRegistry(
    { ...emptyNs4SolutionRegistry(), modules: [badSubtype] },
    SUBTYPES,
  ).issues.some(issue => issue.code === 'NS4_REGISTRY_UNKNOWN_SUBTYPE'));
});

test('module block lists entities and outbound events for siblings', () => {
  const block = buildNs4SolutionRegistryModuleBlock({
    moduleName: 'comandaRestaurante',
    actors: [{ actorId: 'caixa', kind: 'internal' }],
    entities: [
      { entityId: 'Comanda', kind: 'core', party: 'none', storage: { target: 'moduleDatabase' } },
      { entityId: 'ItemCardapio', kind: 'mdm', party: 'none', mdmSubtype: 'Product', storage: { target: 'mdm', mdmType: 'comandaRestaurante.ItemCardapio' } },
    ],
    events: [{ eventId: 'comandaFechada', on: 'Comanda.closeTab' }, { eventId: 'comandaFechada', on: 'Comanda.closeTab' }],
    updatedAt: '2026-09-12T10:00:00.000Z',
  });
  assert.deepEqual(block.entities, [
    { entityId: 'Comanda', kind: 'core' },
    { entityId: 'ItemCardapio', kind: 'mdm', mdmSubtype: 'Product' },
  ]);
  assert.deepEqual(block.events, [{ eventId: 'comandaFechada', on: 'Comanda.closeTab' }]);
  assert.equal(validateNs4SolutionRegistry({ ...emptyNs4SolutionRegistry(), modules: [block] }, SUBTYPES).ok, true);
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
  // ns5_43 T4: the registry names a papel the way the v3 ontology does.
  assert.deepEqual(withSubtype.roles, [
    { subtype: 'Product', roleTag: 'moduleOne.CatalogItem', namespace: 'moduleOne' },
  ]);
});

void test('a v3 role becomes a registry papel with its own subtype and roleTag (ns5_43 T4)', () => {
  const view = ns5OntologyEntityView(agendaClinicaPaciente as unknown as Ns5OntologyEntityV3);
  const block = buildNs4SolutionRegistryModuleBlock({
    moduleName: 'agendaClinica',
    actors: [{ actorId: 'recepcionista', kind: 'internal' }],
    entities: [{
      entityId: view.entityId,
      kind: view.kind,
      class: view.writerKind,
      party: view.party,
      mdmSubtype: view.mdmSubtype,
      roleTag: (agendaClinicaPaciente as unknown as { roleTag: string }).roleTag,
    }],
    updatedAt: '2026-09-15T00:00:00.000Z',
  });
  assert.deepEqual(block.roles, [
    { subtype: 'Person', roleTag: 'agendaClinica.Paciente', namespace: 'agendaClinica' },
  ]);
  assert.deepEqual(block.entities, [
    { entityId: 'Paciente', kind: 'role', mdmSubtype: 'Person', class: 'mdm' },
  ]);
});

void test('the registry states the level-1 it was written against (ns5_43 T4)', () => {
  assert.equal(emptyNs4SolutionRegistry().level1SchemaVersion, mdm.schemaVersion);
  assert.equal(NS4_REGISTRY_LEVEL1_SCHEMA_VERSION, mdm.schemaVersion);
});
