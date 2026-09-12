/// <mls fileReference="_102035_/l2/solution/removeModule.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { ns4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import type { Ns4SolutionRegistryArtifact } from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';
import { stripModuleFromJson, stripModuleFromRegistry } from '/_102035_/l2/solution/removeModule.js';

type StorInfo = {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
  status: string;
  getContent: () => Promise<string>;
  getValueInfo: () => Promise<{ content: string }>;
};

function keyOf(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function displayOf(info: { level: number; folder: string; shortName: string; extension: string }): string {
  const folder = info.folder ? `${info.folder}/` : '';
  return `l${info.level}/${folder}${info.shortName}${info.extension}`;
}

function fileOf(
  info: Omit<StorInfo, 'status' | 'getContent' | 'getValueInfo'>,
  content: string,
): StorInfo {
  return {
    ...info,
    status: 'changed',
    getContent: async () => content,
    getValueInfo: async () => ({ content }),
  };
}

const PROJECT = 102047;
const VENDA_L4 = fileOf(
  { project: PROJECT, level: 4, folder: 'venda', shortName: 'module', extension: '.defs.ts' },
  'VENDA_L4',
);
const VENDA_L1 = fileOf(
  { project: PROJECT, level: 1, folder: 'venda/layer_1', shortName: 'router', extension: '.ts' },
  'VENDA_L1',
);
const VENDA_L2 = fileOf(
  { project: PROJECT, level: 2, folder: 'venda/web', shortName: 'page', extension: '.ts' },
  'VENDA_L2',
);
const VENDA_L5 = fileOf(
  { project: PROJECT, level: 5, folder: 'venda', shortName: 'todoBackend', extension: '.defs.ts' },
  'VENDA_L5',
);
const EXTERNA_L4 = fileOf(
  { project: PROJECT, level: 4, folder: 'vendaExterna', shortName: 'module', extension: '.defs.ts' },
  'EXTERNA_L4',
);
const EXTERNA_L1 = fileOf(
  { project: PROJECT, level: 1, folder: 'vendaExterna/layer_1', shortName: 'router', extension: '.ts' },
  'EXTERNA_L1',
);
const EXTERNA_L2 = fileOf(
  { project: PROJECT, level: 2, folder: 'vendaExterna/web', shortName: 'page', extension: '.ts' },
  'EXTERNA_L2',
);
const EXTERNA_L5 = fileOf(
  { project: PROJECT, level: 5, folder: 'vendaExterna', shortName: 'todoBackend', extension: '.defs.ts' },
  'EXTERNA_L5',
);
const DESIGN = fileOf(
  { project: PROJECT, level: 2, folder: '', shortName: 'designSystem', extension: '.ts' },
  'DESIGN_SYSTEM',
);
const PROJECT_TS = fileOf(
  { project: PROJECT, level: 2, folder: '', shortName: 'project', extension: '.ts' },
  'PROJECT_TS',
);

const EXTERNA_BLOCK = {
  moduleName: 'vendaExterna',
  backend: { routeKeys: ['vendaExterna.list.qry', 'venda.orphan.qry'] },
};
const VENDA_BLOCK = {
  moduleName: 'venda',
  backend: { routeKeys: ['venda.own.qry'] },
};

const projectJson = {
  modules: [EXTERNA_BLOCK, VENDA_BLOCK],
};

const configJson = {
  projects: {
    '102047': {
      type: 'client',
      modules: [
        { moduleId: 'vendaExterna', basePath: '/vendaExterna', navigation: [{ href: '/vendaExterna/list' }, { href: '/venda/leftover' }] },
        { moduleId: 'venda', basePath: '/venda', navigation: [{ href: '/venda/own' }] },
      ],
      persistenceModules: [
        { moduleId: 'vendaExterna' },
        { moduleId: 'venda' },
      ],
    },
  },
};

const registry: Ns4SolutionRegistryArtifact = {
  schemaVersion: 'ns4-solution-registry-v1',
  level1SchemaVersion: 'ns4-level1-v2',
  modules: [
    {
      moduleName: 'venda',
      actors: [],
      roles: [],
      generalFields: [],
      updatedAt: '2026-09-11T00:00:00.000Z',
    },
    {
      moduleName: 'vendaExterna',
      actors: [{ actorId: 'caixa', kind: 'internal' }],
      roles: [{ mdmSubtype: 'Person', role: 'vendaExterna.Pessoa', namespace: 'vendaExterna' }],
      generalFields: [],
      updatedAt: '2026-09-11T00:00:00.000Z',
    },
  ],
};

const registryInfo = {
  project: PROJECT,
  level: 4,
  folder: 'organization',
  shortName: 'registry',
  extension: '.defs.ts',
};
const projectInfo = { project: PROJECT, level: 5, folder: '', shortName: 'project', extension: '.json' };
const configInfo = { project: PROJECT, level: 5, folder: '', shortName: 'config', extension: '.json' };

function twoModuleFiles(): Record<string, StorInfo> {
  const list = [
    VENDA_L4, VENDA_L1, VENDA_L2, VENDA_L5,
    EXTERNA_L4, EXTERNA_L1, EXTERNA_L2, EXTERNA_L5,
    DESIGN, PROJECT_TS,
    fileOf(projectInfo, `${JSON.stringify(projectJson, null, 2)}\n`),
    fileOf(configInfo, `${JSON.stringify(configJson, null, 2)}\n`),
    fileOf(registryInfo, ns4ClassicDefsSource(registryInfo, 'solutionRegistry', registry)),
  ];
  const files: Record<string, StorInfo> = {};
  for (const file of list) files[keyOf(file)] = file;
  return files;
}

async function loadRemove(files: Record<string, StorInfo>, disk: StorInfo[] = []) {
  const g = globalThis as unknown as { mls?: unknown };
  const prev = g.mls;
  const deletedCalls: string[] = [];
  const written: Record<string, string> = {};
  const liveDisk = disk.slice();
  g.mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files,
      getKeyToFile: keyOf,
      localStor: {
        deleteFile: (file: StorInfo) => {
          const key = keyOf(file);
          deletedCalls.push(displayOf(file));
          delete files[key];
          const index = liveDisk.findIndex(item => keyOf(item) === key);
          if (index >= 0) liveDisk.splice(index, 1);
        },
        listFolder: (project: number, level: number, folder: string) => {
          if (project !== PROJECT) return [];
          return liveDisk.filter(item => item.level === level && (
            item.folder === folder || String(item.folder || '').startsWith(`${folder}/`)
          ));
        },
        setContent: (file: StorInfo, value: { content: string }) => {
          written[keyOf(file)] = value.content;
          file.status = 'changed';
        },
      },
    },
  };
  const mod = await import('/_102035_/l2/solution/removeModule.js');
  return {
    prev,
    restore: () => { g.mls = prev; },
    removeModule: mod.removeModule,
    deletedCalls,
    written,
    liveDisk,
  };
}

