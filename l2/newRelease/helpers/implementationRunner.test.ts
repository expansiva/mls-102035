import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createImplementationRunner } from './implementationRunner.js';
import { acceptL4Implementation, readL4Implementation, recordL4ImplementationPhase } from '../../solution/candidate/moduleImplementation.js';
import type { Ns5FileInfo } from '../../solution/fs.js';
import type { ExecutionContext, TaskData } from '/_102036_/l2/shared/interfaces.js';

const project = 102035;
const moduleName = 'fixture';

function fixture() {
  const previous = (globalThis as any).mls;
  const contents = new Map<string, string>();
  const key = (info: Ns5FileInfo) => `${info.project}:${info.level}:${info.folder}:${info.shortName}${info.extension}`;
  const makeTab = () => {
    const files: Record<string, any> = {};
    const add = (info: Ns5FileInfo) => files[key(info)] = { ...info, versionRef: '0', status: 'new',
      getValueInfo: async () => ({ content: contents.get(key(info)) }), getContent: async () => contents.get(key(info)),
    };
    return { stor: { files, getKeyToFile: key, addOrUpdateFile: async (info: Ns5FileInfo) => add(info),
      localStor: {
        setContent: async (info: Ns5FileInfo, value: { content: string }) => { contents.set(key(info), value.content); return true; },
      },
    }, editor: { models: {}, getKeyModel: () => '' }, add };
  };
  const first = makeTab();
  (globalThis as any).mls = first;
  const json = (folder: string, shortName: string, value: unknown) => {
    const info = { project, level: 4, folder: `${moduleName}/${folder}`, shortName, extension: '.json' };
    first.add(info); contents.set(key(info), JSON.stringify(value));
  };
  json('pipeline/changes', 'active', { changeId: 'change1' });
  json('pipeline/changes/change1', 'change', { project, moduleName, baseId: 'base1', changeId: 'change1', activeRevisionId: 'rev1', resultRevisionId: 'rev1' });
  const effort = JSON.parse(readFileSync(new URL('../../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url), 'utf8'));
  effort.module = moduleName;
  const effortSource = JSON.stringify(effort);
  json('pipeline/changes/change1/revisions/rev1/l4/pool/l4', 'changeEffort', effort);
  json('pipeline/releases/base1', 'layers', { schemaVersion: '2026-10-08-module-layers-v1', project, moduleName, baseId: 'base1', files: [] });
  const accept = () => acceptL4Implementation(project, moduleName, { revisionId: 'rev1', acceptedBy: 'user',
    hashes: { changeEffort: `sha256:${createHash('sha256').update(effortSource).digest('hex')}` } });
  const dispatched: string[] = [];
  const reads: string[][] = [];
  let status: TaskData['status'] = 'done';
  let sequence = 0;
  let beforeExecute: (() => Promise<void>) | undefined;
  const task = (id: string): TaskData => ({ PK: `task/#${id}`, SK: 'metadata', title: '', owner: 'user', team: null,
    status, last_updated: 0, last_update_log: status === 'failed' || status === 'paused' ? 'reason' : null, messageid_created: `thread/canonical-${id}` });
  const dependencies = {
    userId: () => 'user', now: () => '2026-10-08T00:00:00.000Z', thread: async () => ({ threadId: 'thread' }),
    context: (threadId: string, senderId: string, content: string): ExecutionContext => ({ task: undefined, isTest: true,
      message: { threadId, senderId, content, createAt: `temporary-${++sequence}`, orderAt: '' } }),
    execute: async (agent: string, ctx: ExecutionContext) => {
      const persisted = await readL4Implementation(project, moduleName);
      assert.equal(persisted?.phases.at(-1)?.status, 'running');
      assert.equal(persisted?.phases.at(-1)?.taskId, '');
      assert.equal(agent, ctx.message.content.split(' ')[0].slice(2));
      dispatched.push(ctx.message.content);
      await beforeExecute?.();
      ctx.task = task(String(dispatched.length));
    },
    task: async (user: string, id: string, message: string) => { reads.push([user, id, message]); return task(id); },
    message: async () => null,
  };
  return { accept, dependencies, dispatched, reads, makeTab, first, task,
    status: (value: TaskData['status']) => { status = value; }, beforeExecute: (value: () => Promise<void>) => { beforeExecute = value; },
    restore: () => { (globalThis as any).mls = previous; } };
}

test('mr_11 s1 exact table and order L2 then L1, completed phases never dispatch again', async () => {
  const f = fixture();
  try {
    await f.accept();
    const runner = createImplementationRunner(f.dependencies);
    assert.equal((await runner.runNext(project, moduleName)).phases[0].status, 'done');
    assert.equal((await runner.runNext(project, moduleName)).phases[1].status, 'done');
    await runner.runNext(project, moduleName);
    assert.deepEqual(f.dispatched, ['@@agentDefsL2 fixture', '@@agentDefsL1 fixture /run']);
  } finally { f.restore(); }
});

for (const status of ['failed', 'paused'] as const) test(`mr_11 s1 ${status} L2 stops L1 with reason`, async () => {
  const f = fixture();
  try {
    await f.accept(); f.status(status);
    const runner = createImplementationRunner(f.dependencies);
    const result = await runner.runNext(project, moduleName);
    assert.equal(result.phases[0].status, 'failed');
    assert.equal(result.phases[0].error, 'reason');
    assert.ok(result.phases[0].endedAt);
    await runner.runNext(project, moduleName);
    assert.equal(f.dispatched.length, 1);
  } finally { f.restore(); }
});

test('mr_11 s1 running is reread after runner recreation using canonical task/message', async () => {
  const f = fixture();
  try {
    await f.accept(); f.status('in progress');
    await createImplementationRunner(f.dependencies).runNext(project, moduleName);
    f.status('done');
    const result = await createImplementationRunner(f.dependencies).runNext(project, moduleName);
    assert.equal(result.phases[0].status, 'done');
    assert.deepEqual(f.reads, [['user', '1', 'thread/canonical-1']]);
    assert.equal(f.dispatched.length, 1);
  } finally { f.restore(); }
});

test('mr_11 s1 concurrent runners for one acceptance do not duplicate running phase', async () => {
  const f = fixture();
  try {
    await f.accept(); f.status('in progress');
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let entered!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    f.beforeExecute(async () => { entered(); await gate; });
    const first = createImplementationRunner(f.dependencies).runNext(project, moduleName);
    await ready;
    const second = createImplementationRunner(f.dependencies).runNext(project, moduleName);
    release();
    await Promise.all([first, second]);
    assert.equal(f.dispatched.length, 1);
    assert.deepEqual(f.reads, [['user', '1', 'thread/canonical-1']]);
  } finally { f.restore(); }
});

test('mr_11 s1 without acceptance refuses dispatch and record writes', async () => {
  const f = fixture();
  try {
    await assert.rejects(createImplementationRunner(f.dependencies).runNext(project, moduleName), /implementation.not_accepted/);
    assert.deepEqual(f.dispatched, []);
  } finally { f.restore(); }
});

test('mr_11 s1 only table commands can be recorded', async () => {
  const f = fixture();
  try {
    await f.accept();
    await assert.rejects(recordL4ImplementationPhase(project, moduleName, { name: 'defsL2', agent: 'agentDefsL2', command: '@@agentDefsL2 fixture /candidate',
      attempt: 1, status: 'running', taskId: '', threadId: 't', messageId: 't/m', startedAt: 'now' }), /implementation.invalid_command/);
    assert.deepEqual((await readL4Implementation(project, moduleName))?.phases, []);
  } finally { f.restore(); }
});

test('mr_11 s1 pending reservation recovers task instead of dispatching after reload', async () => {
  const f = fixture();
  try {
    await f.accept();
    await recordL4ImplementationPhase(project, moduleName, { name: 'defsL2', agent: 'agentDefsL2', command: '@@agentDefsL2 fixture',
      attempt: 1, status: 'running', taskId: '', threadId: 'thread', messageId: 'thread/temporary', startedAt: 'now' });
    const pending = await createImplementationRunner(f.dependencies).runNext(project, moduleName);
    assert.equal(pending.phases[0].status, 'running');
    const recovered = await createImplementationRunner({ ...f.dependencies,
      message: async () => ({ threadId: 'thread', createAt: 'temporary', orderAt: '', senderId: 'user', content: '', taskId: 'task/#9' }),
    }).runNext(project, moduleName);
    assert.equal(recovered.phases[0].taskId, '9');
    assert.equal(recovered.phases[0].messageId, 'thread/canonical-9');
    assert.deepEqual(f.dispatched, []);
  } finally { f.restore(); }
});

test('mr_11 s1 human retry preserves attempt one and refuses third attempt', async () => {
  const f = fixture();
  try {
    await f.accept(); f.status('failed');
    const runner = createImplementationRunner(f.dependencies);
    const first = (await runner.runNext(project, moduleName)).phases[0];
    const second = (await runner.retryPhase(project, moduleName, 'defsL2')).phases[0];
    assert.equal(second.attempt, 2);
    assert.deepEqual(second.previousAttempts, [first]);
    assert.equal(second.taskId, '2');
    await runner.runNext(project, moduleName);
    await assert.rejects(runner.retryPhase(project, moduleName, 'defsL2'), /implementation.retry_not_allowed/);
    await assert.rejects(runner.retryPhase(project, moduleName, 'defsL1'), /implementation.retry_not_allowed/);
    assert.equal(f.dispatched.length, 2);
  } finally { f.restore(); }
});

test('mr_11 s1 done records only its layer diff and retry running/done is refused', async () => {
  const f = fixture();
  try {
    await f.accept(); f.status('in progress');
    const runner = createImplementationRunner(f.dependencies);
    await runner.runNext(project, moduleName);
    await assert.rejects(runner.retryPhase(project, moduleName, 'defsL2'), /implementation.retry_not_allowed/);
    for (const level of [1, 2]) {
      const file = f.first.add({ project, level, folder: `${moduleName}/web`, shortName: 'sample', extension: '.defs.ts' });
      file.getValueInfo = async () => ({ content: 'export default {};' });
    }
    f.status('done');
    const record = await runner.runNext(project, moduleName);
    assert.deepEqual(record.phases[0].changedDefs, [{ path: 'web/sample.defs.ts', status: 'added' }]);
    await assert.rejects(runner.retryPhase(project, moduleName, 'defsL2'), /implementation.retry_not_allowed/);
    assert.deepEqual((await runner.runNext(project, moduleName)).phases[1].changedDefs, [{ path: 'web/sample.defs.ts', status: 'added' }]);
  } finally { f.restore(); }
});
