/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunStore.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCandidateResult, buildCandidateSnapshot, type CandidateResultRef } from './candidateGateway.js';
import {
  applyReviewObservation,
  createReviewRun,
  reviewRunKey,
  submittingReviewRun,
  type ReviewRunCreateBinding,
  type ReviewRunRecord,
} from './reviewRun.js';
import { IndexedDbReviewRunStore, readBoundReviewResult, ReviewRunStoreError } from './reviewRunStore.js';

type Handler = ((event?: unknown) => void) | null;
class FakeRequest<T> {
  result!: T;
  error: unknown = null;
  onsuccess: Handler = null;
  onerror: Handler = null;
  onupgradeneeded: Handler = null;
  onblocked: Handler = null;
}

class FakeTransaction {
  oncomplete: Handler = null;
  onerror: Handler = null;
  onabort: Handler = null;
  #pending = 0;
  #completionQueued = false;
  #aborted = false;
  constructor(readonly database: FakeDatabase) {}
  objectStore(): FakeObjectStore { return new FakeObjectStore(this); }
  request<T>(work: () => T): FakeRequest<T> {
    const request = new FakeRequest<T>();
    this.#pending += 1;
    queueMicrotask(() => {
      try {
        if (this.#aborted) return;
        request.result = work();
        request.onsuccess?.();
      } catch (error) {
        request.error = error;
        request.onerror?.();
      } finally {
        this.#pending -= 1;
        this.#completeWhenIdle();
      }
    });
    return request;
  }
  abort(): void {
    if (this.#aborted) return;
    this.#aborted = true;
    queueMicrotask(() => this.onabort?.());
  }
  #completeWhenIdle(): void {
    if (this.#aborted || this.#pending || this.#completionQueued) return;
    this.#completionQueued = true;
    queueMicrotask(() => { if (!this.#aborted && !this.#pending) this.oncomplete?.(); });
  }
}

class FakeObjectStore {
  constructor(private readonly transaction: FakeTransaction) {}
  get(key: string): FakeRequest<unknown> {
    return this.transaction.request(() => structuredClone(this.transaction.database.rows.get(key)));
  }
  add(value: { key: string }): FakeRequest<unknown> {
    return this.transaction.request(() => {
      if (this.transaction.database.failNextAdd) {
        this.transaction.database.failNextAdd = false;
        throw new Error('add failed');
      }
      if (this.transaction.database.rows.has(value.key)) throw new Error('constraint');
      this.transaction.database.rows.set(value.key, structuredClone(value));
      return value.key;
    });
  }
  put(value: { key: string }): FakeRequest<unknown> {
    return this.transaction.request(() => {
      if (this.transaction.database.failNextPut) {
        this.transaction.database.failNextPut = false;
        throw new Error('put failed');
      }
      this.transaction.database.rows.set(value.key, structuredClone(value));
      return value.key;
    });
  }
}

class FakeDatabase {
  readonly rows = new Map<string, unknown>();
  readonly objectStoreNames = { contains: () => true };
  onversionchange: Handler = null;
  failNextAdd = false;
  failNextPut = false;
  createObjectStore(): void {}
  close(): void {}
  transaction(): FakeTransaction { return new FakeTransaction(this); }
}

class FakeFactory {
  readonly database = new FakeDatabase();
  openCalls = 0;
  open(): FakeRequest<FakeDatabase> {
    this.openCalls += 1;
    const request = new FakeRequest<FakeDatabase>();
    request.result = this.database;
    queueMicrotask(() => { request.onupgradeneeded?.(); request.onsuccess?.(); });
    return request;
  }
}

const binding: ReviewRunCreateBinding = {
  project: 102047, moduleName: 'agendaClinica', changeId: 'change-one', inputRevisionId: 'revision-one',
  inputRevisionNumber: 1, inputSnapshotHash: `sha256:${'a'.repeat(64)}`, baseId: 'base-one', requestRevision: 1,
  originalL4Path: 'l4/agendaClinica/pipeline/releases/base-one/l4', temporaryL4Path: 'l4/agendaClinica/tobe/plan',
};
const PATHS = [
  'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
] as const;

async function draft(requestId = 'request-one'): Promise<ReviewRunRecord> {
  return createReviewRun(binding, { runId: 'run-one', requestId, now: 'now' }, 'request');
}

async function readyRun(current: ReviewRunRecord): Promise<ReviewRunRecord> {
  const outputSnapshot = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'request',
    sources: PATHS.map(path => ({ path, source: path })),
  });
  const resultId = `result-${'d'.repeat(32)}`;
  const built = await buildCandidateResult({
    project: 102047, moduleName: 'agendaClinica', expectedRevisionId: 'revision-one',
    expectedSnapshotHash: 'a'.repeat(64), expectedRevisionNumber: 1, resultId,
    result: {
      runId: resultId, taskId: `task-${'d'.repeat(32)}`, status: 'completed', outputSnapshotHash: outputSnapshot.hash,
      artifacts: outputSnapshot.files.map(({ path, sha256 }) => ({ path, sha256 })), traceHash: 'c'.repeat(64),
    },
    outputSnapshot,
  });
  const result: CandidateResultRef = {
    resultRevisionId: 'revision-one', resultSnapshotHash: 'a'.repeat(64), resultRevisionNumber: 1,
    resultId, resultHash: built.resultHash, manifest: built.result,
  };
  return applyReviewObservation(current, {
    currentRevisionId: 'revision-one', taskStatus: 'completed', phase: 'finalizing',
    channelTaskId: 'studio-task-one', channelThreadId: 'thread-one', resultRunId: result.resultId,
    finalize50: {
      schemaVersion: '2026-09-21-finalize50-private-result-v3', project: 102047, moduleName: 'agendaClinica',
      changeId: 'change-one', inputRevisionId: 'revision-one', outputRevisionId: `review-${'d'.repeat(32)}`,
      outputSnapshotHash: outputSnapshot.hash, correctionState: { requestKey: 'change-one/request-1', correctionAttemptsUsed: 0 },
      pointer: { changeId: 'change-one', revisionId: `review-${'d'.repeat(32)}`, snapshotHash: outputSnapshot.hash, revisionNumber: 2 },
      summary: { fileCount: outputSnapshot.files.length, changedPaths: ['module.defs.ts'] },
    },
    candidateResult: {
      result,
      snapshotArtifacts: outputSnapshot.files.map(({ path, sha256 }) => ({ path, sha256 })),
    },
  }, 'ready');
}

async function settles<T>(promise: Promise<T>): Promise<'resolved' | 'rejected'> {
  return Promise.race([
    promise.then(() => 'resolved' as const, () => 'rejected' as const),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('promise remained pending')), 100)),
  ]);
}

