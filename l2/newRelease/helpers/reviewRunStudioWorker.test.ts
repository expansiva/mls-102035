/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunStudioWorker.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

const documentStub = globalThis.document as Document & {
  createTreeWalker?: () => { nextNode(): null; currentNode: null };
  createElement?: (tag: string) => { tagName: string; textContent: string };
  createComment?: () => object;
  head?: { querySelector: () => null; appendChild: () => void };
};
documentStub.createTreeWalker = () => ({ nextNode: () => null, currentNode: null });
documentStub.createElement = (tag: string) => ({ tagName: tag.toUpperCase(), textContent: '' });
documentStub.createComment = () => ({});
documentStub.head = { querySelector: () => null, appendChild: () => undefined };
(globalThis as typeof globalThis & { window: typeof globalThis }).window = globalThis;
if (!globalThis.customElements) {
  (globalThis as typeof globalThis & { customElements: { define(): void; get(): undefined } }).customElements = {
    define: () => undefined,
    get: () => undefined,
  };
}
if (!globalThis.HTMLElement) {
  (globalThis as typeof globalThis & { HTMLElement: typeof Function }).HTMLElement = class HTMLElement {};
}

import type { ExecutionContext, TaskData } from '/_102036_/l2/shared/interfaces.js';
import type { KeyValueStorage, ReviewWorkerClaim, ReviewWorkerClaimInput } from './reviewRunWorker.js';

const THREAD_ID = 'thread-mr15';
const ORDER_AT = '20261006181434.9967';
const PROVISIONAL = `${THREAD_ID}/${ORDER_AT}`;
const CANONICAL = `${THREAD_ID}/20261006181434.1000`;

const Module = require('node:module') as typeof import('node:module');
const path = require('node:path') as typeof import('node:path');
const fs = require('node:fs') as typeof import('node:fs');
const os = require('node:os') as typeof import('node:os');
const taskInfoStub = path.join(os.tmpdir(), 'mr15-collabMessagesTaskInfo.cjs');
const taskInfoStats = path.join(os.tmpdir(), 'mr15-collabMessagesTaskInfo-stats.json');
fs.writeFileSync(taskInfoStub, `const fs = require('node:fs');\nexports.buildTaskStatistics = () => {\n  try { return JSON.parse(fs.readFileSync(${JSON.stringify(taskInfoStats)}, 'utf8')); }\n  catch { return { models: [], fallbackCount: 0, errors: [] }; }\n};\n`);
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (String(request).includes('collabMessagesTaskInfo')) return taskInfoStub;
  return resolveFilename.call(this, request, parent, isMain, options);
};

const { createReviewStudioHost } = require('./reviewRunStudioWorker.ts') as typeof import('./reviewRunStudioWorker.ts');

function memoryStorage(): KeyValueStorage & { raw(): string } {
  const items = new Map<string, string>();
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value); },
    raw: () => [...items.values()][0] ?? '',
  };
}

function claim(): ReviewWorkerClaim {
  return {
    runId: 'run-mr15',
    project: 102035,
    moduleName: 'comandaRestaurante',
    changeId: 'change-mr15',
    phase: 'review',
    attempt: 2,
    claimId: 'claim-mr15',
    workerId: 'worker-mr15',
    command: 'review',
    commandHash: 'sha256:command',
    canonicalSnapshotHash: 'sha256:snapshot',
    claimedAt: '2026-10-06T18:14:30.000Z',
    leaseExpiresAt: '2026-10-06T18:19:30.000Z',
    execution: null,
  };
}

function context(): ExecutionContext {
  return {
    message: { threadId: THREAD_ID, orderAt: ORDER_AT },
    task: { PK: 'task/20261006181434.1001' },
  } as ExecutionContext;
}

