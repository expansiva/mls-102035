import { completeTobeImplementation } from '../tobe.js';
import { readActiveL4Change } from '../../solution/candidate/moduleRevision.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createImplementationRunner } from './implementationRunner.js';
import { acceptL4Implementation, readL4Implementation, readLatestCompletedL4Implementation, recordL4ImplementationPhase, readInitialImplementationPlan, INITIAL_PLAN_PATHS } from '../../solution/candidate/moduleImplementation.js';
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
  json('pipeline/changes/change1', 'change', { project, moduleName, baseId: 'base1', changeId: 'change1', activeRevisionId: 'rev1', resultRevisionId: 'rev1', promotedRevisionId: 'rev1' });
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
    message: async () => ({ taskResults: ['@@agentMaterializeL1 {\"scope\":\"fixture\"}', command] } as any),
  };
  return { accept, dependencies, dispatched, reads, makeTab, first, task, command, contents, key,
    status: (value: TaskData['status']) => { status = value; }, beforeExecute: (value: () => Promise<void>) => { beforeExecute = value; },
    restore: () => { (globalThis as any).mls = previous; } };
}

test('mr39 s10: structural effort executes L2 then L1 then returned commands', async () => {
  for (const work of ['materialize', 'both'] as const) {
    const f = fixture(work);
    try {
      const accepted = await f.accept();
      assert.ok(accepted.merged.materialize.length);
      assert.equal(accepted.merged.runAgents.length, work === 'both' ? 1 : 0);
      const runner = createImplementationRunner(f.dependencies);
      for (let index = 0; index < 6; index++) await runner.runNext(project, moduleName);
      assert.deepEqual(f.dispatched.slice(0, 5), ['@@agentNewReleaseL2 fixture', '@@agentNewReleaseL1 fixture', '@@agentDefsL1 fixture /run', '@@agentNewReleaseL1 fixture /compare', '@@agentMaterializeL1 {\"scope\":\"fixture\"}']);
      assert.equal(f.dispatched.length, work === 'both' ? 6 : 5);
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

test('mr39 s10: failure in each structural phase stops every later dispatch', async () => {
  for (let failed = 0; failed < 5; failed++) {
    const f = fixture('both');
    try {
      await f.accept();
      const runner = createImplementationRunner(f.dependencies);
      for (let index = 0; index < failed; index++) await runner.runNext(project, moduleName);
      f.status('failed');
      await runner.runNext(project, moduleName);
      await runner.runNext(project, moduleName);
      assert.equal(f.dispatched.length, failed + 1);
      assert.equal((await readL4Implementation(project, moduleName))?.phases.at(-1)?.error, 'reason');
    } finally { f.restore(); }
  }
});

for (const failed of [1, 3]) test(`mr39 s10: done task with refusal at L1 phase ${failed} stops the chain`, async () => {
  const f = fixture('both');
  try {
    await f.accept();
    const runner = createImplementationRunner(f.dependencies);
    for (let index = 0; index < failed; index++) await runner.runNext(project, moduleName);
    f.dependencies.message = async () => ({ taskResults: [failed === 1 ? 'refused: no matching effort' : 'failed: source outside effort'] } as any);
    const observing = createImplementationRunner(f.dependencies);
    const record = await observing.runNext(project, moduleName);
    assert.equal(record.phases.at(-1)?.status, 'failed');
    assert.match(record.phases.at(-1)?.error || '', /^(refused|failed):/u);
    await observing.runNext(project, moduleName);
    assert.equal(f.dispatched.length, failed + 1);
  } finally { f.restore(); }
});
test('mr39 s10: only a completed implementation retires the active change and retains its fechos', async () => {
  const f = fixture('both');
  try {
    await f.accept();
    await assert.rejects(completeTobeImplementation(project, moduleName, 'change1', 'rev1'), /implementation.not_complete/u);
    assert.ok(await readActiveL4Change(project, moduleName));
    const runner = createImplementationRunner(f.dependencies);
    for (let index = 0; index < 6; index++) await runner.runNext(project, moduleName);
    await assert.rejects(completeTobeImplementation(project, moduleName, 'change1', 'other'), /l4.implementation_conflict/u);
    await completeTobeImplementation(project, moduleName, 'change1', 'rev1');
    assert.equal(await readActiveL4Change(project, moduleName), null);
    const history = await readLatestCompletedL4Implementation(project, moduleName);
    assert.equal(history?.phases.length, 6);
    assert.ok(history?.phases[0].report);
  } finally { f.restore(); }
});

test('mr39 s10: a missing returned command is persisted and cannot be dispatched by retry', async () => {
  const f = fixture('both');
  try {
    await f.accept();
    const runner = createImplementationRunner(f.dependencies);
    for (let index = 0; index < 4; index++) await runner.runNext(project, moduleName);
    const stored = await readL4Implementation(project, moduleName);
    await recordL4ImplementationPhase(project, moduleName, { ...stored!.phases[3], report: 'done: comparison completed without a command' });
    const record = await runner.runNext(project, moduleName);
    assert.equal(record.phases[4].status, 'failed');
    assert.equal(record.phases[4].error, 'review.implementation.error.missingCommand');
    assert.equal(f.dispatched.length, 4);
    await assert.rejects(runner.retryPhase(project, moduleName, 'runAgents:4'), /implementation.retry_not_allowed/u);
  } finally { f.restore(); }
});


test('identity resolution is awaited and its original failure propagates before dispatch', async () => {
  const f = fixture();
  try {
    await f.accept();
    const failure = new Error('collab_messages_user_unavailable: cm offline');
    await assert.rejects(createImplementationRunner({ ...f.dependencies,
      userId: async () => { throw failure; },
    }).runNext(project, moduleName), error => error === failure);
    assert.equal(f.dispatched.length, 0);
    await createImplementationRunner({ ...f.dependencies, userId: async () => 'resolved-user',
      context: (threadId, senderId, content) => {
        assert.equal(senderId, 'resolved-user');
        return f.dependencies.context(threadId, senderId, content);
      },
    }).runNext(project, moduleName);
    assert.equal(f.dispatched.length, 1);
  } finally { f.restore(); }
});


async function initialRunnerFixture(replan = false) {
  const f = fixture();
  const record = await f.accept();
  const promotedAt = '2026-10-29T10:01:00.000Z';
  const start = '2026-10-29T10:02:00.000Z';
  const writtenAt = '2026-10-29T10:03:00.000Z';
  const put = (path: string, value: unknown, date = writtenAt) => {
    const slash = path.lastIndexOf('/');
    const defs = path.endsWith('.defs.ts');
    const extension = defs ? '.defs.ts' : path.endsWith('.ts') ? '.ts' : '.json';
    const info: Ns5FileInfo = { project, level: Number(path[1]), folder: path.slice(3, slash), shortName: path.slice(slash + 1, -extension.length), extension };
    const file = f.first.add(info);
    file.updatedAt = date;
    f.contents.set(f.key(info), extension.endsWith('.ts') ? String(value) : JSON.stringify(value));
    return file;
  };
  put(`l4/${moduleName}/module.defs.ts`, 'export const fixture = {};', '2026-10-29T10:00:00.000Z');
  const plans = (date = writtenAt, generation = 1) => {
    for (const path of INITIAL_PLAN_PATHS) put(`l4/${moduleName}/${path}`, { moduleName, generation }, date);
    for (const side of ['l1', 'l2']) put(`l4/${moduleName}/pool/${side}/pipeline.json`, { moduleName, status: 'complete', thread: `plan-${generation}` }, date);
    put(`l4/${moduleName}/pipeline/pipeline.json`, { moduleName, status: 'complete', plOrchestration: [{ l1: 'done', l2: 'done', effort: 'done' }] }, date);
  };
  plans('2026-10-29T10:00:30.000Z');
  const plan = await readInitialImplementationPlan(project, moduleName);
  record.hashes = { plans: plan.hashes };
  record.merged = { create: [], regenerateDefs: [], materialize: [], remove: [], runAgents: [], abend: [] };
  record.initial = { plan, promotedAt, replan };
  record.phases = [];
  put(`l4/${moduleName}/pipeline/changes/change1/implementation.json`, record);
  let defect = '';
  const output = async (agent: string) => {
    if (agent === 'agentPlannerL4') {
      plans(defect === 'old-plans' ? promotedAt : writtenAt, 2);
      if (defect === 'planner') put(`l4/${moduleName}/pool/l1/pipeline.json`, { moduleName, status: 'partial', thread: 'plan-2' });
      return;
    }
    const identity = { project, moduleName };
    if (agent === 'agentDefsL2') {
      const current = await readInitialImplementationPlan(project, moduleName);
      put(`l2/${moduleName}/pipeline/agentDefsL2/input.json`, {
        project, module: moduleName, snapshotHash: 'snapshot-d2', sources: INITIAL_PLAN_PATHS.map(path => ({ path: `l4/${moduleName}/${path}`, sha256: defect === 'input-plan' ? 'foreign' : current.hashes[path] })),
      });
      put(`l2/${moduleName}/pipeline/agentDefsL2/pipeline.json`, { project, module: moduleName, status: 'complete', steps: { finalize80: { status: defect === 'defs-l2' ? 'failed' : 'approved', snapshotHash: 'snapshot-d2' } } });
      put(`l2/${moduleName}/pipeline/agentDefsL2/finalize80/report.json`, { project, module: moduleName, status: 'complete', snapshotHash: 'snapshot-d2', artifactPaths: [`l2/${moduleName}/web/contracts/home.defs.ts`] });
      if (defect !== 'missing-defs') put(`l2/${moduleName}/web/contracts/home.defs.ts`, 'export const home = {};');
    } else if (agent === 'agentDefsL1') {
      put(`l1/${moduleName}/pipeline/agentDefsL1/pipeline.json`, { ...identity, status: 'complete', steps: { finalize80: { status: 'approved' } } });
      put(`l1/${moduleName}/pipeline/agentDefsL1/report.json`, { ...identity, outcome: defect === 'defs-l1' ? 'blocked' : 'complete', defsStatus: 'complete' });
    } else if (agent === 'agentMaterializeL2') {
      put(`l2/${moduleName}/pipeline/agentMaterializeL2/finalize70.json`, { project, module: moduleName, notApproved: defect === 'materialize-l2' ? ['home'] : [] });
      if (defect !== 'missing-product') put(`l2/${moduleName}/web/desktop/home.ts`, 'export const home = {};');
    } else if (agent === 'agentMaterializeL1') {
      put(`l1/${moduleName}/pipeline/agentMaterializeL1/report.json`, { ...identity, status: defect === 'materialize-l1' ? 'partial' : 'complete' });
    }
  };
  f.dependencies.now = () => start;
  f.dependencies.message = async () => ({ taskResults: [defect === 'refusal' ? 'failed: producer rejected input' : 'done'] } as any);
  f.beforeExecute(async () => {
    if (defect === 'no-output') return;
    await output(f.dispatched.at(-1)!.split(' ')[0].slice(2));
  });
  return { ...f, put, plans, output, defect: (value: string) => { defect = value; }, start, writtenAt, promotedAt };
}

for (const replan of [false, true]) test(`mr41 s3b initial ${replan ? 'replanned' : 'fresh'} executes ordered barriers and persists D2 plan identity`, async () => {
  const f = await initialRunnerFixture(replan);
  try {
    const runner = createImplementationRunner(f.dependencies);
    for (let i = 0; i < 7; i++) await runner.runNext(project, moduleName);
    const record = (await readL4Implementation(project, moduleName))!;
    assert.deepEqual(f.dispatched, [
      ...(replan ? ['@@agentPlannerL4 fixture'] : []), '@@agentDefsL2 fixture', '@@agentDefsL1 fixture /run', '@@agentMaterializeL2 fixture', '@@agentMaterializeL1 {"scope":"fixture"}',
    ]);
    assert.ok(record.phases.every(phase => phase.status === 'done'));
    const d2 = record.phases.find(phase => phase.agent === 'agentDefsL2')!;
    const planner = record.phases.find(phase => phase.agent === 'agentPlannerL4');
    assert.deepEqual(d2.plan?.hashes, replan ? planner?.plan?.hashes : record.initial?.plan.hashes);
    if (replan) assert.notDeepEqual(d2.plan?.hashes, record.initial?.plan.hashes);
    assert.deepEqual(record.phases.at(-1)?.plan, d2.plan);
  } finally { f.restore(); }
});

for (const [defect, index] of [['planner', 0], ['old-plans', 0], ['defs-l2', 1], ['missing-defs', 1], ['input-plan', 1], ['defs-l1', 2], ['materialize-l2', 3], ['missing-product', 3], ['materialize-l1', 4]] as const) {
  test(`mr41 s3b ${defect} barrier persists failure and never dispatches following phase`, async () => {
    const f = await initialRunnerFixture(true);
    try {
      const runner = createImplementationRunner(f.dependencies);
      for (let i = 0; i < index; i++) await runner.runNext(project, moduleName);
      f.defect(defect);
      if (defect === 'missing-product') {
        f.put('l2/fixture/pipeline/helper.ts', 'export {};');
        f.put('l2/fixture/web/home.test.ts', 'export {};');
        f.put('l2/other/web/home.ts', 'export {};');
        f.put('l2/fixture/web/deleted.ts', 'export {};').status = 'deleted';
      }
      const result = await runner.runNext(project, moduleName);
      assert.equal(result.phases[index].status, 'failed');
      assert.equal(result.phases[index].error, 'review.implementation.error.run');
      assert.match(result.phases[index].report!, /implementation\.barrier|implementation_not_ready/);
      if (defect === 'missing-product') assert.match(result.phases[index].report!, /product_source_missing/);
      await runner.runNext(project, moduleName);
      assert.equal(f.dispatched.length, index + 1);
    } finally { f.restore(); }
  });
}

test('mr41 s3b task done without output or with textual refusal does not pass a barrier', async () => {
  for (const defect of ['no-output', 'refusal']) {
    const f = await initialRunnerFixture();
    try {
      f.defect(defect);
      const runner = createImplementationRunner(f.dependencies);
      const result = await runner.runNext(project, moduleName);
      assert.equal(result.phases[0].status, 'failed');
      if (defect === 'refusal') assert.equal(result.phases[0].error, 'failed: producer rejected input');
      await runner.runNext(project, moduleName);
      assert.equal(f.dispatched.length, 1);
    } finally { f.restore(); }
  }
});

test('mr41 s3b pool changed after planning blocks D2 before dispatch', async () => {
  const f = await initialRunnerFixture(true);
  try {
    const runner = createImplementationRunner(f.dependencies);
    await runner.runNext(project, moduleName);
    f.put(`l4/${moduleName}/pool/l2/web/menu.json`, { moduleName, changed: true });
    const result = await runner.runNext(project, moduleName);
    assert.equal(result.phases[1].status, 'failed');
    assert.match(result.phases[1].report!, /planning_changed/);
    assert.equal(f.dispatched.length, 1);
  } finally { f.restore(); }
});

test('mr41 s3b retry preserves failed attempt and reload observes without duplicate dispatch', async () => {
  const f = await initialRunnerFixture();
  try {
    f.defect('defs-l2');
    await createImplementationRunner(f.dependencies).runNext(project, moduleName);
    f.defect('');
    f.status('in progress');
    await createImplementationRunner(f.dependencies).retryPhase(project, moduleName, 'runAgents:0');
    f.status('done');
    const record = await createImplementationRunner(f.dependencies).runNext(project, moduleName);
    assert.equal(record.phases[0].status, 'done');
    assert.equal(record.phases[0].attempt, 2);
    assert.equal(record.phases[0].previousAttempts?.[0].status, 'failed');
    assert.equal(record.phases[0].taskId, '2');
    assert.equal(f.dispatched.length, 2);
    assert.ok(record.phases[0].plan);
  } finally { f.restore(); }
});


for (const [agent, path, index] of [
  ['agentDefsL2', 'l2/fixture/pipeline/agentDefsL2/pipeline.json', 0],
  ['agentDefsL1', 'l1/fixture/pipeline/agentDefsL1/report.json', 1],
  ['agentMaterializeL2', 'l2/fixture/pipeline/agentMaterializeL2/finalize70.json', 2],
  ['agentMaterializeL1', 'l1/fixture/pipeline/agentMaterializeL1/report.json', 3],
] as const) {
  test(`mr41 s3b ${agent} refuses an old complete receipt`, async () => {
    const f = await initialRunnerFixture();
    try {
      const runner = createImplementationRunner(f.dependencies);
      for (let i = 0; i < index; i++) await runner.runNext(project, moduleName);
      f.beforeExecute(async () => {
        await f.output(agent);
        const slash = path.lastIndexOf('/');
        const key = f.key({ project, level: Number(path[1]), folder: path.slice(3, slash), shortName: path.slice(slash + 1, -5), extension: '.json' });
        f.first.stor.files[key].updatedAt = f.promotedAt;
      });
      const result = await runner.runNext(project, moduleName);
      assert.equal(result.phases[index].status, 'failed');
      assert.match(result.phases[index].report!, /stale/);
      await runner.runNext(project, moduleName);
      assert.equal(f.dispatched.length, index + 1);
    } finally { f.restore(); }
  });
}


function allowMenuDelete(f: { first: { stor: { localStor: { deleteFile?: (file: { status: string }) => void } }; events?: { fireFileAction: () => void } } }): void {
  f.first.stor.localStor.deleteFile = file => { file.status = 'deleted'; };
  f.first.events = { fireFileAction() {} };
}

test('p4_79 s1: a finished initial chain removes pool menu.json and a later load does not require it', async () => {
  const f = await initialRunnerFixture();
  try {
    allowMenuDelete(f);
    const runner = createImplementationRunner(f.dependencies);
    for (let i = 0; i < 4; i++) await runner.runNext(project, moduleName);
    const record = await runner.runNext(project, moduleName);
    const menu = f.first.stor.files[f.key({ project, level: 4, folder: `${moduleName}/pool/l2/web`, shortName: 'menu', extension: '.json' })];
    assert.equal(menu.status, 'deleted');
    assert.match(record.phases.at(-1)?.report ?? '', /menu\.json removed/u);
    const again = await runner.runNext(project, moduleName);
    assert.match(again.phases.at(-1)?.report ?? '', /menu\.json removed/u);
    assert.equal((await readLatestCompletedL4Implementation(project, moduleName))?.phases.at(-1)?.report?.includes('menu.json removed'), true);
  } finally { f.restore(); }
});

test('p4_79 s1: an L1 barrier failure keeps pool menu.json', async () => {
  const f = await initialRunnerFixture();
  try {
    allowMenuDelete(f);
    f.defect('materialize-l1');
    const runner = createImplementationRunner(f.dependencies);
    for (let i = 0; i < 5; i++) await runner.runNext(project, moduleName);
    const menu = f.first.stor.files[f.key({ project, level: 4, folder: `${moduleName}/pool/l2/web`, shortName: 'menu', extension: '.json' })];
    assert.equal(menu.status, 'new');
    const record = await readL4Implementation(project, moduleName);
    assert.equal(record?.phases.some(phase => phase.report?.includes('menu.json removed')), false);
  } finally { f.restore(); }
});

test('p4_79 s1: a finished maintenance chain removes pool menu.json', async () => {
  const f = fixture('materialize');
  try {
    allowMenuDelete(f);
    const info: Ns5FileInfo = { project, level: 4, folder: `${moduleName}/pool/l2/web`, shortName: 'menu', extension: '.json' };
    f.first.add(info);
    f.contents.set(f.key(info), JSON.stringify({ moduleName }));
    await f.accept();
    const runner = createImplementationRunner(f.dependencies);
    let record = await readL4Implementation(project, moduleName);
    for (let i = 0; i < 5; i++) record = await runner.runNext(project, moduleName);
    assert.equal(f.first.stor.files[f.key(info)].status, 'deleted');
    assert.match(record?.phases.at(-1)?.report ?? '', /menu\.json removed/u);
    await runner.runNext(project, moduleName);
  } finally { f.restore(); }
});

test('p4_79 s1: a delete failure stays on the implementation record', async () => {
  const f = await initialRunnerFixture();
  try {
    f.first.stor.localStor.deleteFile = () => { throw new Error('disk full'); };
    const runner = createImplementationRunner(f.dependencies);
    for (let i = 0; i < 4; i++) await runner.runNext(project, moduleName);
    const record = await runner.runNext(project, moduleName);
    assert.match(record.phases.at(-1)?.report ?? '', /menu\.json kept: disk full/u);
    const menu = f.first.stor.files[f.key({ project, level: 4, folder: `${moduleName}/pool/l2/web`, shortName: 'menu', extension: '.json' })];
    assert.equal(menu.status, 'new');
  } finally { f.restore(); }
});

test('mr41 s3b a revision changed during execution cannot complete the phase', async () => {
  const f = await initialRunnerFixture();
  try {
    f.beforeExecute(async () => {
      await f.output('agentDefsL2');
      f.put(`l4/${moduleName}/pipeline/changes/change1/change.json`, {
        project, moduleName, baseId: 'base1', changeId: 'change1', activeRevisionId: 'other', promotedRevisionId: 'other',
      });
    });
    const runner = createImplementationRunner(f.dependencies);
    const result = await runner.runNext(project, moduleName);
    assert.equal(result.phases[0].status, 'failed');
    assert.match(result.phases[0].report!, /revision:identity_changed/);
    await runner.runNext(project, moduleName);
    assert.equal(f.dispatched.length, 1);
  } finally { f.restore(); }
});
