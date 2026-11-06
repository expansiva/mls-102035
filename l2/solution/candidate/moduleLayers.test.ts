import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { compactModuleApplication, diffModuleLayers, readModuleLayers, restoreModuleFromSeals, sealModuleLayers, sealModuleApplication, restoreModuleApplication } from './moduleLayers.js';

function installStorFixture() {
  const files: Record<string, any> = {};
  const contents = new Map<string, string>();
  const keyOf = (info: any) => `${info.project}:${info.level}:${info.folder || ''}:${info.shortName}${info.extension}`;
  const make = (info: any) => {
    const key = keyOf(info);
    return files[key] = { ...info, status: 'unchanged', versionRef: '1',
      getContent: async () => contents.get(key) || '',
      getValueInfo: async () => ({ content: contents.get(key) || '' }) };
  };
  const add = (level: number, path: string, content = path, project = 102047) => {
    const slash = path.lastIndexOf('/');
    const name = path.slice(slash + 1);
    const dot = name === 'runtime.project.json' ? name.lastIndexOf('.') : name.indexOf('.');
    const info = { project, level, folder: slash < 0 ? '' : path.slice(0, slash), shortName: name.slice(0, dot), extension: name.slice(dot) };
    contents.set(keyOf(info), content);
    return make(info);
  };
  (globalThis as any).mls = { stor: { files, getKeyToFile: keyOf,
    addOrUpdateFile: async (info: any) => make(info),
    localStor: {
      setContent: async (file: any, value: { content: string }) => {
        contents.set(keyOf(file), value.content); files[keyOf(file)] = file;
        if (file.status !== 'new') file.status = 'changed';
      },
      listFolder: () => { throw new Error('listFolder forbidden'); },
      deleteFile: async (file: any) => { delete files[keyOf(file)]; contents.delete(keyOf(file)); },
    },
  }, editor: { models: {}, getKeyModel: () => '' } };
  return { add, contents };
}

test('mr_14 s1: seals only module defs and receipts, sorted by level and path', async () => {
  const fixture = installStorFixture();
  fixture.add(2, 'sample/web/contracts/item.defs.ts', 'def L2');
  fixture.add(2, 'sample/pipeline/agentDefsL2/result.json', 'receipt L2');
  fixture.add(1, 'sample/usecases/item.defs.ts', 'def L1');
  fixture.add(1, 'sample/pipeline/agentDefsL1/result.json', 'receipt L1');
  for (const [level, path] of [[1, 'sample/materialization/generated.defs.ts'], [1, 'sample/item.ts'],
    [2, 'sample/web/item.ts'], [2, 'sample/other/item.defs.ts'], [2, 'sample/pipeline/agentDefsL2/code.ts'],
    [1, 'sampleOther/item.defs.ts'], [4, 'sample/item.defs.ts']] as const) fixture.add(level, path);
  fixture.add(1, 'sample/deleted.defs.ts').status = 'deleted';
  fixture.add(1, 'sample/foreign.defs.ts', 'foreign', 999999);
  const seal = await sealModuleLayers(102047, 'sample', 'base-1');
  assert.deepEqual(seal.files.map(({ level, path }) => [level, path]), [
    [1, 'pipeline/agentDefsL1/result.json'], [1, 'usecases/item.defs.ts'],
    [2, 'pipeline/agentDefsL2/result.json'], [2, 'web/contracts/item.defs.ts'],
  ]);
  for (const file of seal.files) assert.equal(file.sha256, `sha256:${createHash('sha256').update(file.content).digest('hex')}`);
  const index = JSON.parse(fixture.contents.get('102047:4:sample/pipeline/releases/base-1:layers.json')!);
  assert.deepEqual(index.files, []);
  assert.ok(index.parts.length > 0);
  assert.deepEqual(await readModuleLayers(102047, 'sample', 'base-1'), seal);
});

