/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunStudioWorker.test.ts" enhancement="_blank" />

const assert = require('node:assert/strict');
const test = require('node:test');

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

const { createReviewStudioHost } = require('./reviewRunStudioWorker.ts') as typeof import('./reviewRunStudioWorker.ts');
import type { ExecutionContext, TaskData } from '/_102036_/l2/shared/interfaces.js';
import type { KeyValueStorage, ReviewWorkerClaim } from './reviewRunWorker.js';

const THREAD_ID = 'thread-mr15';
const ORDER_AT = '20261006181434.9967';
const PROVISIONAL = `${THREAD_ID}/${ORDER_AT}`;
const CANONICAL = `${THREAD_ID}/20261006181434.1000`;

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