for (const fromServer of [false, true]) {
  test(`mr_31 s1 adota task done pela busca ${fromServer ? 'no servidor' : 'local'} sem executar ou retomar`, async () => {
    const storage = memoryStorage();
    const taskId = '20261008202911.1001';
    const messageOrder = '20261008202911.1000';
    const message = { threadId: THREAD_ID, orderAt: messageOrder, taskId: `task/${taskId}` };
    let executes = 0;
    let resumes = 0;
    let serverReads = 0;
    const host = createReviewStudioHost({
      storage,
      userId: () => 'user-mr15',
      thread: async () => ({ threadId: THREAD_ID }),
      findMessage: async (threadId, requestedTaskId) => {
        assert.equal(threadId, THREAD_ID);
        assert.equal(requestedTaskId, taskId);
        return fromServer ? null : message as never;
      },
      messagesAfter: async (userId, threadId, cursor) => {
        serverReads += 1;
        assert.equal(userId, 'user-mr15');
        assert.equal(threadId, THREAD_ID);
        assert.equal(cursor, '20261008202811.0000');
        return [{ ...message, taskId: 'task/another-task' }, message] as never;
      },
      task: async (_userId, requestedTaskId, messageId) => {
        assert.equal(requestedTaskId, taskId);
        assert.equal(messageId, `${THREAD_ID}/${messageOrder}`);
        return { PK: `task/${taskId}`, status: 'done' } as TaskData;
      },
      execute: async () => { executes += 1; },
      resume: async () => { resumes += 1; },
      now: () => '2026-10-09T12:00:00.000Z',
    });
    const execution = await host.adoptPublished!(claim(), { taskId, resultRunId: 'review-published' });
    assert.equal(execution.status, 'completed');
    assert.equal(execution.taskId, taskId);
    assert.equal(execution.attempt, claim().attempt);
    assert.equal(execution.agentName, 'agentReviewSolution');
    assert.equal(execution.resultRunId, 'review-published');
    assert.equal(executes, 0);
    assert.equal(resumes, 0);
    assert.equal(serverReads, fromServer ? 1 : 0);
    const saved = JSON.parse(storage.raw());
    assert.equal(saved.claimId, claim().claimId);
    assert.equal(saved.messageId, `${THREAD_ID}/${messageOrder}`);
    assert.deepEqual(saved.execution, execution);
  });
}

test('mr_31 s1 recusa task publicada ainda in progress', async () => {
  const storage = memoryStorage();
  const taskId = '20261008202911.1001';
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    findMessage: async () => ({ orderAt: ORDER_AT, taskId }) as never,
    task: async () => ({ PK: `task/${taskId}`, status: 'in progress' }) as TaskData,
    execute: async () => { assert.fail('execute'); },
    resume: async () => { assert.fail('resume'); },
  });
  await assert.rejects(host.adoptPublished!(claim(), { taskId, resultRunId: 'review-published' }),
    { message: `review-worker.published_task_not_done:${taskId}` });
  assert.equal(storage.raw(), '');
});

test('mr_31 s1 recusa mensagem ausente no local e no servidor', async () => {
  const storage = memoryStorage();
  const taskId = '20261008202911.1001';
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    findMessage: async () => null,
    messagesAfter: async () => [{ taskId: 'task/other' }] as never,
    task: async () => { throw new Error('task must not be read'); },
    execute: async () => { assert.fail('execute'); },
    resume: async () => { assert.fail('resume'); },
  });
  await assert.rejects(host.adoptPublished!(claim(), { taskId, resultRunId: 'review-published' }),
    { message: `review-worker.published_task_unavailable:${taskId}` });
  assert.equal(storage.raw(), '');
});

test('mr_30 s2 grava taskId e messageId canônicos no task-change enquanto execute não resolve', async () => {
  const storage = memoryStorage();
  const current = context();
  let emit: ((changed: ExecutionContext) => void) | undefined;
  let startedExecute: () => void = () => undefined;
  const executeStarted = new Promise<void>(resolve => { startedExecute = resolve; });
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    context: () => current,
    onTaskChange: listener => {
      emit = listener;
      return () => { emit = undefined; };
    },
    execute: async (_agentName, executionContext) => {
      executionContext.task = {
        PK: 'task/20261006181434.1001',
        messageid_created: CANONICAL,
        status: 'in progress',
      } as TaskData;
      emit?.(executionContext);
      startedExecute();
      await new Promise(() => undefined);
    },
    now: () => '2026-10-06T18:14:31.000Z',
  });
  void host.startOrGet(claim());
  await executeStarted;
  const saved = JSON.parse(storage.raw()) as { messageId: string; execution: { taskId: string } | null; savedAt: string };
  assert.equal(saved.messageId, CANONICAL);
  assert.equal(saved.execution?.taskId, '20261006181434.1001');
  assert.equal(saved.savedAt, '2026-10-06T18:14:31.000Z');
});