test('mr_14 s1: repeated and concurrent sealing is idempotent', async () => {
  const fixture = installStorFixture();
  fixture.add(1, 'sample/item.defs.ts');
  const [first, second] = await Promise.all([sealModuleLayers(102047, 'sample', 'base-1'), sealModuleLayers(102047, 'sample', 'base-1')]);
  assert.deepEqual(second, first);
  assert.deepEqual(await sealModuleLayers(102047, 'sample', 'base-1'), first);
});

test('mr_14 s1: seal_conflict preserves the original JSON', async () => {
  const fixture = installStorFixture();
  fixture.add(1, 'sample/item.defs.ts', 'original');
  await sealModuleLayers(102047, 'sample', 'base-1');
  const key = '102047:4:sample/pipeline/releases/base-1:layers.json';
  const original = fixture.contents.get(key);
  fixture.add(1, 'sample/item.defs.ts', 'changed');
  await assert.rejects(sealModuleLayers(102047, 'sample', 'base-1'), /module-layers.seal_conflict/);
  assert.equal(fixture.contents.get(key), original);
});

test('mr_14 s2: unchanged contents have no diff regardless of Studio status', async () => {
  const fixture = installStorFixture();
  const file = fixture.add(1, 'sample/item.defs.ts', 'original');
  await sealModuleLayers(102047, 'sample', 'base-1');
  file.status = 'changed';
  assert.deepEqual(await diffModuleLayers(102047, 'sample', 'base-1'), []);
});

test('mr_14 s2: changed, added and removed compare hashes by level and path', async () => {
  const fixture = installStorFixture();
  fixture.add(1, 'sample/web/item.defs.ts', 'original L1');
  const removed = fixture.add(2, 'sample/web/item.defs.ts', 'original L2');
  await sealModuleLayers(102047, 'sample', 'base-1');
  fixture.add(1, 'sample/web/item.defs.ts', 'changed L1');
  removed.status = 'deleted';
  fixture.add(2, 'sample/web/added.defs.ts', 'added L2');
  fixture.add(1, 'sample/materialization/generated.defs.ts');
  fixture.add(2, 'sample/web/plain.ts');
  const hash = (text: string) => `sha256:${createHash('sha256').update(text).digest('hex')}`;
  assert.deepEqual(await diffModuleLayers(102047, 'sample', 'base-1'), [
    { level: 1, path: 'web/item.defs.ts', status: 'changed', sealedSha256: hash('original L1'), currentSha256: hash('changed L1') },
    { level: 2, path: 'web/added.defs.ts', status: 'added', currentSha256: hash('added L2') },
    { level: 2, path: 'web/item.defs.ts', status: 'removed', sealedSha256: hash('original L2') },
  ]);
});