test('IndexedDB deduplicates by revision, ignores property order and rejects divergent immutable bytes', async () => {
  const factory = new FakeFactory();
  const store = new IndexedDbReviewRunStore(factory as unknown as IDBFactory, 'review-run-test');
  const first = await draft();
  assert.deepEqual(await store.create(first), first);
  const reordered = {
    ...first,
    binding: {
      temporaryL4Path: first.binding.temporaryL4Path,
      originalL4Path: first.binding.originalL4Path,
      requestHash: first.binding.requestHash,
      requestRevision: first.binding.requestRevision,
      baseId: first.binding.baseId,
      inputSnapshotHash: first.binding.inputSnapshotHash,
      inputRevisionNumber: first.binding.inputRevisionNumber,
      inputRevisionId: first.binding.inputRevisionId,
      changeId: first.binding.changeId,
      moduleName: first.binding.moduleName,
      project: first.binding.project,
    },
  };
  assert.deepEqual(await store.create(reordered), first);
  assert.deepEqual(await store.create(await draft('other-request')), first);
  const divergent = await createReviewRun({ ...binding, inputSnapshotHash: `sha256:${'f'.repeat(64)}` }, {
    runId: 'other-run', requestId: 'other-request', now: 'later',
  }, 'request');
  await assert.rejects(() => store.create(divergent), /revision_already_bound/);
});

test('create and CAS snapshot caller values before their first await', async () => {
  const factory = new FakeFactory();
  const store = new IndexedDbReviewRunStore(factory as unknown as IDBFactory, 'review-run-mutation-test');
  const first = await draft();
  const creating = store.create(first);
  first.request = 'mutated';
  const stored = await creating;
  assert.equal(stored.request, 'request');

  const next = submittingReviewRun(stored, 'later');
  const committing = store.compareAndSwap(1, next);
  next.updatedAt = 'mutated-after-call';
  const committed = await committing;
  assert.equal(committed.current.updatedAt, 'later');
});

test('v3 stale record migrates in memory to ready plus superseded and preserves output', async () => {
  const factory = new FakeFactory();
  const store = new IndexedDbReviewRunStore(factory as unknown as IDBFactory, 'review-run-v3-migration');
  const first = await draft();
  const ready = await readyRun(submittingReviewRun(first, 'submitted'));
  const { status: _status, phase: _phase, superseded: _superseded, ...rest } = ready;
  const legacy = {
    ...rest,
    schemaVersion: '2026-09-21-review-run-v3',
    state: 'stale',
    archivePending: false,
    errorCode: 'review-run.input_revision_changed',
  };
  const key = reviewRunKey(ready.binding);
  factory.database.rows.set(key, { key, run: legacy });
  const migrated = await store.read(ready.binding);
  assert.equal(migrated?.status, 'ready');
  assert.equal(migrated?.phase, 'finalizing');
  assert.equal(migrated?.superseded, true);
  assert.deepEqual(migrated?.output, ready.output);
  assert.equal(migrated?.errorCode, null);
});