function seedMarker(storage: KeyValueStorage, savedAt?: string): void {
  storage.setItem('collab-new-release-review-worker-v1/run-mr15/2/review', JSON.stringify({
    claimId: 'claim-mr15',
    agentName: 'agentReviewSolution',
    threadId: THREAD_ID,
    messageOrder: ORDER_AT,
    messageId: PROVISIONAL,
    savedAt,
    execution: null,
  }));
}

test('mr_30 s3 uma mensagem do comando vira a execução canônica sem ler o id provisório', async () => {
  const storage = memoryStorage();
  seedMarker(storage, '2026-10-06T18:14:31.000Z');
  let readProvisional = false;
  let taskMessageId = '';
  let cursor = '';
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    message: async (_userId, _threadId, messageId) => {
      if (messageId === PROVISIONAL) readProvisional = true;
      return { threadId: THREAD_ID, orderAt: '20261006181434.1000', content: 'review' } as never;
    },
    resume: async () => undefined,
    messagesAfter: async (_userId, _threadId, lastOrderAt) => {
      cursor = lastOrderAt;
      return [{
        senderId: 'user-mr15',
        content: 'review',
        taskId: 'task/20261006181434.1001',
        orderAt: '20261006181434.1000',
        threadId: THREAD_ID,
      }] as never;
    },
    task: async (_userId, _taskId, messageId) => {
      taskMessageId = messageId;
      return { PK: 'task/20261006181434.1001', status: 'in progress' } as TaskData;
    },
    now: () => '2026-10-06T18:15:00.000Z',
  });
  const started = await host.startOrGet(claim());
  assert.equal(readProvisional, false);
  assert.equal(cursor, '20261006181231.0000');
  assert.equal(taskMessageId, CANONICAL);
  assert.equal(started.taskId, '20261006181434.1001');
  const saved = JSON.parse(storage.raw()) as { messageId: string; execution: { taskId: string } };
  assert.equal(saved.messageId, CANONICAL);
  assert.equal(saved.execution.taskId, '20261006181434.1001');
});

test('mr_30 s3 duas mensagens do comando são ambíguas', async () => {
  const storage = memoryStorage();
  seedMarker(storage, '2026-10-06T18:14:31.000Z');
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    messagesAfter: async () => [
      { senderId: 'user-mr15', content: 'review', taskId: 'task/20261006181434.1001' },
      { senderId: 'other', content: 'review', taskId: 'task/ignored' },
      { senderId: 'user-mr15', content: 'review', taskId: 'task/20261006181434.1002' },
    ] as never,
    now: () => '2026-10-06T18:15:00.000Z',
  });
  await assert.rejects(host.startOrGet(claim()), /review-worker\.execution_start_ambiguous:20261006181434\.1001,20261006181434\.1002/);
});

test('mr_30 s3 nenhuma mensagem antes de 2 min fica pendente', async () => {
  const storage = memoryStorage();
  seedMarker(storage, '2026-10-06T18:14:31.000Z');
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    messagesAfter: async () => [],
    now: () => '2026-10-06T18:16:30.999Z',
  });
  await assert.rejects(host.startOrGet(claim()), /review-worker\.execution_start_pending/);
});

test('mr_30 s3 nenhuma mensagem aos 2 min está perdida, e sem savedAt usa o messageOrder', async () => {
  const storage = memoryStorage();
  seedMarker(storage, '2026-10-06T18:14:31.000Z');
  const lost = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    messagesAfter: async () => [],
    now: () => '2026-10-06T18:16:31.000Z',
  });
  await assert.rejects(lost.startOrGet(claim()), /review-worker\.execution_start_lost/);

  const older = memoryStorage();
  seedMarker(older);
  let cursor = '';
  const fromOrder = createReviewStudioHost({
    storage: older,
    userId: () => 'user-mr15',
    messagesAfter: async (_userId, _threadId, lastOrderAt) => { cursor = lastOrderAt; return []; },
    now: () => '2026-10-06T18:16:34.000Z',
  });
  await assert.rejects(fromOrder.startOrGet(claim()), /review-worker\.execution_start_lost/);
  assert.equal(cursor, ORDER_AT);
});