test('mr_58 s3: second layer seal stores only changed files and restores either base', async () => {
  const fixture = installStorFixture();
  const catalog = { releases: [{ baseId: 'base-1' }, { baseId: 'base-2' }] };
  fixture.add(4, 'sample/pipeline/releases/index.json', JSON.stringify(catalog));
  const values: Array<[string, object]> = [
    ['module.defs.ts', { schemaVersion: '2026-09-10-ns5-module-v2', moduleName: 'sample' }],
    ['journeys/index.defs.ts', { schemaVersion: 'fixture', journeys: [] }],
    ['ontology/index.defs.ts', { schemaVersion: 'fixture', entities: [] }],
    ['rules.defs.ts', { schemaVersion: 'fixture' }], ['workflows.defs.ts', { schemaVersion: 'fixture' }],
    ['access.defs.ts', { schemaVersion: 'fixture' }], ['integration.defs.ts', { schemaVersion: 'fixture' }],
  ];
  const sources = values.map(([path, value]) => ({ path, source: `export const fixture = ${JSON.stringify(value)} as const;\n` }));
  for (const baseId of ['base-1', 'base-2']) {
    for (const { path, source } of sources) fixture.add(4, `sample/pipeline/releases/${baseId}/l4/${path}`, source);
    fixture.add(4, `sample/pipeline/releases/${baseId}/manifest.json`, JSON.stringify({
      schemaVersion: '2026-09-20-nr-module-revision-v1', project: 102047, moduleName: 'sample', baseId,
      createdAt: '', files: Object.fromEntries(sources.map(item => [item.path, `sha256:${createHash('sha256').update(item.source).digest('hex')}`])),
      schemas: Object.fromEntries(values.map(([path, value]) => [path, (value as { schemaVersion: string }).schemaVersion])),
      provenance: { status: 'unverified', label: '' },
    }));
  }
  fixture.add(1, 'sample/pipeline/agentDefsL1/drafts.json', 'x'.repeat(2_000_000));
  fixture.add(1, 'sample/usecases/item.defs.ts', 'first');
  const first = await sealModuleLayers(102047, 'sample', 'base-1');
  fixture.add(1, 'sample/usecases/item.defs.ts', 'second');
  const second = await sealModuleLayers(102047, 'sample', 'base-2');
  const firstIndex = JSON.parse(fixture.contents.get('102047:4:sample/pipeline/releases/base-1:layers.json')!);
  const secondIndex = JSON.parse(fixture.contents.get('102047:4:sample/pipeline/releases/base-2:layers.json')!);
  assert.equal(firstIndex.previousBaseId, null);
  assert.equal(secondIndex.previousBaseId, 'base-1');
  assert.ok(firstIndex.parts.length > 1);
  for (const part of firstIndex.parts) assert.ok(Buffer.byteLength(
    fixture.contents.get(`102047:4:sample/pipeline/releases/base-1:${part.name}.json`)!) < 1_500_000);
  assert.equal(secondIndex.parts.length, 1);
  assert.ok(Buffer.byteLength(fixture.contents.get(`102047:4:sample/pipeline/releases/base-2:${secondIndex.parts[0].name}.json`)!) < 1_500_000);
  assert.ok(!fixture.contents.get(`102047:4:sample/pipeline/releases/base-2:${secondIndex.parts[0].name}.json`)!.includes('x'.repeat(100)));
  assert.deepEqual((await readModuleLayers(102047, 'sample', 'base-2')).files, second.files);
  assert.equal(first.files.length, second.files.length);
  assert.equal((await diffModuleLayers(102047, 'sample', 'base-2')).length, 0);
  await restoreModuleFromSeals(102047, 'sample', 'base-1');
  assert.equal(fixture.contents.get('102047:1:sample/usecases:item.defs.ts'), 'first');
  await restoreModuleFromSeals(102047, 'sample', 'base-2');
  assert.equal(fixture.contents.get('102047:1:sample/usecases:item.defs.ts'), 'second');
  fixture.contents.delete(`102047:4:sample/pipeline/releases/base-1:${firstIndex.parts[0].name}.json`);
  await assert.rejects(readModuleLayers(102047, 'sample', 'base-2'), /module-seal.missing_part/);
});