void test('stripModuleFromJson drops the module, nested routeKeys, persistence and menus; neighbour block identity stays when untouched', () => {
  const neighbour = { moduleName: 'vendaExterna', backend: { routeKeys: ['vendaExterna.list.qry'] } };
  const json = {
    modules: [neighbour, { moduleName: 'venda', backend: { routeKeys: ['venda.own.qry'] } }],
  };
  const stripped = stripModuleFromJson(json, 'venda');
  assert.equal(stripped.changed, true);
  assert.equal((stripped.value.modules as unknown[])[0], neighbour);
  assert.deepEqual(stripped.value.modules, [neighbour]);
});

void test('stripModuleFromJson removes nested routeKeys of the target from any block (ns5_15 petShop case)', () => {
  const stripped = stripModuleFromJson(projectJson, 'venda');
  const modules = stripped.value.modules as Array<{ moduleName: string; backend: { routeKeys: string[] } }>;
  assert.deepEqual(modules.map(item => item.moduleName), ['vendaExterna']);
  assert.deepEqual(modules[0].backend.routeKeys, ['vendaExterna.list.qry']);
});

void test('stripModuleFromJson venda does not match vendaExterna in config lists', () => {
  const stripped = stripModuleFromJson(configJson, 'venda');
  const client = (stripped.value.projects as Record<string, {
    modules: Array<{ moduleId: string; navigation: Array<{ href: string }> }>;
    persistenceModules: Array<{ moduleId: string }>;
  }>)['102047'];
  assert.deepEqual(client.modules.map(item => item.moduleId), ['vendaExterna']);
  assert.deepEqual(client.persistenceModules.map(item => item.moduleId), ['vendaExterna']);
  assert.deepEqual(client.modules[0].navigation, [{ href: '/vendaExterna/list' }]);
});

void test('stripModuleFromRegistry drops only that module block', () => {
  const stripped = stripModuleFromRegistry(registry, 'venda');
  assert.equal(stripped.changed, true);
  assert.equal(stripped.value.modules.length, 1);
  assert.equal(stripped.value.modules[0], registry.modules[1]);
  assert.deepEqual(stripModuleFromRegistry(registry, 'ausente').changed, false);
});