test('mr_15 s1 grava o messageid_created depois do execute e o observe usa esse id', async () => {
  const storage = memoryStorage();
  let savedBeforeExecute = '';
  let observedMessageId = '';
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    context: () => context(),
    execute: async (_agentName, current) => {
      savedBeforeExecute = storage.raw();
      current.task = { ...current.task, messageid_created: CANONICAL } as TaskData;
    },
    task: async (_userId, _taskId, messageId) => {
      observedMessageId = messageId;
      return { PK: 'task/20261006181434.1001', status: 'in progress' } as TaskData;
    },
    now: () => '2026-10-06T18:14:31.000Z',
  });
  const started = await host.startOrGet(claim());
  const saved = JSON.parse(storage.raw()) as { messageId: string };
  assert.equal(JSON.parse(savedBeforeExecute).messageId, PROVISIONAL);
  assert.equal(saved.messageId, CANONICAL);
  assert.notEqual(CANONICAL, PROVISIONAL);
  await host.observe(claim(), started);
  assert.equal(observedMessageId, CANONICAL);
});

test('mr_15 s1 mantém o id provisório quando messageid_created vem vazio', async () => {
  const storage = memoryStorage();
  let observedMessageId = '';
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    context: () => context(),
    execute: async (_agentName, current) => {
      current.task = { ...current.task, messageid_created: '' } as TaskData;
    },
    task: async (_userId, _taskId, messageId) => {
      observedMessageId = messageId;
      return { PK: 'task/20261006181434.1001', status: 'in progress' } as TaskData;
    },
    now: () => '2026-10-06T18:14:31.000Z',
  });
  const started = await host.startOrGet(claim());
  const saved = JSON.parse(storage.raw()) as { messageId: string };
  assert.equal(saved.messageId, PROVISIONAL);
  await host.observe(claim(), started);
  assert.equal(observedMessageId, PROVISIONAL);
});

test('mr_17 s2 task paused vira failed com agent_paused e o motivo', async () => {
  const storage = memoryStorage();
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    context: () => context(),
    execute: async () => undefined,
    task: async () => ({
      PK: 'task/20261006181434.1001',
      status: 'paused',
      last_update_log: 'llm.model.alias_not_found',
    }) as TaskData,
    now: () => '2026-10-06T18:14:31.000Z',
  });
  const started = await host.startOrGet(claim());
  const progress = await host.observe(claim(), started);
  assert.equal(progress.status, 'failed');
  assert.equal(progress.errorCode, 'review-worker.agent_paused:llm.model.alias_not_found');
  assert.equal(progress.executions[0]?.status, 'failed');
});

test('mr_17 s2 task in progress continua reviewing', async () => {
  const storage = memoryStorage();
  const host = createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    context: () => context(),
    execute: async () => undefined,
    task: async () => ({ PK: 'task/20261006181434.1001', status: 'in progress' }) as TaskData,
    now: () => '2026-10-06T18:14:31.000Z',
  });
  const started = await host.startOrGet(claim());
  const progress = await host.observe(claim(), started);
  assert.equal(progress.status, 'reviewing');
  assert.equal(progress.executions[0]?.status, 'running');
});

function hostForTask(task: TaskData) {
  const storage = memoryStorage();
  return createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    context: () => context(),
    execute: async () => undefined,
    task: async () => task,
    now: () => '2026-10-06T18:14:31.000Z',
  });
}

test('mr_18 s3 openrouter com openai/gpt-5.6-terra-pro sem estágio de fallback não é fallback', async () => {
  fs.writeFileSync(taskInfoStats, JSON.stringify({
    models: [{ stage: 'review', provider: 'openrouter', model: 'openai/gpt-5.6-terra-pro' }],
    fallbackCount: 0,
    errors: [],
  }));
  const host = hostForTask({ PK: 'task/20261006181434.1001', status: 'in progress' } as TaskData);
  const started = await host.startOrGet(claim());
  const progress = await host.observe(claim(), started);
  assert.equal(progress.fallbackUsed, false);
  assert.equal(progress.executions[0]?.provider, 'openrouter');
  assert.equal(progress.executions[0]?.model, 'openai/gpt-5.6-terra-pro');
});

test('mr_18 s3 estágio fallback marca fallbackUsed', async () => {
  fs.writeFileSync(taskInfoStats, JSON.stringify({
    models: [{ stage: 'fallback', provider: 'openrouter', model: 'openai/gpt-5.6-terra-pro' }],
    fallbackCount: 0,
    errors: [],
  }));
  const host = hostForTask({ PK: 'task/20261006181434.1001', status: 'in progress' } as TaskData);
  const started = await host.startOrGet(claim());
  const progress = await host.observe(claim(), started);
  assert.equal(progress.fallbackUsed, true);
});