test('mr_53 s2: restores changed, created and removed files plus only this module in L5', async () => {
  const fixture = installStorFixture();
  fixture.add(1, 'sample/code.ts', 'before');
  const removed = fixture.add(2, 'sample/web/old.ts', 'old');
  fixture.add(4, 'sample/tobe/plan/rules.defs.ts', 'plan');
  fixture.add(1, 'sample_old/backup.ts', 'backup');
  fixture.add(5, 'config.json', JSON.stringify({ projects: { 102047: { modules: [
    { moduleId: 'sample', value: 'before' }, { moduleId: 'other', value: 'keep' }] } } }));
  fixture.add(5, 'project.json', JSON.stringify({ modules: [
    { moduleName: 'sample', value: 'before' }, { moduleName: 'other', value: 'keep' }] }));
  fixture.add(5, 'runtime.project.json', JSON.stringify({ modules: [
    { moduleName: 'sample', value: 'before' }, { moduleName: 'other', value: 'keep' }] }));
  const seal = await sealModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  assert.equal(seal.files.length, 4);
  fixture.add(1, 'sample/code.ts', 'after');
  removed.status = 'deleted';
  fixture.add(2, 'sample/web/new.ts', 'new');
  fixture.add(4, 'sample/tobe/plan/rules.defs.ts', 'changed plan');
  fixture.add(1, 'sample_old/extra.ts', 'extra');
  for (const document of ['config', 'project', 'runtime.project']) {
    const key = `102047:5::${document}.json`;
    const json = JSON.parse(fixture.contents.get(key)!);
    const modules = document === 'config' ? json.projects['102047'].modules : json.modules;
    modules[0].value = 'after';
    modules[1].value = 'other changed';
    fixture.contents.set(key, JSON.stringify(json));
  }
  await restoreModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  assert.equal(fixture.contents.get('102047:1:sample:code.ts'), 'before');
  assert.equal(fixture.contents.get('102047:2:sample/web:old.ts'), 'old');
  assert.equal(fixture.contents.has('102047:2:sample/web:new.ts'), false);
  assert.equal(fixture.contents.get('102047:4:sample/tobe/plan:rules.defs.ts'), 'plan');
  assert.equal(fixture.contents.get('102047:1:sample_old:backup.ts'), 'backup');
  assert.equal(fixture.contents.has('102047:1:sample_old:extra.ts'), false);
  for (const document of ['config', 'project', 'runtime.project']) {
    const json = JSON.parse(fixture.contents.get(`102047:5::${document}.json`)!);
    const modules = document === 'config' ? json.projects['102047'].modules : json.modules;
    assert.equal(modules[0].value, 'before');
    assert.equal(modules[1].value, 'other changed');
  }
  await assert.rejects(restoreModuleApplication(102047, 'sample', 'other', 'revision-1'), /invalid_seal/);
});

test('mr_53 s2: restores exact bytes and removes the checkpoint', async () => {
  const fixture = installStorFixture();
  fixture.add(1, 'sample/code.ts', 'L1 before\n');
  fixture.add(2, 'sample/web/page.ts', 'L2 before\n');
  fixture.add(4, 'sample/tobe/plan/rules.defs.ts', 'L4 before\n');
  for (const document of ['config', 'project', 'runtime.project']) {
    const modules = [{ [document === 'config' ? 'moduleId' : 'moduleName']: 'sample', value: 'before' },
      { [document === 'config' ? 'moduleId' : 'moduleName']: 'other', value: 'keep' }];
    fixture.add(5, `${document}.json`, ` { "${document === 'config' ? 'projects' : 'modules'}": ${JSON.stringify(document === 'config' ? { 102047: { modules } } : modules)} }\n`);
  }
  const before = new Map(fixture.contents);
  await sealModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  fixture.add(1, 'sample/code.ts', 'L1 after');
  fixture.add(2, 'sample/web/page.ts', 'L2 after');
  fixture.add(4, 'sample/tobe/plan/rules.defs.ts', 'L4 after');
  fixture.add(1, 'sample/new.ts', 'created');
  for (const document of ['config', 'project', 'runtime.project']) {
    const key = `102047:5::${document}.json`;
    const value = JSON.parse(fixture.contents.get(key)!);
    const modules = document === 'config' ? value.projects['102047'].modules : value.modules;
    modules[0].value = 'after';
    fixture.contents.set(key, `${JSON.stringify(value, null, 2)}\n`);
  }
  await restoreModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  assert.deepEqual(fixture.contents, before);
});

