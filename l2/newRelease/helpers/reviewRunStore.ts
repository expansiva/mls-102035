/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunStore.ts" enhancement="_blank" />

import {
  assertBoundReviewResult,
  assertReviewRunUpdate,
  reviewRunBindingEquals,
  reviewRunKey,
  verifyReviewRunDraft,
  verifyReviewRunRecord,
  type CanonicalSha256,
  type ReviewRunBinding,
  type ReviewRunOutputRef,
  type ReviewRunRecord,
} from './reviewRun.js';

interface ReviewRunRow { key: string; run: ReviewRunRecord; }
export interface ReviewRunStore {
  read(binding: Pick<ReviewRunBinding, 'project' | 'moduleName' | 'changeId' | 'inputRevisionId'>): Promise<ReviewRunRecord | null>;
  create(run: ReviewRunRecord): Promise<ReviewRunRecord>;
  compareAndSwap(expectedStoreRevision: number, run: ReviewRunRecord): Promise<{ committed: boolean; current: ReviewRunRecord }>;
}

export class ReviewRunStoreError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'ReviewRunStoreError';
  }
}

export const STUDIO_REVIEW_RUN_DATABASE = 'collab-new-release-review-runs-v3';
const STORE_NAME = 'runs';
const DATABASE_VERSION = 1;

function clone<T>(value: T): T { return structuredClone(value); }
function unavailable(): ReviewRunStoreError { return new ReviewRunStoreError('review-run.store_unavailable'); }
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  }
  return value;
}

export class IndexedDbReviewRunStore implements ReviewRunStore {
  readonly #factory: IDBFactory | undefined;
  readonly #databaseName: string;
  #databasePromise: Promise<IDBDatabase> | null = null;

  constructor(factory: IDBFactory | undefined = globalThis.indexedDB, databaseName = STUDIO_REVIEW_RUN_DATABASE) {
    this.#factory = factory;
    this.#databaseName = databaseName;
  }

  async read(binding: Pick<ReviewRunBinding, 'project' | 'moduleName' | 'changeId' | 'inputRevisionId'>): Promise<ReviewRunRecord | null> {
    const key = reviewRunKey(binding);
    const row = await this.#request<ReviewRunRow | undefined>('readonly', store => store.get(key));
    if (!row) return null;
    await verifyReviewRunRecord(row.run);
    return clone(row.run);
  }

  async create(run: ReviewRunRecord): Promise<ReviewRunRecord> {
    // No caller mutation can race hashing or the IndexedDB transaction.
    const fixed = deepFreeze(clone(run));
    await verifyReviewRunDraft(fixed);
    const key = reviewRunKey(fixed.binding);
    const database = await this.#database();
    const selected = await new Promise<ReviewRunRecord>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      let value: ReviewRunRecord | null = null;
      let failure: unknown = null;
      let settled = false;
      const finishReject = (error: unknown) => { if (!settled) { settled = true; reject(error); } };
      const finishResolve = (result: ReviewRunRecord) => { if (!settled) { settled = true; resolve(clone(result)); } };
      const abort = (error: unknown) => {
        failure = failure ?? error;
        try { transaction.abort(); }
        catch { finishReject(failure); }
      };
      const get = store.get(key);
      get.onsuccess = () => {
        const existing = get.result as ReviewRunRow | undefined;
        if (existing) {
          if (!reviewRunBindingEquals(existing.run.binding, fixed.binding)) {
            abort(new ReviewRunStoreError('review-run.revision_already_bound'));
            return;
          }
          value = clone(existing.run);
          return;
        }
        value = clone(fixed);
        const add = store.add({ key, run: clone(fixed) } satisfies ReviewRunRow);
        add.onerror = () => abort(unavailable());
      };
      get.onerror = () => abort(unavailable());
      transaction.oncomplete = () => value ? finishResolve(value) : finishReject(failure ?? unavailable());
      transaction.onerror = () => finishReject(failure ?? unavailable());
      transaction.onabort = () => finishReject(failure ?? unavailable());
    });
    await verifyReviewRunRecord(selected);
    return selected;
  }

  async compareAndSwap(expectedStoreRevision: number, next: ReviewRunRecord): Promise<{ committed: boolean; current: ReviewRunRecord }> {
    const fixed = deepFreeze(clone(next));
    await verifyReviewRunRecord(fixed);
    const key = reviewRunKey(fixed.binding);
    const database = await this.#database();
    const result = await new Promise<{ committed: boolean; current: ReviewRunRecord }>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      let value: { committed: boolean; current: ReviewRunRecord } | null = null;
      let failure: unknown = null;
      let settled = false;
      const finishReject = (error: unknown) => { if (!settled) { settled = true; reject(error); } };
      const finishResolve = (current: { committed: boolean; current: ReviewRunRecord }) => {
        if (!settled) { settled = true; resolve({ committed: current.committed, current: clone(current.current) }); }
      };
      const abort = (error: unknown) => {
        failure = failure ?? error;
        try { transaction.abort(); }
        catch { finishReject(failure); }
      };
      const get = store.get(key);
      get.onsuccess = () => {
        const existing = get.result as ReviewRunRow | undefined;
        if (!existing) { abort(new ReviewRunStoreError('review-run.not_found')); return; }
        if (existing.run.storeRevision !== expectedStoreRevision) {
          value = { committed: false, current: clone(existing.run) };
          return;
        }
        try { assertReviewRunUpdate(existing.run, fixed); }
        catch (error) { abort(error); return; }
        value = { committed: true, current: clone(fixed) };
        const put = store.put({ key, run: clone(fixed) } satisfies ReviewRunRow);
        put.onerror = () => abort(unavailable());
      };
      get.onerror = () => abort(unavailable());
      transaction.oncomplete = () => value ? finishResolve(value) : finishReject(failure ?? unavailable());
      transaction.onerror = () => finishReject(failure ?? unavailable());
      transaction.onabort = () => finishReject(failure ?? unavailable());
    });
    await verifyReviewRunRecord(result.current);
    return result;
  }

  async #database(): Promise<IDBDatabase> {
    if (!this.#factory) throw unavailable();
    if (!this.#databasePromise) {
      this.#databasePromise = new Promise((resolve, reject) => {
        const request = this.#factory!.open(this.#databaseName, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          resolve(request.result);
        };
        request.onerror = () => reject(unavailable());
        request.onblocked = () => reject(unavailable());
      });
    }
    try { return await this.#databasePromise; }
    catch (error) { this.#databasePromise = null; throw error; }
  }

  async #request<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = await this.#database();
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      let settled = false;
      const finishReject = () => { if (!settled) { settled = true; reject(unavailable()); } };
      const request = operation(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => { if (!settled) { settled = true; resolve(request.result); } };
      request.onerror = finishReject;
      transaction.onerror = finishReject;
      transaction.onabort = finishReject;
    });
  }
}

export async function readBoundReviewResult(
  store: ReviewRunStore,
  expected: ReviewRunBinding & { runId: string; outputSnapshotHash: CanonicalSha256 },
): Promise<ReviewRunOutputRef> {
  const run = await store.read(expected);
  if (!run) throw new ReviewRunStoreError('review-run.not_found');
  const { runId: _runId, outputSnapshotHash: _hash, ...binding } = expected;
  if (!reviewRunBindingEquals(run.binding, binding)) throw new ReviewRunStoreError('review-run.result_binding_mismatch');
  return assertBoundReviewResult(run, expected);
}