const sourcePaths = [
  'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
] as const;

test('mr_22 s2 pointer de saída com source da rev 1 abre planning com o permit dessa revisão', async () => {
  const { buildCandidateResult, buildCandidateSnapshot } = await import('/_102035_/l2/solution/candidate/candidateGateway.js');
  const scope = { project: 102035, moduleName: 'comandaRestaurante' };
  const snap = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'Review the title',
    sources: sourcePaths.map(path => ({ path, source: `export const value = ${JSON.stringify({ path, title: 'in' })};\n` })),
  });
  const output = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'Review the title',
    sources: sourcePaths.map(path => ({ path, source: `export const value = ${JSON.stringify({ path, title: 'out' })};\n` })),
  });
  const result = await buildCandidateResult({
    ...scope, expectedRevisionId: 'rev-one', expectedSnapshotHash: snap.hash,
    expectedRevisionNumber: 1, resultId: 'result-one', outputSnapshot: output,
    result: {
      runId: 'run-mr15', taskId: '20261006181434.1001', status: 'completed', traceHash: 'c'.repeat(64),
      outputSnapshotHash: output.hash,
      artifacts: output.files.map(({ path, sha256 }) => ({ path, sha256 })),
    },
  });
  const host = createReviewStudioHost({
    storage: memoryStorage(),
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    context: () => context(),
    execute: async () => undefined,
    task: async () => ({ PK: 'task/20261006181434.1001', status: 'done' }) as TaskData,
    now: () => '2026-10-06T18:14:31.000Z',
    candidateTransport: {
      fetchImpl: async () => new Response(JSON.stringify({
        statusCode: 200,
        status: 'read',
        pointer: {
          changeId: 'change-one', revisionId: 'rev-two', snapshotHash: output.hash, revisionNumber: 2,
          source: {
            resultId: result.resultId, resultHash: result.resultHash,
            revisionId: 'rev-one', snapshotHash: snap.hash, revisionNumber: 1,
          },
        },
        snapshot: output,
        result: {
          resultRevisionId: 'rev-one', resultSnapshotHash: snap.hash, resultRevisionNumber: 1,
          resultId: result.resultId, resultHash: result.resultHash, manifest: result.result,
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    },
  });
  const started = await host.startOrGet(claim());
  const progress = await host.observe(claim(), started);
  const permit = (progress.candidateResult as { permit?: { inputRevisionId?: string } } | undefined)?.permit;
  assert.equal(progress.status, 'planning');
  assert.equal(permit?.inputRevisionId, 'rev-one');
});

test('mr_20 s2 com openai e outro o reportado é o primeiro observado', async () => {
  fs.writeFileSync(taskInfoStats, JSON.stringify({
    models: [
      { stage: 'review', provider: 'openai', model: 'gpt-5' },
      { stage: 'review', provider: 'openrouter', model: 'x-ai/grok-4' },
    ],
    fallbackCount: 0,
    errors: [],
  }));
  const host = hostForTask({ PK: 'task/20261006181434.1001', status: 'in progress' } as TaskData);
  const started = await host.startOrGet(claim());
  const progress = await host.observe(claim(), started);
  assert.equal(progress.executions[0]?.provider, 'openai');
  assert.equal(progress.executions[0]?.model, 'gpt-5');
});

test('mr_29 s2 reporta change-effort e não reporta os artefatos antigos dos planners', async () => {
  const plannerClaim = {
    ...claim(),
    phase: 'planner' as const,
    command: 'run comandaRestaurante /candidate pipeline/changes/change-mr15/revisions/rev-mr29/l4',
  };
  const root = 'comandaRestaurante/pipeline/changes/change-mr15/revisions/rev-mr29/l4';
  const seal = { revisionId: 'rev-mr29' };
  const sealHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(seal)))))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  const sources = [
    ['pipeline', 'pipeline', JSON.stringify({ reviewSeal: seal, reviewSealHash: sealHash })],
    ['pool/l1/web', 'l4diff', '{}'],
    ['pool/l2/web', 'l4diff', '{}'],
    ['pool/l4', 'changeEffort', '{}'],
  ] as const;
  const files = mls.stor.files;
  const getKeyToFile = mls.stor.getKeyToFile;
  mls.stor.getKeyToFile = info => JSON.stringify(info);
  const saved = new Map<string, unknown>();
  const keys: string[] = [];
  for (const [folder, shortName, source] of sources) {
    const key = mls.stor.getKeyToFile({ project: 102035, level: 4, folder: `${root}/${folder}`, shortName, extension: '.json' });
    keys.push(key);
    saved.set(key, files[key]);
    files[key] = { versionRef: '0', getValueInfo: async () => ({ content: source }) } as typeof files[string];
  }
  try {
    const host = hostForTask({ PK: 'task/20261006181434.1001', status: 'done' } as TaskData);
    const started = await host.startOrGet(plannerClaim);
    const progress = await host.observe(plannerClaim, started);
    assert.equal(progress.status, 'ready');
    const artifacts = progress.plannerArtifacts as { kind: string; path: string }[];
    assert.deepEqual(artifacts.map(artifact => artifact.kind), [
      'pipeline', 'pipeline-seal', 'l4diff-l1', 'l4diff-l2', 'change-effort',
    ]);
    assert.equal(artifacts[4]?.path, `l4/${root}/pool/l4/changeEffort.json`);
  } finally {
    mls.stor.getKeyToFile = getKeyToFile;
    for (const key of keys) {
      if (saved.get(key) === undefined) delete files[key];
      else files[key] = saved.get(key) as typeof files[string];
    }
  }
});