test('mr_53 s2: a document created by the application becomes absent', async () => {
  const fixture = installStorFixture();
  await sealModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  fixture.add(5, 'config.json', JSON.stringify({ projects: { 102047: { modules: [{ moduleId: 'sample' }] } } }));
  fixture.add(5, 'project.json', JSON.stringify({ modules: [{ moduleName: 'sample' }] }));
  fixture.add(5, 'runtime.project.json', JSON.stringify({ modules: [{ moduleName: 'sample' }, { moduleName: 'other' }] }));
  await restoreModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  assert.equal(fixture.contents.has('102047:5::config.json'), false);
  assert.equal(fixture.contents.has('102047:5::project.json'), false);
  assert.deepEqual(JSON.parse(fixture.contents.get('102047:5::runtime.project.json')!).modules, [{ moduleName: 'other' }]);
  assert.equal(fixture.contents.has('102047:4:sample/pipeline/application:undo.json'), false);
});

test('mr_58 s2: checkpoint is split, excludes other history and compacts to changed files', async () => {
  const fixture = installStorFixture();
  const large = 'x'.repeat(2_000_000);
  fixture.add(1, 'sample/pipeline/agentDefsL1/drafts.json', large);
  fixture.add(1, 'sample/code.ts', 'before');
  fixture.add(4, 'sample/pipeline/changes/old/revisions/rev1/l4/file.defs.ts', 'history');
  fixture.add(4, 'sample/pipeline/releases/base1/layers.json', 'other seal');
  fixture.add(4, 'sample/pipeline/application/previous.json', 'previous');
  await sealModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  const indexKey = '102047:4:sample/pipeline/application:undo.json';
  const initial = JSON.parse(fixture.contents.get(indexKey)!);
  assert.ok(initial.parts.length > 1);
  for (const part of initial.parts) {
    const content = fixture.contents.get(`102047:4:sample/pipeline/application:${part.name}.json`)!;
    assert.ok(Buffer.byteLength(content) < 1_500_000);
  }
  fixture.add(1, 'sample/code.ts', 'after');
  fixture.add(2, 'sample/web/new.ts', 'new');
  fixture.add(4, 'sample/pipeline/changes/old/revisions/rev1/l4/file.defs.ts', 'new history');
  fixture.add(4, 'sample/pipeline/releases/base1/layers.json', 'new seal');
  await compactModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  const compact = JSON.parse(fixture.contents.get(indexKey)!);
  assert.equal(compact.stage, 'compacted');
  assert.equal(compact.parts.length, 1);
  assert.ok(!fixture.contents.get(`102047:4:sample/pipeline/application:${compact.parts[0].name}.json`)!.includes(large.slice(0, 100)));
  assert.deepEqual(compact.parts.every((part: { name: string }) => fixture.contents.has(`102047:4:sample/pipeline/application:${part.name}.json`)), true);
  await restoreModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  assert.equal(fixture.contents.get('102047:1:sample:code.ts'), 'before');
  assert.equal(fixture.contents.get('102047:1:sample/pipeline/agentDefsL1:drafts.json'), large);
  assert.equal(fixture.contents.has('102047:2:sample/web:new.ts'), false);
  assert.equal(fixture.contents.get('102047:4:sample/pipeline/changes/old/revisions/rev1/l4:file.defs.ts'), 'new history');
  assert.equal(fixture.contents.get('102047:4:sample/pipeline/releases/base1:layers.json'), 'new seal');
  assert.equal(fixture.contents.has(indexKey), false);
});

test('mr_58 s2: missing checkpoint part refuses before touching module files', async () => {
  const fixture = installStorFixture();
  fixture.add(1, 'sample/code.ts', 'before');
  await sealModuleApplication(102047, 'sample', 'change-1', 'revision-1');
  const index = JSON.parse(fixture.contents.get('102047:4:sample/pipeline/application:undo.json')!);
  fixture.add(1, 'sample/code.ts', 'after');
  fixture.contents.delete(`102047:4:sample/pipeline/application:${index.parts[0].name}.json`);
  await assert.rejects(restoreModuleApplication(102047, 'sample', 'change-1', 'revision-1'), /module-seal.missing_part/);
  assert.equal(fixture.contents.get('102047:1:sample:code.ts'), 'after');
});
