import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { adoptL4ReviewResult, L4_REVISION_SCHEMA, originalL4FileInfo, readActiveL4Change, readActiveSealedL4Candidate, readL4Revision, writeL4OutputRevision } from './moduleRevision.js';
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
  return { sources, json, contents, writes: () => writes, restore: () => { (globalThis as any).mls = previous; } };
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

test('mr_25 s1 adopts output hashes and active sealed revision, then repeats without writes', async () => {
  const fixture = installStorFixture();
  try {
    const change = installActiveChange(fixture);
    fixture.json('tobe/plan', 'tobe', { explicitEdits: 'preserved' });
    const before = new Map(fixture.contents);
    const output = await writeL4OutputRevision(project, moduleName, inputFor(fixture.sources));
    const input = { inputRevisionId: 'rev1', outputRevisionId: 'rev2' };
    const adopted = await adoptL4ReviewResult(project, moduleName, input);
    assert.deepEqual(adopted, { ...change, activeRevisionId: 'rev2', resultRevisionId: 'rev2', updatedAt: adopted.updatedAt });
    assert.deepEqual(await readActiveL4Change(project, moduleName), adopted);
    const mirrorHashes = Object.fromEntries(fixture.sources.map(({ path }) => {
      const source = fixture.contents.get(`${project}:4:${moduleName}/tobe/plan${path.includes('/') ? '/' + path.slice(0, path.lastIndexOf('/')) : ''}:${path.slice(path.lastIndexOf('/') + 1)}`);
      assert.ok(source);
      return [path, hash(source)];
    }));
    assert.deepEqual(mirrorHashes, output.files);
    assert.deepEqual((await readActiveSealedL4Candidate(project, moduleName))?.manifest, output);
    assert.equal(fixture.contents.get(`${project}:4:${moduleName}/tobe/plan:tobe.json`), before.get(`${project}:4:${moduleName}/tobe/plan:tobe.json`));
    const writes = fixture.writes();
    const contents = new Map(fixture.contents);
    assert.deepEqual(await adoptL4ReviewResult(project, moduleName, input), adopted);
    assert.equal(fixture.writes(), writes);
    assert.deepEqual(fixture.contents, contents);
  } finally { fixture.restore(); }
});

test('mr_25 s1 rejects a stale input without changing storage', async () => {
  const fixture = installStorFixture();
  try {
    installActiveChange(fixture, 'rev3');
    await writeL4OutputRevision(project, moduleName, inputFor(fixture.sources));
    const contents = new Map(fixture.contents);
    const writes = fixture.writes();
    await assert.rejects(adoptL4ReviewResult(project, moduleName, { inputRevisionId: 'rev1', outputRevisionId: 'rev2' }), /l4.result_stale/);
    assert.equal(fixture.writes(), writes);
    assert.deepEqual(fixture.contents, contents);
  } finally { fixture.restore(); }
});

test('mr_25 s1 rejects an unreadable output without changing storage', async () => {
  const fixture = installStorFixture();
  try {
    installActiveChange(fixture);
    const contents = new Map(fixture.contents);
    const writes = fixture.writes();
    await assert.rejects(adoptL4ReviewResult(project, moduleName, { inputRevisionId: 'rev1', outputRevisionId: 'rev2' }), /l4.result_unreadable/);
    assert.equal(fixture.writes(), writes);
    assert.deepEqual(fixture.contents, contents);
  } finally { fixture.restore(); }
});

test('mr_23 s1 persists the complete valid release with text hashes', async () => {
  const fixture = installStorFixture();
  try {
    const input = inputFor(fixture.sources);
    const result = await writeL4OutputRevision(project, moduleName, input);
    assert.deepEqual(await readL4Revision(project, moduleName, input.changeId, input.revisionId), result);
    assert.deepEqual(result.files, Object.fromEntries(fixture.sources.map(item => [item.path, hash(item.source)])));
    assert.equal(Object.keys(result.files).length, 7);
    assert.equal(result.requestHash, input.requestHash);
    assert.deepEqual(result.changedPaths, input.changedPaths);
  } finally { fixture.restore(); }
});

test('mr_23 s1 repeating identical sources returns the same manifest without writes', async () => {
  const fixture = installStorFixture();
  try {
    const input = inputFor(fixture.sources);
    const result = await writeL4OutputRevision(project, moduleName, input);
    const writes = fixture.writes();
    assert.deepEqual(await writeL4OutputRevision(project, moduleName, input), result);
    assert.equal(fixture.writes(), writes);
  } finally { fixture.restore(); }
});

test('mr_23 s1 conflicting source preserves the immutable revision', async () => {
  const fixture = installStorFixture();
  try {
    const input = inputFor(fixture.sources);
    const result = await writeL4OutputRevision(project, moduleName, input);
    const writes = fixture.writes();
    const sources = input.sources.map((item, index) => ({ ...item, source: item.source + (index === 0 ? '// conflict' : '') }));
    await assert.rejects(writeL4OutputRevision(project, moduleName, { ...input, sources }), /l4.output_revision_conflict/);
    assert.equal(fixture.writes(), writes);
    assert.deepEqual(await readL4Revision(project, moduleName, input.changeId, input.revisionId), result);
  } finally { fixture.restore(); }
});

test('mr_23 s1 rejects missing or duplicate release paths without writes', async () => {
  const fixture = installStorFixture();
  try {
    const input = inputFor(fixture.sources);
    for (const sources of [input.sources.slice(1), [...input.sources.slice(1), input.sources[1]]]) {
      await assert.rejects(writeL4OutputRevision(project, moduleName, { ...input, sources }), /l4.output_revision_paths/);
    }
    assert.equal(fixture.writes(), 0);
  } finally { fixture.restore(); }
});
