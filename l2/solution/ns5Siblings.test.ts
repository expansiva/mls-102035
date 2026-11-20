/// <mls fileReference="_102035_/l2/solution/ns5Siblings.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { emptyNs4SolutionRegistry, upsertNs4SolutionRegistryModule, buildNs4SolutionRegistryModuleBlock } from '/_102035_/l2/solution/helpers/organizationRegistry.js';
import { integrationFile } from '/_102035_/l2/solution/fs.js';
import { readNs5SiblingSystems, readSiblingSystems, formatNs5Siblings, ns5SiblingsFromRegistry, type Ns5SiblingModule } from '/_102035_/l2/solution/ns5Siblings.js';

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

function sibling(moduleName: string): Ns5SiblingModule {
  return { moduleName, roles: [], entities: [], events: [] };
}

void test('readNs5SiblingSystems skips a missing sibling, errors on an unreadable file, and keeps a declared system', async () => {
  const files: Record<string, { project: number; level: number; folder: string; shortName: string; extension: string; status: string; getContent: () => Promise<string> }> = {};
  const before = { files: mls.stor.files, getKey: mls.stor.getKeyToFile, project: mls.actualProject };
  mls.actualProject = 102047;
  mls.stor.getKeyToFile = ((info: { project?: number; level?: number; folder?: string; shortName?: string; extension?: string }) =>
    [info.project, info.level, info.folder, info.shortName, info.extension].join('|')) as typeof mls.stor.getKeyToFile;
  mls.stor.files = files as unknown as typeof mls.stor.files;
  const put = (moduleName: string, content: string, status = 'changed') => {
    const info = integrationFile(moduleName);
    files[mls.stor.getKeyToFile(info)] = { ...info, status, getContent: async () => content };
  };
  try {
    put('repoHost', 'export const repoHostIntegration = { "externalSystems": [{ "id": "github", "description": "Git", "operations": [] }] };\n');
    put('broken', 'export const brokenIntegration = {');
    const read = await readNs5SiblingSystems([sibling('conteudo'), sibling('repoHost'), sibling('broken')]);
    assert.deepEqual(read.groups.map(group => group.moduleName), ['repoHost']);
    assert.deepEqual(read.groups[0].systems.map(system => system.id), ['github']);
    assert.deepEqual(read.errors, [{ path: 'l4/broken/integration.defs.ts', message: 'Invalid integration artifact' }]);
    await assert.rejects(() => readSiblingSystems([sibling('broken')]), /l4\/broken\/integration\.defs\.ts: Invalid integration artifact/);
    put('gone', 'export const goneIntegration = { "externalSystems": [] };\n', 'deleted');
    const skipped = await readNs5SiblingSystems([sibling('conteudo'), sibling('gone')]);
    assert.deepEqual(skipped, { groups: [], errors: [] });
  } finally {
    mls.stor.files = before.files;
    mls.stor.getKeyToFile = before.getKey;
    mls.actualProject = before.project;
  }
});
