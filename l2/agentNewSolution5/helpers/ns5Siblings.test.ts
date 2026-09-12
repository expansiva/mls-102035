/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Siblings.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { emptyNs4SolutionRegistry, upsertNs4SolutionRegistryModule, buildNs4SolutionRegistryModuleBlock } from '/_102035_/l2/agentNewSolution/helpers/organizationRegistry.js';
import { formatNs5Siblings, ns5SiblingsFromRegistry } from '/_102035_/l2/agentNewSolution5/helpers/ns5Siblings.js';

void test('ns5SiblingsFromRegistry skips the current module and lists entities/events', () => {
  const comanda = buildNs4SolutionRegistryModuleBlock({
    moduleName: 'comandaRestaurante',
    actors: [{ actorId: 'caixa', kind: 'internal' }],
    entities: [{ entityId: 'Comanda', kind: 'core' }],
    events: [{ eventId: 'comandaFechada', on: 'Comanda.closeTab' }],
    updatedAt: '2026-09-12T00:00:00.000Z',
  });
  const financeiro = buildNs4SolutionRegistryModuleBlock({
    moduleName: 'financeiro',
    actors: [{ actorId: 'caixa', kind: 'internal' }],
    entities: [{ entityId: 'TituloReceber', kind: 'core' }],
    updatedAt: '2026-09-12T00:00:00.000Z',
  });
  const registry = upsertNs4SolutionRegistryModule(upsertNs4SolutionRegistryModule(emptyNs4SolutionRegistry(), comanda), financeiro);
  const siblings = ns5SiblingsFromRegistry(registry, 'financeiro');
  assert.deepEqual(siblings.map(item => item.moduleName), ['comandaRestaurante']);
  assert.deepEqual(siblings[0].events, [{ eventId: 'comandaFechada', on: 'Comanda.closeTab' }]);
  const text = formatNs5Siblings(siblings);
  assert.match(text, /comandaRestaurante/);
  assert.match(text, /Do not model an entity a sibling owns/);
  assert.match(text, /comandaFechada on Comanda.closeTab/);
});
