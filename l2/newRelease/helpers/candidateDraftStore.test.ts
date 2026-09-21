/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateDraftStore.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCandidateSnapshot } from './candidateGateway.js';
import { CandidateRepositoryError, type StoredCandidateDraft } from './candidateRepository.js';
import { IndexedDbCandidateDraftStore } from './candidateDraftStore.js';

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

  constructor(readonly rows: Map<string, unknown>) {}

  objectStore(): FakeObjectStore {
    return new FakeObjectStore(this);
  }

  request<T>(work: () => T): FakeRequest<T> {
    const request = new FakeRequest<T>();
    this.#pending += 1;
    queueMicrotask(() => {
      try {
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
    queueMicrotask(() => this.onabort?.());
  }

  #completeWhenIdle(): void {
    if (this.#pending || this.#completionQueued) return;
    this.#completionQueued = true;
    queueMicrotask(() => {
      if (!this.#pending) this.oncomplete?.();
      else this.#completionQueued = false;
    });
  }
}

class FakeObjectStore {
  constructor(private readonly transaction: FakeTransaction) {}

  get(key: string): FakeRequest<unknown> {
    return this.transaction.request(() => structuredClone(this.transaction.rows.get(key)));
  }

  getAll(): FakeRequest<unknown[]> {
    return this.transaction.request(() => [...this.transaction.rows.values()].map(value => structuredClone(value)));
  }

  add(value: { key: string }): FakeRequest<unknown> {
    return this.transaction.request(() => {
      if (this.transaction.rows.has(value.key)) throw new Error('constraint');
      this.transaction.rows.set(value.key, structuredClone(value));
      return value.key;
    });
  }

  put(value: { key: string }): FakeRequest<unknown> {
    return this.transaction.request(() => {
      this.transaction.rows.set(value.key, structuredClone(value));
      return value.key;
    });
  }

  delete(key: string): FakeRequest<unknown> {
    return this.transaction.request(() => this.transaction.rows.delete(key));
  }
}

class FakeDatabase {
  readonly rows = new Map<string, unknown>();
  readonly objectStoreNames = { contains: () => true };
  onversionchange: Handler = null;

  createObjectStore(): void {}
  close(): void {}

  transaction(): FakeTransaction {
    return new FakeTransaction(this.rows);
  }
}

class FakeFactory {
  readonly database = new FakeDatabase();

  open(): FakeRequest<FakeDatabase> {
    const request = new FakeRequest<FakeDatabase>();
    request.result = this.database;
    queueMicrotask(() => {
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  }
}

async function draft(requestId: string): Promise<StoredCandidateDraft> {
  const paths = [
    'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
    'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
  ] as const;
  const snapshot = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'request',
    sources: paths.map(path => ({ path, source: `export const value = ${JSON.stringify({ path })};\n` })),
  });
  return {
    schemaVersion: '2026-09-21-candidate-draft-v2',
    project: 102047,
    moduleName: 'agendaClinica',
    expectedRevisionId: null,
    requestId,
    changeId: 'change-one',
    revisionId: 'rev-one',
    snapshotHash: snapshot.hash,
    snapshot,
    status: 'pending',
  };
}

test('IndexedDB store keeps the first atomic identity and supports durable CRUD', async () => {
  const factory = new FakeFactory();
  const store = new IndexedDbCandidateDraftStore(factory as unknown as IDBFactory, 'candidate-test');
  const key = 'candidate-drafts/102047/agendaClinica/change-one/rev-one/hash';
  const first = await draft('request-first');
  const second = await draft('request-second');

  assert.equal((await store.create(key, first)).requestId, 'request-first');
  assert.equal((await store.create(key, second)).requestId, 'request-first');
  assert.equal((await store.read(key))?.requestId, 'request-first');
  assert.equal((await store.list('candidate-drafts/102047/agendaClinica')).length, 1);
  await store.write(key, { ...first, status: 'blocked' });
  assert.equal((await store.read(key))?.status, 'blocked');
  await store.remove(key);
  assert.equal(await store.read(key), null);
});

test('IndexedDB absence fails closed instead of using transient storage', async () => {
  const store = new IndexedDbCandidateDraftStore(undefined, 'candidate-test');
  await assert.rejects(() => store.read('key'), (error: unknown) => {
    assert.ok(error instanceof CandidateRepositoryError);
    assert.equal(error.code, 'candidate.draft_store_unavailable');
    return true;
  });
});
