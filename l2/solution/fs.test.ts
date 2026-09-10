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
