import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptL4Implementation, L4_IMPLEMENTATION_SCHEMA, readL4Implementation } from './moduleImplementation.js';
import { L4_REVISION_SCHEMA } from './moduleRevision.js';
import type { Ns5FileInfo } from '../fs.js';

const project = 102035;
const moduleName = 'fixture';
const input = { revisionId: 'rev1', acceptedBy: 'reviewer', hashes: { menu: 'menu1', backend: 'backend1', effort: 'effort1' } };

function installStorFixture() {
  const previous = (globalThis as any).mls;
  const files: Record<string, any> = {};
  const contents = new Map<string, string>();
  let writes = 0;
  const keyOf = (info: Ns5FileInfo) => `${info.project}:${info.level}:${info.folder}:${info.shortName}${info.extension}`;
  const add = (info: Ns5FileInfo, content = '') => {
    const key = keyOf(info);
    contents.set(key, content);
    return files[key] = { ...info, status: 'unchanged', versionRef: '1',
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
  const json = (folder: string, shortName: string, value: unknown) => add({ project, level: 4, folder: `${moduleName}/${folder}`, shortName, extension: '.json' }, JSON.stringify(value));
  const activate = (changeId = 'change1', activeRevisionId: string | null = 'rev1', resultRevisionId: string | null = 'rev1') => {
    json('pipeline/changes', 'active', { changeId });
    json(`pipeline/changes/${changeId}`, 'change', {
      schemaVersion: L4_REVISION_SCHEMA, project, moduleName, changeId, baseId: 'base1',
      activeRevisionId, resultRevisionId, requestRevision: 1, sourcePrompt: 'pedido', updatedAt: '2026-10-08T00:00:00.000Z',
    });
  };
  return { activate, contents, writes: () => writes, restore: () => { (globalThis as any).mls = previous; } };
}

test('mr_10 s1 accepts the current result and persists the change record', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    const record = await acceptL4Implementation(project, moduleName, input);
    assert.deepEqual(record, { schemaVersion: L4_IMPLEMENTATION_SCHEMA, changeId: 'change1', ...input, acceptedAt: record.acceptedAt, phases: [] });
    assert.ok(Number.isFinite(Date.parse(record.acceptedAt)));
    assert.deepEqual(await readL4Implementation(project, moduleName), record);
    assert.ok(fixture.contents.has(`${project}:4:fixture/pipeline/changes/change1:implementation.json`));
  } finally { fixture.restore(); }
});

test('mr_10 s1 repetition preserves acceptance without writing', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    const record = await acceptL4Implementation(project, moduleName, input);
    const writes = fixture.writes();
    assert.deepEqual(await acceptL4Implementation(project, moduleName, { ...input, acceptedBy: 'other' }), record);
    assert.equal(fixture.writes(), writes);
  } finally { fixture.restore(); }
});

test('mr_10 s1 different hashes or revision conflict without overwriting acceptance', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    const record = await acceptL4Implementation(project, moduleName, input);
    const writes = fixture.writes();
    for (const key of ['menu', 'backend', 'effort'] as const) {
      await assert.rejects(acceptL4Implementation(project, moduleName, { ...input, hashes: { ...input.hashes, [key]: 'different' } }), /l4.implementation_conflict/);
    }
    fixture.activate('change1', 'rev2', 'rev2');
    await assert.rejects(acceptL4Implementation(project, moduleName, { ...input, revisionId: 'rev2' }), /l4.implementation_conflict/);
    assert.equal(fixture.writes(), writes);
    assert.deepEqual(await readL4Implementation(project, moduleName), record);
  } finally { fixture.restore(); }
});

test('mr_10 s1 missing or stale result is not ready', async () => {
  const fixture = installStorFixture();
  try {
    assert.equal(await readL4Implementation(project, moduleName), null);
    await assert.rejects(acceptL4Implementation(project, moduleName, input), /l4.implementation_not_ready/);
    for (const [active, result] of [['rev1', null], ['rev2', 'rev1'], ['rev1', 'rev2'], [null, null]]) {
      fixture.activate('change1', active, result);
      await assert.rejects(acceptL4Implementation(project, moduleName, input), /l4.implementation_not_ready/);
    }
    assert.equal(fixture.writes(), 0);
  } finally { fixture.restore(); }
});

test('mr_10 s1 a new change does not inherit acceptance', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    await acceptL4Implementation(project, moduleName, input);
    fixture.activate('change2');
    assert.equal(await readL4Implementation(project, moduleName), null);
    assert.equal((await acceptL4Implementation(project, moduleName, input)).changeId, 'change2');
  } finally { fixture.restore(); }
});

test('mr_10 s1 concurrent different hashes accept only one record', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    const results = await Promise.allSettled([
      acceptL4Implementation(project, moduleName, input),
      acceptL4Implementation(project, moduleName, { ...input, hashes: { ...input.hashes, menu: 'different' } }),
    ]);
    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[1].status, 'rejected');
    if (results[1].status === 'rejected') assert.match(results[1].reason.message, /l4.implementation_conflict/);
    assert.deepEqual((await readL4Implementation(project, moduleName))?.hashes, input.hashes);
  } finally { fixture.restore(); }
});
