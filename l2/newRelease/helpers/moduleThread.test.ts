/// <mls fileReference="_102035_/l2/newRelease/helpers/moduleThread.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { installMlsStub } from '../../../../test/mlsStub.js';
import { resolveModuleThread } from './moduleThread.js';
import { moduleFolder, preserveModuleRoots, setModuleRoot } from '/_102035_/l2/solution/fs.js';
import type { Ns5PipelineState } from '/_102035_/l2/solution/types.js';

const pipeline = (messageThreadId?: string): Ns5PipelineState => ({
  schemaVersion: 1, flowId: 'ns5', moduleName: 'comanda', status: 'done', sourcePrompt: 'x',
  ...(messageThreadId ? { messageThreadId } : {}),
} as Ns5PipelineState);

test('a stored messageThreadId is used and createThread is not called', async () => {
  let created = 0;
  const thread = await resolveModuleThread(102047, 'comanda', {
    read: async () => pipeline('thread.module-1'),
    create: async () => { created += 1; return { threadId: 'other' }; },
    write: async () => { throw new Error('must not write'); },
  });
  assert.equal(thread.threadId, 'thread.module-1');
  assert.equal(created, 0);
});

test('an old module creates one thread, stores it, and the next request reuses it', async () => {
  let stored: Ns5PipelineState | null = pipeline();
  const names: string[] = [];
  const read = async () => stored;
  const write = async (_project: number, state: Ns5PipelineState) => { stored = state; };
  const create = async (moduleName: string) => { names.push(moduleName); return { threadId: 'created-once' }; };
  const first = await resolveModuleThread(102047, 'comanda', { read, write, create });
  const second = await resolveModuleThread(102047, 'comanda', { read, write, create });
  assert.deepEqual(names, ['comanda']);
  assert.equal(first.threadId, 'created-once');
  assert.equal(second.threadId, 'created-once');
  assert.equal(stored?.messageThreadId, 'created-once');
});

test('an invalid stored id is refused with a reason and does not create another thread', async () => {
  let created = 0;
  await assert.rejects(
    resolveModuleThread(102047, 'comanda', {
      read: async () => pipeline('not a token'),
      create: async () => { created += 1; return { threadId: 'new' }; },
    }),
    /new-release\.thread_invalid:not a token/,
  );
  assert.equal(created, 0);
});

test('a membership refusal while creating does not store another thread', async () => {
  let writes = 0;
  await assert.rejects(
    resolveModuleThread(102047, 'comanda', {
      read: async () => pipeline(),
      create: async () => { throw new Error('User is not a member of this thread'); },
      write: async () => { writes += 1; },
    }),
    /new-release\.thread_forbidden:User is not a member of this thread/,
  );
  assert.equal(writes, 0);
});

test('the thread is read from the canonical pipeline while the agent root points at tobe/plan, twice, without creating another', async () => {
  installMlsStub({ actualProject: 102047 });
  const key = (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
  const stor = (globalThis as unknown as { mls: { stor: Record<string, unknown> } }).mls.stor;
  const content = JSON.stringify(pipeline('thread.module-1'));
  stor.getKeyToFile = key;
  stor.files = {
    [key({ project: 102047, level: 4, folder: 'comanda/pipeline', shortName: 'pipeline', extension: '.json' })]: {
      status: 'unchanged', versionRef: '1', getValueInfo: async () => ({ content }), getContent: async () => content,
    },
  };
  setModuleRoot('comanda', 'comanda/tobe/plan');
  assert.equal(moduleFolder('comanda'), 'comanda/tobe/plan');
  const create = async () => { throw new Error('must not create'); };
  const first = await resolveModuleThread(102047, 'comanda', { create });
  const second = await resolveModuleThread(102047, 'comanda', { create });
  assert.equal(first.threadId, 'thread.module-1');
  assert.equal(second.threadId, 'thread.module-1');
  setModuleRoot('comanda', null);
});

test('preserveModuleRoots puts the root back after the run and after an error', async () => {
  installMlsStub({ actualProject: 102047 });
  setModuleRoot('comanda', 'comanda/tobe/plan');
  await preserveModuleRoots(async () => { setModuleRoot('comanda', null); setModuleRoot('other', 'other/tobe/plan'); });
  assert.equal(moduleFolder('comanda'), 'comanda/tobe/plan');
  assert.equal(moduleFolder('other'), 'other');
  await assert.rejects(preserveModuleRoots(async () => { setModuleRoot('comanda', 'x'); throw new Error('boom'); }), /boom/);
  assert.equal(moduleFolder('comanda'), 'comanda/tobe/plan');
  setModuleRoot('comanda', null);
});
