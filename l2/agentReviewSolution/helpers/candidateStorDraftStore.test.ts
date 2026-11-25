/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/candidateStorDraftStore.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { IndexedDbCandidateDraftStore } from '/_102035_/l2/agentReviewSolution/helpers/candidateDraftStore.js';
import { selectCandidateDraftStore, StorCandidateDraftStore } from '/_102035_/l2/agentReviewSolution/helpers/candidateStorDraftStore.js';

const scope = { project: 102047, moduleName: 'telegram' };

function install() {
  const previous = (globalThis as any).mls;
  const files: Record<string, any> = {};
  const contents = new Map<string, string>();
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
    actualProject: scope.project,
    stor: {
      files, getKeyToFile: keyOf, addOrUpdateFile: async (info: Ns5FileInfo) => add(info),
      localStor: {
        setContent: async (file: Ns5FileInfo, value: { content: string }) => { contents.set(keyOf(file), value.content); },
        deleteFile: async (file: Ns5FileInfo) => { contents.delete(keyOf(file)); delete files[keyOf(file)]; },
      },
    },
    editor: { models: {}, getKeyModel: () => '' },
    common: { crc: { crc32: () => 0 } },
  };
  return { contents, restore: () => { (globalThis as any).mls = previous; } };
}

const draft = (marker: string) => ({ marker } as never);
const KEY_A = 'candidate-drafts/102047/telegram/change-1/rev-1/sha256:aaaa';
const KEY_B = 'candidate-drafts/102047/telegram/change-1/rev-2/sha256:bbbb';

void test('l4_p4_168: the draft store of the work area creates, reads, lists, writes and removes', async () => {
  const env = install();
  try {
    const store = new StorCandidateDraftStore(scope);
    assert.equal(await store.read(KEY_A), null);
    assert.deepEqual(await store.create(KEY_A, draft('one')), draft('one'));
    assert.deepEqual(await store.read(KEY_A), draft('one'));
    await store.create(KEY_B, draft('two'));
    const listed = await store.list('candidate-drafts/102047/telegram');
    assert.deepEqual(listed.map(item => item.key), [KEY_A, KEY_B]);
    assert.deepEqual(await store.list('candidate-drafts/102047/other'), []);
    await store.write(KEY_A, draft('one-again'));
    assert.deepEqual(await store.read(KEY_A), draft('one-again'));
    // the drafts live in the work area of the module, outside the module
    assert.ok([...env.contents.keys()].every(key => key.includes('telegram/tobe/candidate/drafts:draft_')));
    await store.remove(KEY_A);
    assert.equal(await store.read(KEY_A), null);
    await store.remove(KEY_A); // removing what is not there is not an error
  } finally { env.restore(); }
});

void test('l4_p4_168: create never replaces what is stored at the key: it answers with the stored record', async () => {
  const env = install();
  try {
    const store = new StorCandidateDraftStore(scope);
    await store.create(KEY_A, draft('first'));
    assert.deepEqual(await store.create(KEY_A, draft('second')), draft('first'));
    assert.deepEqual(await store.read(KEY_A), draft('first'));
  } finally { env.restore(); }
});

void test('l4_p4_168: dispose removes what the store created and nothing else', async () => {
  const env = install();
  try {
    const store = new StorCandidateDraftStore(scope);
    await store.create(KEY_A, draft('one'));
    await store.write(KEY_B, draft('two'));
    const other = new StorCandidateDraftStore(scope);
    await other.create('candidate-drafts/102047/telegram/change-9/rev-9/sha256:cccc', draft('not mine'));
    await store.dispose();
    assert.equal(await store.read(KEY_A), null);
    assert.equal(await store.read(KEY_B), null);
    assert.equal([...env.contents.keys()].length, 1);
  } finally { env.restore(); }
});

void test('l4_p4_168: the environment chooses the store: no indexedDB means the work area, with a log line; with indexedDB, the one of today', () => {
  const env = install();
  const info = console.info;
  const lines: string[] = [];
  console.info = (...args: unknown[]) => { lines.push(args.join(' ')); };
  try {
    const none = selectCandidateDraftStore(scope);
    assert.equal(none.kind, 'stor');
    assert.ok(none.store instanceof StorCandidateDraftStore);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /no indexedDB.*telegram.*tobe\/candidate\/drafts/u);
    const factory = { open: () => { throw new Error('not opened here'); } } as unknown as IDBFactory;
    const browser = selectCandidateDraftStore(scope, factory);
    assert.equal(browser.kind, 'indexedDb');
    assert.ok(browser.store instanceof IndexedDbCandidateDraftStore);
    assert.equal(lines.length, 1);
  } finally { console.info = info; env.restore(); }
});
