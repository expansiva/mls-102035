/// <mls fileReference="_102035_/l2/solution/fs.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

async function loadFs(): Promise<typeof import('/_102035_/l2/solution/fs.js')> {
  const g = globalThis as unknown as Record<string, any>;
  if (!g.mls) g.mls = { actualProject: 102047, stor: { files: {}, getKeyToFile: () => 'k' } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  g.mls.actualProject = 102047;
  return import('/_102035_/l2/solution/fs.js');
}

void test('every generated path matches the NS5 l4 table', async () => {
  const fs = await loadFs();
  const m = 'teste5';
  const asPath = (info: { folder: string; shortName: string; extension: string }) =>
    `l4/${info.folder ? `${info.folder}/` : ''}${info.shortName}${info.extension}`;

  assert.equal(asPath(fs.moduleFile(m)), 'l4/teste5/module.defs.ts');
  assert.equal(asPath(fs.journeyFile(m, 'fecharComanda')), 'l4/teste5/journeys/fecharComanda.defs.ts');
  assert.equal(asPath(fs.journeyIndexFile(m)), 'l4/teste5/journeys/index.defs.ts');
  assert.equal(asPath(fs.ontologyEntityFile(m, 'Comanda')), 'l4/teste5/ontology/Comanda.defs.ts');
  assert.equal(asPath(fs.ontologyIndexFile(m)), 'l4/teste5/ontology/index.defs.ts');
  assert.equal(asPath(fs.rulesFile(m)), 'l4/teste5/rules.defs.ts');
  assert.equal(asPath(fs.workflowsFile(m)), 'l4/teste5/workflows.defs.ts');
  assert.equal(asPath(fs.accessFile(m)), 'l4/teste5/access.defs.ts');
  assert.equal(asPath(fs.integrationFile(m)), 'l4/teste5/integration.defs.ts');
  assert.equal(asPath(fs.pipelineFile(m)), 'l4/teste5/pipeline/pipeline.json');
  assert.equal(asPath(fs.finalizeReportFile(m)), 'l4/teste5/pipeline/finalize-report.json');
  assert.equal(asPath(fs.pipelineJsonFile(m, 'run01_newsolution5')), 'l4/teste5/pipeline/run01_newsolution5.json');
  assert.equal(asPath(fs.draftFile(m, 'module10')), 'l4/teste5/pipeline/module10-draft.json');
  assert.equal(fs.displayPath(fs.agentFile('schemas', 'module.schema', '.json')), 'l2/agentNewSolution5/schemas/module.schema.json');
  assert.equal(fs.displayPath(fs.agentFile('steps/module10', 'prompt', '.md')), 'l2/agentNewSolution5/steps/module10/prompt.md');
  assert.equal(fs.displayPath(fs.registryFile()), 'l4/organization/registry.defs.ts');
});

void test('displayPath and shortName builders stay free of extra dots', async () => {
  const fs = await loadFs();
  const m = 'teste5';
  for (const info of [
    fs.moduleFile(m),
    fs.journeyFile(m, 'openOrder'),
    fs.journeyIndexFile(m),
    fs.ontologyEntityFile(m, 'Order'),
    fs.ontologyIndexFile(m),
    fs.rulesFile(m),
    fs.workflowsFile(m),
    fs.accessFile(m),
    fs.integrationFile(m),
    fs.pipelineFile(m),
    fs.draftFile(m, 'finalize80'),
  ]) {
    assert.doesNotThrow(() => fs.assertShortName(info.shortName));
    assert.equal(info.project, 102047);
    assert.equal(info.level, 4);
  }
});

void test('writeDefs emits the mls header and as const satisfies', async () => {
  const fs = await loadFs();
  const source = fs.renderDefsSource(
    { project: 102047, level: 4, folder: 'teste5', shortName: 'module', extension: '.defs.ts' },
    'teste5Module',
    { moduleName: 'teste5' },
    'Ns5ModuleArtifact',
  );
  assert.match(source, /fileReference="_102047_\/l4\/teste5\/module.defs.ts"/);
  assert.match(source, /import type \{ Ns5ModuleArtifact \} from '\/_102035_\/l2\/solution\/types.js'/);
  assert.match(source, /as const satisfies Ns5ModuleArtifact/);
});

void test('listModuleL4Keys is exact-folder and l4-only', async () => {
  const fs = await loadFs();
  const files = {
    a: { project: 102047, level: 4, folder: 'teste5/pipeline', status: 'changed' },
    b: { project: 102047, level: 4, folder: 'teste5Extra', status: 'changed' },
    c: { project: 102047, level: 1, folder: 'teste5', status: 'changed' },
    d: { project: 102047, level: 4, folder: 'teste5', status: 'deleted' },
    e: { project: 1, level: 4, folder: 'teste5', status: 'changed' },
  };
  assert.deepEqual(fs.listModuleL4Keys(files, 102047, 'teste5'), ['a']);
});

void test('ns5DefsOrphans drops index plus the ids and keeps the rest', async () => {
  const fs = await loadFs();
  assert.deepEqual(
    fs.ns5DefsOrphans(
      ['abrirComandaNaMesa', 'abrirComandaMesa', 'index', 'openOrderTabForTable.defs.ts'],
      ['abrirComandaNaMesa', 'lancarItemNaComanda'],
    ),
    ['abrirComandaMesa', 'openOrderTabForTable'],
  );
  assert.deepEqual(fs.ns5DefsOrphans(['index', 'Comanda'], ['Comanda']), []);
});

void test('collectExactModuleFiles unions index and host disk across levels, never prefix', async () => {
  const g = globalThis as unknown as { mls?: unknown };
  const prev = g.mls;
  const files: Record<string, { project: number; level: number; folder: string; shortName: string; extension: string; status: string }> = {
    '102047_4_teste5/module.defs.ts': {
      project: 102047, level: 4, folder: 'teste5', shortName: 'module', extension: '.defs.ts', status: 'deleted',
    },
    '102047_1_teste5/router.ts': {
      project: 102047, level: 1, folder: 'teste5', shortName: 'router', extension: '.ts', status: 'changed',
    },
    '102047_4_teste5Extra/module.defs.ts': {
      project: 102047, level: 4, folder: 'teste5Extra', shortName: 'module', extension: '.defs.ts', status: 'changed',
    },
    '102047_4_organization/registry.defs.ts': {
      project: 102047, level: 4, folder: 'organization', shortName: 'registry', extension: '.defs.ts', status: 'changed',
    },
  };
  try {
    g.mls = {
      actualProject: 102047,
      events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
      stor: {
        files,
        getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
          `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`,
        localStor: {
          listFolder: (project: number, level: number, folder: string) => {
            if (project !== 102047 || folder !== 'teste5') return [];
            if (level === 4) {
              return [
                { project, level, folder: 'teste5/journeys', shortName: 'orphan', extension: '.defs.ts' },
                { project, level, folder: 'teste5', shortName: 'module', extension: '.defs.ts' },
              ];
            }
            if (level === 2) {
              return [{ project, level, folder: 'teste5/web', shortName: 'page', extension: '.ts' }];
            }
            return [];
          },
        },
      },
    };
    const fs = await loadFs();
    const collected = fs.collectExactModuleFiles('teste5').map(file => `${file.level}:${file.folder}/${file.shortName}${file.extension}`).sort();
    assert.deepEqual(collected, [
      '1:teste5/router.ts',
      '2:teste5/web/page.ts',
      '4:teste5/journeys/orphan.defs.ts',
      '4:teste5/module.defs.ts',
    ]);
    assert.equal(fs.isProtectedModuleFile({ level: 4, folder: 'organization', shortName: 'registry' }), true);
    assert.equal(fs.isProtectedModuleFile({ level: 4, folder: 'organization/tobe/integration', shortName: 'financeiro--comandaFechada' }), false);
    assert.equal(fs.isProtectedModuleFile({ level: 2, folder: '', shortName: 'designSystem' }), true);
  } finally {
    g.mls = prev;
  }
});

void test('reconcileModuleDefs removes defs whose id is not in the index', async () => {
  const g = globalThis as unknown as { mls?: unknown };
  const prev = g.mls;
  const deleted: string[] = [];
  const files: Record<string, { project: number; level: number; folder: string; shortName: string; extension: string; status: string }> = {
    keep: {
      project: 102047, level: 4, folder: 'teste5/journeys', shortName: 'keepMe', extension: '.defs.ts', status: 'changed',
    },
    orphan: {
      project: 102047, level: 4, folder: 'teste5/journeys', shortName: 'oldName', extension: '.defs.ts', status: 'changed',
    },
    index: {
      project: 102047, level: 4, folder: 'teste5/journeys', shortName: 'index', extension: '.defs.ts', status: 'changed',
    },
  };
  try {
    g.mls = {
      actualProject: 102047,
      events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
      stor: {
        files,
        getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
          `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`,
        localStor: {
          deleteFile: (file: { shortName: string }) => { deleted.push(file.shortName); },
        },
      },
    };
    const fs = await loadFs();
    const removed = await fs.reconcileModuleDefs('teste5', 'journeys', ['keepMe']);
    assert.deepEqual(removed, ['oldName']);
    assert.deepEqual(deleted, ['oldName']);
  } finally {
    g.mls = prev;
  }
});
