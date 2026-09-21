/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateDraftStore.ts" enhancement="_blank" />

import {
  CandidateRepositoryError,
  type CandidateDraftStore,
  type StoredCandidateDraft,
} from './candidateRepository.js';

interface CandidateDraftRow {
  key: string;
  draft: StoredCandidateDraft;
}

const DATABASE_VERSION = 1;
const STORE_NAME = 'drafts';
export const STUDIO_CANDIDATE_DATABASE = 'collab-new-release-candidates-v1';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function unavailable(): CandidateRepositoryError {
  return new CandidateRepositoryError(503, 'candidate.draft_store_unavailable');
}

/** Durable, private Studio draft storage. `create` is atomic across tabs in the same browser. */
export class IndexedDbCandidateDraftStore implements CandidateDraftStore {
  readonly #factory: IDBFactory | undefined;
  readonly #databaseName: string;
  #databasePromise: Promise<IDBDatabase> | null = null;

  constructor(
    factory: IDBFactory | undefined = globalThis.indexedDB,
    databaseName = STUDIO_CANDIDATE_DATABASE,
  ) {
    this.#factory = factory;
    this.#databaseName = databaseName;
  }

  async read(key: string): Promise<StoredCandidateDraft | null> {
    const row = await this.#request<CandidateDraftRow | undefined>('readonly', store => store.get(key));
    return row ? clone(row.draft) : null;
  }

  async list(prefix: string): Promise<Array<{ key: string; draft: StoredCandidateDraft }>> {
    const rows = await this.#request<CandidateDraftRow[]>('readonly', store => store.getAll());
    return rows
      .filter(row => row.key.startsWith(`${prefix}/`))
      .sort((left, right) => left.key.localeCompare(right.key))
      .map(row => ({ key: row.key, draft: clone(row.draft) }));
  }

  async create(key: string, draft: StoredCandidateDraft): Promise<StoredCandidateDraft> {
    const database = await this.#database();
    return new Promise<StoredCandidateDraft>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      let selected: StoredCandidateDraft | null = null;
      const get = store.get(key);
      get.onsuccess = () => {
        const existing = get.result as CandidateDraftRow | undefined;
        if (existing) {
          selected = clone(existing.draft);
          return;
        }
        selected = clone(draft);
        const add = store.add({ key, draft: clone(draft) } satisfies CandidateDraftRow);
        add.onerror = () => transaction.abort();
      };
      get.onerror = () => transaction.abort();
      transaction.oncomplete = () => selected ? resolve(clone(selected)) : reject(unavailable());
      transaction.onerror = () => reject(unavailable());
      transaction.onabort = () => reject(unavailable());
    });
  }

  async write(key: string, draft: StoredCandidateDraft): Promise<void> {
    await this.#write(store => store.put({ key, draft: clone(draft) } satisfies CandidateDraftRow));
  }

  async remove(key: string): Promise<void> {
    await this.#write(store => store.delete(key));
  }

  async #database(): Promise<IDBDatabase> {
    if (!this.#factory) throw unavailable();
    if (!this.#databasePromise) {
      this.#databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = this.#factory!.open(this.#databaseName, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
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
    catch (error) {
      this.#databasePromise = null;
      throw error;
    }
  }

  async #request<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const database = await this.#database();
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(unavailable());
      transaction.onerror = () => reject(unavailable());
      transaction.onabort = () => reject(unavailable());
    });
  }

  async #write<T>(operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<void> {
    const database = await this.#database();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const request = operation(transaction.objectStore(STORE_NAME));
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(unavailable());
      transaction.onabort = () => reject(unavailable());
    });
  }
}