test('fabricated records fail complete validation before IndexedDB is opened', async () => {
  const factory = new FakeFactory();
  const store = new IndexedDbReviewRunStore(factory as unknown as IDBFactory, 'review-run-invalid-record-test');
  const first = await draft();
  const invalidRecords: ReviewRunRecord[] = [
    { ...first, binding: { ...first.binding, project: 0 } },
    { ...first, binding: { ...first.binding, moduleName: 'Invalid-module' } },
    { ...first, binding: { ...first.binding, baseId: '../base' } },
    { ...first, binding: { ...first.binding, originalL4Path: 'l4/wrong' } },
    { ...first, binding: { ...first.binding, inputSnapshotHash: 'sha256:short' as ReviewRunRecord['binding']['inputSnapshotHash'] } },
    { ...first, binding: { ...first.binding, inputRevisionNumber: 1.5 } },
    { ...first, status: 'fabricated' as ReviewRunRecord['status'] },
    { ...first, attemptsUsed: 99 },
    { ...first, phase: 'fabricated' as ReviewRunRecord['phase'] },
    { ...first, binding: null as unknown as ReviewRunRecord['binding'] },
    {
      ...first, status: 'ready', phase: 'finalizing', attemptsUsed: 1, taskId: 'task-one', threadId: 'thread-one',
      output: {} as ReviewRunRecord['output'],
    },
  ];
  for (const invalid of invalidRecords) await assert.rejects(() => store.create(invalid));

  const validReady = await readyRun(submittingReviewRun(first, 'later'));
  const invalidCorrection = structuredClone(validReady);
  invalidCorrection.output!.finalize50.correctionState.correctionAttemptsUsed = 99;
  await assert.rejects(() => store.compareAndSwap(2, invalidCorrection));
  const orphanManifest = structuredClone(validReady);
  orphanManifest.output!.result.manifest.taskId = 'other-task';
  await assert.rejects(() => store.compareAndSwap(2, orphanManifest));
  const invalidPointer = structuredClone(validReady);
  invalidPointer.output!.finalize50.pointer.revisionNumber = 0;
  await assert.rejects(() => store.compareAndSwap(2, invalidPointer));
  assert.equal(factory.openCalls, 0);
});

test('stale CAS writer loses without overwriting the committed revision', async () => {
  const factory = new FakeFactory();
  const store = new IndexedDbReviewRunStore(factory as unknown as IDBFactory, 'review-run-cas-test');
  const first = await draft();
  await store.create(first);
  const submitting = submittingReviewRun(first, 'later');
  assert.equal((await store.compareAndSwap(1, submitting)).committed, true);
  const stale = await store.compareAndSwap(1, submitting);
  assert.equal(stale.committed, false);
  assert.equal(stale.current.storeRevision, 2);
});

test('add and put failures always reject instead of leaving a pending Promise', async () => {
  const addFactory = new FakeFactory();
  addFactory.database.failNextAdd = true;
  const addStore = new IndexedDbReviewRunStore(addFactory as unknown as IDBFactory, 'review-run-add-fail');
  assert.equal(await settles(addStore.create(await draft())), 'rejected');

  const putFactory = new FakeFactory();
  const putStore = new IndexedDbReviewRunStore(putFactory as unknown as IDBFactory, 'review-run-put-fail');
  const first = await draft();
  await putStore.create(first);
  putFactory.database.failNextPut = true;
  assert.equal(await settles(putStore.compareAndSwap(1, submittingReviewRun(first, 'later'))), 'rejected');
});

test('bound reader accepts only exact run/change/revision/canonical output hash', async () => {
  const factory = new FakeFactory();
  const store = new IndexedDbReviewRunStore(factory as unknown as IDBFactory, 'review-run-result-test');
  const first = await draft();
  await store.create(first);
  const submitting = submittingReviewRun(first, 'later');
  await store.compareAndSwap(1, submitting);
  const ready = await readyRun(submitting);
  await store.compareAndSwap(2, ready);
  const output = await readBoundReviewResult(store, {
    ...ready.binding, runId: 'run-one', outputSnapshotHash: ready.output!.canonical.outputSnapshotHash,
  });
  assert.equal(output.result.resultId, `result-${'d'.repeat(32)}`);
  await assert.rejects(() => readBoundReviewResult(store, {
    ...ready.binding, runId: 'run-one', outputSnapshotHash: `sha256:${'f'.repeat(64)}`,
  }), /result_binding_mismatch/);
});

test('IndexedDB absence fails closed', async () => {
  const store = new IndexedDbReviewRunStore(undefined, 'review-run-unavailable');
  await assert.rejects(() => store.read({ ...binding }), (error: unknown) => {
    assert.ok(error instanceof ReviewRunStoreError);
    assert.equal(error.code, 'review-run.store_unavailable');
    return true;
  });
});
