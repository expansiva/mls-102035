import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { diffModuleLayers, sealModuleLayers } from './moduleLayers.js';

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
    const dot = name.indexOf('.');
    const info = { project, level, folder: path.slice(0, slash), shortName: name.slice(0, dot), extension: name.slice(dot) };
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
  assert.deepEqual(JSON.parse(fixture.contents.get('102047:4:sample/pipeline/releases/base-1:layers.json')!), seal);
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