function phaseClaim(phase: 'review' | 'planner'): ReviewWorkerClaim {
  return { ...claim(), phase, command: phase === 'review' ? 'review' : 'plan' };
}

function seedRunning(storage: KeyValueStorage, phase: 'review' | 'planner', taskId: string): void {
  const current = phaseClaim(phase);
  storage.setItem(`collab-new-release-review-worker-v1/${current.runId}/${current.attempt}/${phase}`, JSON.stringify({
    claimId: current.claimId,
    agentName: phase === 'review' ? 'agentReviewSolution' : 'agentPlannerL4',
    threadId: THREAD_ID,
    messageOrder: ORDER_AT,
    messageId: CANONICAL,
    execution: {
      agentName: phase === 'review' ? 'agentReviewSolution' : 'agentPlannerL4',
      taskId,
      threadId: THREAD_ID,
      status: 'running',
      attempt: current.attempt,
      provider: null,
      model: null,
      resultRunId: null,
      candidateRevisionId: null,
      startedAt: '2026-10-06T18:14:31.000Z',
      updatedAt: '2026-10-06T18:14:31.000Z',
    },
  }));
}

for (const phase of ['review', 'planner'] as const) {
  test(`mr_30 s5 ${phase} in progress no marcador retoma uma vez em 3 ticks`, async () => {
    const storage = memoryStorage();
    const taskId = phase === 'review' ? '20261006181434.3001' : '20261006181434.3002';
    seedRunning(storage, phase, taskId);
    let resumes = 0;
    const host = createReviewStudioHost({
      storage,
      userId: () => 'user-mr15',
      task: async () => ({ PK: `task/${taskId}`, status: 'in progress' }) as TaskData,
      message: async () => ({ threadId: THREAD_ID, content: phaseClaim(phase).command }) as never,
      resume: async () => { resumes += 1; },
      now: () => '2026-10-06T18:15:00.000Z',
    });
    const current = phaseClaim(phase);
    await host.startOrGet(current);
    await host.startOrGet(current);
    await host.startOrGet(current);
    assert.equal(resumes, 1);
  });

  test(`mr_30 s5 ${phase} criada nesta página não retoma`, async () => {
    const storage = memoryStorage();
    const taskId = phase === 'review' ? '20261006181434.3101' : '20261006181434.3102';
    let resumes = 0;
    const host = createReviewStudioHost({
      storage,
      userId: () => 'user-mr15',
      thread: async () => ({ threadId: THREAD_ID }),
      context: () => ({ message: { threadId: THREAD_ID, orderAt: ORDER_AT }, task: { PK: `task/${taskId}` } }) as ExecutionContext,
      execute: async (_agentName, current) => {
        current.task = { PK: `task/${taskId}`, messageid_created: CANONICAL, status: 'in progress' } as TaskData;
      },
      task: async () => ({ PK: `task/${taskId}`, status: 'in progress' }) as TaskData,
      message: async () => ({ threadId: THREAD_ID }) as never,
      resume: async () => { resumes += 1; },
      now: () => '2026-10-06T18:14:31.000Z',
    });
    const current = phaseClaim(phase);
    await host.startOrGet(current);
    await host.startOrGet(current);
    await host.startOrGet(current);
    assert.equal(resumes, 0);
  });

  test(`mr_30 s5 ${phase} resume rejeitado falha no próximo startOrGet`, async () => {
    const storage = memoryStorage();
    const taskId = phase === 'review' ? '20261006181434.3201' : '20261006181434.3202';
    seedRunning(storage, phase, taskId);
    const host = createReviewStudioHost({
      storage,
      userId: () => 'user-mr15',
      task: async () => ({ PK: `task/${taskId}`, status: 'in progress' }) as TaskData,
      message: async () => ({ threadId: THREAD_ID }) as never,
      resume: async () => { throw new Error('hook-lost'); },
      now: () => '2026-10-06T18:15:00.000Z',
    });
    const current = phaseClaim(phase);
    await host.startOrGet(current);
    await new Promise(resolve => setTimeout(resolve, 0));
    await assert.rejects(host.startOrGet(current), /review-worker\.execution_resume_failed:hook-lost/);
  });
}

