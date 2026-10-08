import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createImplementationRunner } from './implementationRunner.js';
import { acceptL4Implementation, readL4Implementation, recordL4ImplementationPhase } from '../../solution/candidate/moduleImplementation.js';
import type { Ns5FileInfo } from '../../solution/fs.js';
import type { ExecutionContext, TaskData } from '/_102036_/l2/shared/interfaces.js';
import { mergeChangeEffort } from '../../solution/gates/changeEffort/gate.js';

const project = 102035;
const moduleName = 'fixture';

function fixture(work: 'materialize' | 'both' | 'agents' | 'twoAgents' | 'unknown' | 'force' | 'changes'
  | 'name' | 'project' | 'module' | 'keys' | 'malformed' = 'agents') {
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
  const command = '@@agentAddLanguage ' + JSON.stringify([{ languages: [{ code: 'pt-BR', name: 'pt-BR' }], projectId: project, moduleName }]);
  const agents = work === 'materialize' ? [] : work === 'unknown' ? [{ agent: 'other', command: '@@other' }]
    : work === 'force' ? [{ agent: 'agentAddLanguage', command: '@@agentAddLanguage ' + JSON.stringify([{ languages: [], projectId: project, moduleName, force: true }]) }]
    : work === 'changes' ? [{ agent: 'agentAddLanguage', command: '@@agentAddLanguage ' + JSON.stringify([{ languages: [], projectId: project, moduleName, changes: [] }]) }]
    : work === 'name' ? [{ agent: 'agentAddLanguage', command: command.replace('@@agentAddLanguage', '@@other') }]
    : work === 'project' ? [{ agent: 'agentAddLanguage', command: command.replace(`"projectId":${project}`, '"projectId":102047') }]
    : work === 'module' ? [{ agent: 'agentAddLanguage', command: command.replace(`"moduleName":"${moduleName}"`, '"moduleName":"other"') }]
    : work === 'keys' ? [{ agent: 'agentAddLanguage', command: command.replace('"name":"pt-BR"', '"extra":"pt-BR"') }]
    : work === 'malformed' ? [{ agent: 'agentAddLanguage', command: '@@agentAddLanguage []' }]
    : work === 'twoAgents' ? [{ agent: 'agentAddLanguage', command }, { agent: 'agentAddLanguage', command: command.replace('pt-BR', 'en-US') }] : [{ agent: 'agentAddLanguage', command }];
  for (const answer of effort.perItem[0].answers) {
    if (work !== 'materialize' && work !== 'both') answer.materialize = [];
    answer.runAgents = answer === effort.perItem[0].answers[0] ? agents : [];
  }
  effort.merged = mergeChangeEffort(effort.perItem);
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
  return { accept, dependencies, dispatched, reads, makeTab, first, task, command,
    status: (value: TaskData['status']) => { status = value; }, beforeExecute: (value: () => Promise<void>) => { beforeExecute = value; },
    restore: () => { (globalThis as any).mls = previous; } };
}

test('materialize is recorded and blocks every dispatch', async () => {
  for (const work of ['materialize', 'both'] as const) {
    const f = fixture(work);
    try {
      const accepted = await f.accept();
      assert.ok(accepted.merged.materialize.length);
      assert.equal(accepted.merged.runAgents.length, work === 'both' ? 1 : 0);
      const result = await createImplementationRunner(f.dependencies).runNext(project, moduleName);
      assert.deepEqual(result.phases, []);
      assert.deepEqual(f.dispatched, []);
    } finally { f.restore(); }
  }
});

test('one accepted language command dispatches exactly once', async () => {
  const f = fixture();
  try {
    const accepted = await f.accept();
    assert.deepEqual(accepted.merged.runAgents, [{ agent: 'agentAddLanguage', command: f.command }]);
    const runner = createImplementationRunner(f.dependencies);
    assert.equal((await runner.runNext(project, moduleName)).phases[0].status, 'done');
    await runner.runNext(project, moduleName);
    assert.deepEqual(f.dispatched, [f.command]);
  } finally { f.restore(); }
});

for (const status of ['failed', 'paused'] as const) test(`${status} blocks later commands and keeps the reason`, async () => {
  const f = fixture('twoAgents');
  try {
    const accepted = await f.accept(); f.status(status);
    const runner = createImplementationRunner(f.dependencies);
    const result = await runner.runNext(project, moduleName);
    assert.equal(result.phases[0].status, 'failed');
    assert.equal(result.phases[0].error, 'reason');
    assert.ok(result.phases[0].endedAt);
    await runner.runNext(project, moduleName);
    assert.deepEqual(f.dispatched, [accepted.merged.runAgents[0].command]);
  } finally { f.restore(); }
});

test('running phase is reread after runner recreation with canonical identity', async () => {
  const f = fixture();
  try {
    await f.accept(); f.status('in progress');
    await createImplementationRunner(f.dependencies).runNext(project, moduleName);
    f.status('done');
    const result = await createImplementationRunner(f.dependencies).runNext(project, moduleName);
    assert.equal(result.phases[0].status, 'done');
    assert.deepEqual(f.reads, [['user', '1', 'thread/canonical-1']]);
    assert.deepEqual(f.dispatched, [f.command]);
  } finally { f.restore(); }
});

test('concurrent runners reserve a command once', async () => {
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
    assert.deepEqual(f.dispatched, [f.command]);
    assert.deepEqual(f.reads, [['user', '1', 'thread/canonical-1']]);
  } finally { f.restore(); }
});

