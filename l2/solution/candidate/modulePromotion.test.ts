import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { L4_REVISION_SCHEMA, originalL4FileInfo, promoteL4Revision, readActiveL4Change, writeL4OutputRevision } from './moduleRevision.js';
import { sealModuleLayers } from './moduleLayers.js';
import type { Ns5FileInfo } from '../fs.js';
import type { Ns5TobeArtifactPath } from './tobePaths.js';

const project = 102035;
const moduleName = 'fixture';
const hash = (source: string) => `sha256:${createHash('sha256').update(source).digest('hex')}`;

function installStorFixture() {
  const previous = (globalThis as any).mls;
  const files: Record<string, any> = {};
  const contents = new Map<string, string>();
  let writes = 0;
  const keyOf = (info: Ns5FileInfo) => `${info.project}:${info.level}:${info.folder || ''}:${info.shortName}${info.extension}`;
  const add = (info: Ns5FileInfo, content = '') => {
    const key = keyOf(info);
    contents.set(key, content);
    return files[key] = {
      ...info, status: 'unchanged', versionRef: '1',
      getContent: async () => contents.get(key) || '',
      getValueInfo: async () => ({ content: contents.get(key) || '' }),
    };
  };
  (globalThis as any).mls = {
    stor: { files, getKeyToFile: keyOf, addOrUpdateFile: async (info: Ns5FileInfo) => add(info),
      localStor: { setContent: async (file: Ns5FileInfo, value: { content: string }) => {
        writes++; contents.set(keyOf(file), value.content);
      } },
    },
    editor: { models: {}, getKeyModel: () => '' },
  };
  const values: Array<[Ns5TobeArtifactPath, object]> = [
    ['module.defs.ts', { schemaVersion: '2026-09-10-ns5-module-v2', moduleName }],
    ['journeys/index.defs.ts', { schemaVersion: 'fixture', journeys: [] }],
    ['ontology/index.defs.ts', { schemaVersion: 'fixture', entities: [] }],
    ['rules.defs.ts', { schemaVersion: 'fixture' }],
    ['workflows.defs.ts', { schemaVersion: 'fixture' }],
    ['access.defs.ts', { schemaVersion: 'fixture' }],
    ['integration.defs.ts', { schemaVersion: 'fixture' }],
  ];
  const sources = values.map(([path, value]) => ({ path, source: `export const fixture = ${JSON.stringify(value)} as const;\n` }));
  for (const item of sources) add(originalL4FileInfo(project, moduleName, 'base1', item.path), item.source);
  const json = (folder: string, shortName: string, value: unknown) => add({ project, level: 4, folder: `${moduleName}/${folder}`, shortName, extension: '.json' }, JSON.stringify(value));
  json('pipeline/releases', 'index', { releases: [{ baseId: 'base1' }] });
  json('pipeline/releases/base1', 'manifest', {
    schemaVersion: L4_REVISION_SCHEMA, project, moduleName, baseId: 'base1',
    files: Object.fromEntries(sources.map(item => [item.path, hash(item.source)])),
    schemas: Object.fromEntries(values.map(([path, value]) => [path, (value as { schemaVersion: string }).schemaVersion])),
  });
  sources[0].source += '// saída alterada: ação\n';
  return { add, sources, json, contents, writes: () => writes, restore: () => { (globalThis as any).mls = previous; } };
}

const inputFor = (sources: Array<{ path: string; source: string }>) => ({
  changeId: 'change1', revisionId: 'rev2', baseId: 'base1', requestRevision: 1,
  requestHash: hash('pedido'), changedPaths: ['module.defs.ts'], sources,
});

function installActiveChange(fixture: ReturnType<typeof installStorFixture>, activeRevisionId = 'rev1') {
  const change = {
    schemaVersion: L4_REVISION_SCHEMA, project, moduleName, changeId: 'change1', baseId: 'base1',
    activeRevisionId, requestRevision: 1, resultRevisionId: null,
    sourcePrompt: 'original', updatedAt: '2026-10-07T00:00:00.000Z',
  };
  fixture.json('pipeline/changes', 'active', { changeId: change.changeId });
  fixture.json('pipeline/changes/change1', 'change', change);
  fixture.json('pipeline/changes/change1/requests', 'request-1', { request: 'pedido' });
  return change;
}