// s6: cada "reload" reimporta o módulo (require.cache) para zerar tasksOnThisPage, com o mesmo storage.
function loadWorkerModule(): typeof import('./reviewRunStudioWorker.ts') {
  const resolved = require.resolve('./reviewRunStudioWorker.ts');
  delete require.cache[resolved];
  return require('./reviewRunStudioWorker.ts') as typeof import('./reviewRunStudioWorker.ts');
}

function driveInput(phase: 'review' | 'planner'): ReviewWorkerClaimInput {
  const current = phaseClaim(phase);
  return {
    userId: 'user-mr15',
    project: current.project,
    moduleName: current.moduleName,
    changeId: current.changeId,
    inputRevisionId: 'revision-mr30',
    inputSnapshotHash: current.canonicalSnapshotHash,
    baseId: 'base-mr30',
    requestRevision: 1,
    requestHash: current.canonicalSnapshotHash,
    runId: current.runId,
    workerId: current.workerId,
    canonicalSnapshotHash: current.canonicalSnapshotHash,
  };
}

for (const phase of ['review', 'planner'] as const) {
  test(`mr_30 s6 ${phase} reload durante o execute retoma a mesma task sem segundo execute`, async () => {
    const storage = memoryStorage();
    const taskId = phase === 'review' ? '20261006181434.4001' : '20261006181434.4002';
    const current = phaseClaim(phase);
    let executes = 0;
    let resumes = 0;
    let emit: ((changed: ExecutionContext) => void) | undefined;
    let startedExecute: () => void = () => undefined;
    const executeStarted = new Promise<void>(resolve => { startedExecute = resolve; });
    const first = loadWorkerModule();
    const born = first.createReviewStudioHost({
      storage,
      userId: () => 'user-mr15',
      thread: async () => ({ threadId: THREAD_ID }),
      context: () => ({ message: { threadId: THREAD_ID, orderAt: ORDER_AT } }) as ExecutionContext,
      onTaskChange: listener => {
        emit = listener;
        return () => { emit = undefined; };
      },
      execute: async (_agentName, executionContext) => {
        executes += 1;
        executionContext.task = {
          PK: `task/${taskId}`,
          messageid_created: CANONICAL,
          status: 'in progress',
        } as TaskData;
        emit?.(executionContext);
        startedExecute();
        await new Promise(() => undefined);
      },
      now: () => '2026-10-06T18:14:31.000Z',
    });
    const reports: string[] = [];
    const transport = {
      async claim() { return structuredClone(current); },
      async report(value: { progress: { status: string } }) {
        reports.push(value.progress.status);
        return { status: value.progress.status };
      },
    };
    void first.driveReviewRunWorker(transport, born, driveInput(phase));
    await executeStarted;
    const reloaded = loadWorkerModule();
    const host = reloaded.createReviewStudioHost({
      storage,
      userId: () => 'user-mr15',
      execute: async () => { executes += 1; },
      task: async () => ({ PK: `task/${taskId}`, status: 'in progress' }) as TaskData,
      message: async () => ({ threadId: THREAD_ID, content: current.command }) as never,
      resume: async () => { resumes += 1; },
      now: () => '2026-10-06T18:15:00.000Z',
    });
    const taskIds: string[] = [];
    for (let tick = 0; tick < 3; tick += 1) {
      const result = await reloaded.driveReviewRunWorker(transport, host, driveInput(phase));
      assert.equal(result.state, 'reported');
      if (result.state === 'reported' && result.execution) taskIds.push(result.execution.taskId);
    }
    assert.equal(executes, 1);
    assert.equal(resumes, 1);
    assert.deepEqual(taskIds, [taskId, taskId, taskId]);
    assert.deepEqual(reports.filter(status => status === 'failed'), []);
  });
}