test('without acceptance, dispatch and phase writes fail', async () => {
  const f = fixture();
  try {
    await assert.rejects(createImplementationRunner(f.dependencies).runNext(project, moduleName), /implementation.not_accepted/);
    await assert.rejects(recordL4ImplementationPhase(project, moduleName, { name: 'runAgents:0', agent: 'agentAddLanguage', command: f.command,
      attempt: 1, status: 'running', taskId: '', threadId: 'thread', messageId: 'thread/temporary', startedAt: 'now' }), /implementation.not_accepted/);
    assert.deepEqual(f.dispatched, []);
  } finally { f.restore(); }
});

test('two commands of one agent keep distinct phase identities', async () => {
  const f = fixture('twoAgents');
  try {
    const accepted = await f.accept();
    assert.equal(accepted.merged.runAgents.length, 2);
    const runner = createImplementationRunner(f.dependencies);
    await runner.runNext(project, moduleName);
    const result = await runner.runNext(project, moduleName);
    assert.deepEqual(result.phases.map(phase => phase.name), ['runAgents:0', 'runAgents:1']);
    assert.equal(f.dispatched.length, 2);
  } finally { f.restore(); }
});

test('recorded phase must match the accepted index and command', async () => {
  const f = fixture();
  try {
    await f.accept();
    const phase = { name: 'runAgents:0', agent: 'agentAddLanguage', command: f.command,
      attempt: 1 as const, status: 'running' as const, taskId: '', threadId: 'thread', messageId: 'thread/temporary', startedAt: 'now' };
    for (const patch of [{ name: 'runAgents:1' }, { name: 'defsL2' }, { agent: 'other' }, { command: f.command.replace('pt-BR', 'en-US') }]) {
      await assert.rejects(recordL4ImplementationPhase(project, moduleName, { ...phase, ...patch }), /implementation.invalid_(phase|command)/);
    }
    assert.deepEqual((await readL4Implementation(project, moduleName))?.phases, []);
  } finally { f.restore(); }
});

for (const work of ['unknown', 'force', 'changes', 'name', 'project', 'module', 'keys', 'malformed'] as const) test(`${work} is rejected before dispatch`, async () => {
  const f = fixture(work);
  try {
    await f.accept();
    await assert.rejects(createImplementationRunner(f.dependencies).runNext(project, moduleName), /implementation.invalid_command/);
    assert.deepEqual(f.dispatched, []);
  } finally { f.restore(); }
});

test('reservation after reload does not redispatch', async () => {
  const f = fixture();
  try {
    await f.accept();
    await recordL4ImplementationPhase(project, moduleName, { name: 'runAgents:0', agent: 'agentAddLanguage', command: f.command,
      attempt: 1, status: 'running', taskId: '', threadId: 'thread', messageId: 'thread/temporary', startedAt: 'now' });
    await createImplementationRunner(f.dependencies).runNext(project, moduleName);
    const recovered = await createImplementationRunner({ ...f.dependencies,
      message: async () => ({ threadId: 'thread', createAt: 'temporary', orderAt: '', senderId: 'user', content: '', taskId: 'task/#9' }),
    }).runNext(project, moduleName);
    assert.equal(recovered.phases[0].taskId, '9');
    assert.equal(recovered.phases[0].messageId, 'thread/canonical-9');
    assert.deepEqual(f.dispatched, []);
  } finally { f.restore(); }
});

test('failed command allows one retry and preserves first attempt', async () => {
  const f = fixture();
  try {
    await f.accept(); f.status('failed');
    const runner = createImplementationRunner(f.dependencies);
    const first = (await runner.runNext(project, moduleName)).phases[0];
    const second = (await runner.retryPhase(project, moduleName, 'runAgents:0')).phases[0];
    assert.equal(second.attempt, 2);
    assert.deepEqual(second.previousAttempts, [first]);
    assert.equal(second.taskId, '2');
    await runner.runNext(project, moduleName);
    await assert.rejects(runner.retryPhase(project, moduleName, 'runAgents:0'), /implementation.retry_not_allowed/);
    await assert.rejects(runner.retryPhase(project, moduleName, 'runAgents:1'), /implementation.retry_not_allowed/);
    assert.equal(f.dispatched.length, 2);
  } finally { f.restore(); }
});

test('done captures changed defs and running or done cannot be retried', async () => {
  const f = fixture();
  try {
    await f.accept(); f.status('in progress');
    const runner = createImplementationRunner(f.dependencies);
    await runner.runNext(project, moduleName);
    await assert.rejects(runner.retryPhase(project, moduleName, 'runAgents:0'), /implementation.retry_not_allowed/);
    for (const level of [1, 2]) {
      const file = f.first.add({ project, level, folder: `${moduleName}/web`, shortName: 'sample', extension: '.defs.ts' });
      file.getValueInfo = async () => ({ content: 'export default {};' });
    }
    f.status('done');
    const record = await runner.runNext(project, moduleName);
    assert.deepEqual(record.phases[0].changedDefs, [
      { path: 'web/sample.defs.ts', status: 'added', level: 1 },
      { path: 'web/sample.defs.ts', status: 'added', level: 2 },
    ]);
    await assert.rejects(runner.retryPhase(project, moduleName, 'runAgents:0'), /implementation.retry_not_allowed/);
  } finally { f.restore(); }
});