async function ready(fixture: ReturnType<typeof installStorFixture>) {
  installActiveChange(fixture, 'rev2');
  await writeL4OutputRevision(project, moduleName, inputFor(fixture.sources));
  fixture.add({ project, level: 4, folder: 'fixture/pipeline/changes/change1/revisions/rev2/l4/pool/nested',
    shortName: 'receipt', extension: '.json' }, '{"text":"ação"}\n');
}

test('mr_14 s3: promotes exact defs and pool bytes without touching the release', async () => {
  const fixture = installStorFixture();
  try {
    await ready(fixture);
    await sealModuleLayers(project, moduleName, 'base1');
    const release = [...fixture.contents].filter(([key]) => key.includes('/pipeline/releases/'));
    await promoteL4Revision(project, moduleName, 'change1', 'rev2');
    for (const { path, source } of fixture.sources) {
      const slash = path.lastIndexOf('/');
      assert.equal(hash(fixture.contents.get(`${project}:4:fixture${slash < 0 ? '' : '/' + path.slice(0, slash)}:${path.slice(slash + 1)}`)!), hash(source));
    }
    assert.equal(fixture.contents.get(`${project}:4:fixture/pool/nested:receipt.json`), '{"text":"ação"}\n');
    assert.deepEqual([...fixture.contents].filter(([key]) => key.includes('/pipeline/releases/')), release);
    const change = await readActiveL4Change(project, moduleName);
    assert.equal(change?.promotedRevisionId, 'rev2');
    assert.ok(change?.promotedAt);
  } finally { fixture.restore(); }
});

test('mr_14 s3: refuses promotion without the layers seal before writing', async () => {
  const fixture = installStorFixture();
  try {
    await ready(fixture);
    const before = new Map(fixture.contents);
    await assert.rejects(promoteL4Revision(project, moduleName, 'change1', 'rev2'), /module-promotion.layers_unsealed/);
    assert.deepEqual(fixture.contents, before);
  } finally { fixture.restore(); }
});

test('mr_14 s3: refuses a revision changed by one byte before writing', async () => {
  const fixture = installStorFixture();
  try {
    await ready(fixture);
    await sealModuleLayers(project, moduleName, 'base1');
    const key = `${project}:4:fixture/pipeline/changes/change1/revisions/rev2/l4:rules.defs.ts`;
    fixture.contents.set(key, fixture.contents.get(key)! + ' ');
    const before = new Map(fixture.contents);
    await assert.rejects(promoteL4Revision(project, moduleName, 'change1', 'rev2'), /module-promotion.revision_mismatch/);
    assert.deepEqual(fixture.contents, before);
  } finally { fixture.restore(); }
});

test('mr_14 s3: refuses a revision that is no longer active', async () => {
  const fixture = installStorFixture();
  try {
    await ready(fixture);
    await sealModuleLayers(project, moduleName, 'base1');
    installActiveChange(fixture, 'rev3');
    const before = new Map(fixture.contents);
    await assert.rejects(promoteL4Revision(project, moduleName, 'change1', 'rev2'), /module-promotion.revision_mismatch/);
    assert.deepEqual(fixture.contents, before);
  } finally { fixture.restore(); }
});

test('mr_14 s3: stops on destination corruption without recording promotion', async () => {
  const fixture = installStorFixture();
  try {
    await ready(fixture);
    await sealModuleLayers(project, moduleName, 'base1');
    const stor = (globalThis as any).mls.stor;
    const write = stor.localStor.setContent;
    stor.localStor.setContent = async (file: Ns5FileInfo, value: { content: string }) => {
      await write(file, file.folder === moduleName ? { content: value.content + ' ' } : value);
    };
    await assert.rejects(promoteL4Revision(project, moduleName, 'change1', 'rev2'), /module-promotion.revision_mismatch/);
    assert.equal((await readActiveL4Change(project, moduleName))?.promotedRevisionId, undefined);
    assert.equal(fixture.contents.has(`${project}:4:fixture/pool/nested:receipt.json`), false);
  } finally { fixture.restore(); }
});