test('mr_30 s6 reload antes da task nascer fica pendente e depois perdido', async () => {
  const storage = memoryStorage();
  const current = phaseClaim('review');
  let startedExecute: () => void = () => undefined;
  const executeStarted = new Promise<void>(resolve => { startedExecute = resolve; });
  const first = loadWorkerModule();
  const born = first.createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    context: () => ({ message: { threadId: THREAD_ID, orderAt: ORDER_AT } }) as ExecutionContext,
    execute: async () => {
      startedExecute();
      await new Promise(() => undefined);
    },
    now: () => '2026-10-06T18:14:31.000Z',
  });
  const reports: string[] = [];
  const transport = {
    async claim() { return structuredClone(current); },
    async report(value: { progress: { status: string; errorCode?: string } }) {
      reports.push(value.progress.errorCode ?? value.progress.status);
      return { status: value.progress.status };
    },
  };
  void first.driveReviewRunWorker(transport, born, driveInput('review'));
  await executeStarted;
  const soon = loadWorkerModule();
  const pendingHost = soon.createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    messagesAfter: async () => [],
    now: () => '2026-10-06T18:16:30.999Z',
  });
  const pending = await soon.driveReviewRunWorker(transport, pendingHost, driveInput('review'));
  assert.equal(pending.state, 'pending');
  assert.deepEqual(reports, []);
  const later = loadWorkerModule();
  const lostHost = later.createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    messagesAfter: async () => [],
    now: () => '2026-10-06T18:16:31.000Z',
  });
  const lost = await later.driveReviewRunWorker(transport, lostHost, driveInput('review'));
  assert.equal(lost.state, 'reported');
  assert.deepEqual(reports, ['review-run.worker_start_failed:review-worker.execution_start_lost']);
});

test('mr_30 s6 reload antes do task-change acha a mensagem e retoma sem segundo execute', async () => {
  const storage = memoryStorage();
  const current = phaseClaim('review');
  const taskId = '20261006181434.4003';
  let executes = 0;
  let resumes = 0;
  let startedExecute: () => void = () => undefined;
  const executeStarted = new Promise<void>(resolve => { startedExecute = resolve; });
  const first = loadWorkerModule();
  const born = first.createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    thread: async () => ({ threadId: THREAD_ID }),
    context: () => ({ message: { threadId: THREAD_ID, orderAt: ORDER_AT } }) as ExecutionContext,
    execute: async () => {
      executes += 1;
      startedExecute();
      await new Promise(() => undefined);
    },
    now: () => '2026-10-06T18:14:31.000Z',
  });
  const reports: string[] = [];
  const transport = {
    async claim() { return structuredClone(current); },
    async report(value: { progress: { status: string } }) {
      reports.push(value.progress.status);
      return { status: value.progress.status };
    },
  };
  void first.driveReviewRunWorker(transport, born, driveInput('review'));
  await executeStarted;
  const reloaded = loadWorkerModule();
  const host = reloaded.createReviewStudioHost({
    storage,
    userId: () => 'user-mr15',
    execute: async () => { executes += 1; },
    messagesAfter: async () => [{
      senderId: 'user-mr15',
      content: current.command,
      taskId: `task/${taskId}`,
      orderAt: '20261006181434.1000',
      threadId: THREAD_ID,
    }] as never,
    task: async () => ({ PK: `task/${taskId}`, status: 'in progress' }) as TaskData,
    message: async () => ({ threadId: THREAD_ID, content: current.command }) as never,
    resume: async () => { resumes += 1; },
    now: () => '2026-10-06T18:15:00.000Z',
  });
  const result = await reloaded.driveReviewRunWorker(transport, host, driveInput('review'));
  assert.equal(result.state, 'reported');
  if (result.state === 'reported') assert.equal(result.execution?.taskId, taskId);
  assert.equal(executes, 1);
  assert.equal(resumes, 1);
  assert.deepEqual(reports.filter(status => status === 'failed'), []);
});