void test('removeModule deletes one module tree and leaves the other byte-identical', async () => {
  const files = twoModuleFiles();
  const diskOrphan = fileOf(
    { project: PROJECT, level: 4, folder: 'venda/journeys', shortName: 'orphan', extension: '.defs.ts' },
    'ORPHAN',
  );
  const harness = await loadRemove(files, [diskOrphan, VENDA_L4, EXTERNA_L4]);
  const beforeExterna = {
    l4: await EXTERNA_L4.getContent(),
    l1: await EXTERNA_L1.getContent(),
    l2: await EXTERNA_L2.getContent(),
    l5: await EXTERNA_L5.getContent(),
    design: await DESIGN.getContent(),
    projectTs: await PROJECT_TS.getContent(),
  };
  try {
    const result = await harness.removeModule('venda');
    assert.deepEqual(result.deleted.sort(), [
      displayOf(VENDA_L1),
      displayOf(VENDA_L2),
      displayOf(VENDA_L4),
      displayOf(VENDA_L5),
      displayOf(diskOrphan),
    ].sort());
    assert.deepEqual(result.edited, [
      'l4/organization/registry.defs.ts',
      'l5/config.json',
      'l5/project.json',
    ]);
    assert.deepEqual(result.skipped, []);

    assert.equal(await EXTERNA_L4.getContent(), beforeExterna.l4);
    assert.equal(await EXTERNA_L1.getContent(), beforeExterna.l1);
    assert.equal(await EXTERNA_L2.getContent(), beforeExterna.l2);
    assert.equal(await EXTERNA_L5.getContent(), beforeExterna.l5);
    assert.equal(await DESIGN.getContent(), beforeExterna.design);
    assert.equal(await PROJECT_TS.getContent(), beforeExterna.projectTs);
    assert.ok(files[keyOf(EXTERNA_L4)]);
    assert.ok(files[keyOf(DESIGN)]);
    assert.ok(files[keyOf(PROJECT_TS)]);
    assert.equal(files[keyOf(VENDA_L4)], undefined);
    assert.equal(files[keyOf(VENDA_L1)], undefined);

    const remainingVenda = Object.values(files).filter(file =>
      file.folder === 'venda' || String(file.folder || '').startsWith('venda/'),
    );
    assert.equal(remainingVenda.length, 0);
    assert.equal(harness.liveDisk.filter(file => file.folder === 'venda' || String(file.folder || '').startsWith('venda/')).length, 0);
    assert.equal(remainingVenda.length, harness.liveDisk.filter(file =>
      file.folder === 'venda' || String(file.folder || '').startsWith('venda/'),
    ).length);

    const writtenProject = JSON.parse(harness.written[keyOf(projectInfo)]) as typeof projectJson;
    assert.deepEqual((writtenProject.modules as Array<{ moduleName: string }>).map(item => item.moduleName), ['vendaExterna']);
    assert.deepEqual((writtenProject.modules as Array<{ backend: { routeKeys: string[] } }>)[0].backend.routeKeys, ['vendaExterna.list.qry']);
    const writtenConfig = JSON.parse(harness.written[keyOf(configInfo)]) as typeof configJson;
    const client = writtenConfig.projects['102047'];
    assert.deepEqual(client.modules.map(item => item.moduleId), ['vendaExterna']);
    assert.deepEqual(client.persistenceModules.map(item => item.moduleId), ['vendaExterna']);
    assert.match(harness.written[keyOf(registryInfo)], /vendaExterna/);
    assert.doesNotMatch(harness.written[keyOf(registryInfo)], /"moduleName": "venda"/);
  } finally {
    harness.restore();
  }
});

void test('dryRun returns the inventory and deletes nothing', async () => {
  const files = twoModuleFiles();
  const harness = await loadRemove(files);
  const snapshot = JSON.stringify(Object.keys(files).sort());
  try {
    const result = await harness.removeModule('venda', { dryRun: true });
    assert.ok(result.deleted.includes(displayOf(VENDA_L4)));
    assert.ok(result.edited.includes('l5/project.json'));
    assert.deepEqual(harness.deletedCalls, []);
    assert.deepEqual(harness.written, {});
    assert.equal(JSON.stringify(Object.keys(files).sort()), snapshot);
    assert.ok(files[keyOf(VENDA_L4)]);
  } finally {
    harness.restore();
  }
});

void test('missing module is skipped with no throw and no writes', async () => {
  const files = twoModuleFiles();
  const harness = await loadRemove(files);
  try {
    const result = await harness.removeModule('ausente');
    assert.deepEqual(result, { deleted: [], edited: [], skipped: ['ausente'] });
    assert.deepEqual(harness.deletedCalls, []);
    assert.deepEqual(harness.written, {});
  } finally {
    harness.restore();
  }
});

void test('venda does not collect vendaExterna files', async () => {
  const files = twoModuleFiles();
  const harness = await loadRemove(files);
  try {
    const result = await harness.removeModule('venda');
    assert.equal(result.deleted.some(path => path.includes('vendaExterna')), false);
    assert.ok(files[keyOf(EXTERNA_L4)]);
    assert.ok(files[keyOf(EXTERNA_L1)]);
  } finally {
    harness.restore();
  }
});
