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
import type { KeyValueStorage, ReviewWorkerClaim } from './reviewRunWorker.js';

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
