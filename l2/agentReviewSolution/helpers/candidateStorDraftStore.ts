/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/candidateStorDraftStore.ts" enhancement="_blank" />

import { fileExists, readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import {
  CandidateRepositoryError,
  type CandidateDraftStore,
  type StoredCandidateDraft,
} from '/_102035_/l2/agentReviewSolution/helpers/candidateRepository.js';
import { IndexedDbCandidateDraftStore } from '/_102035_/l2/agentReviewSolution/helpers/candidateDraftStore.js';
import type { CandidateScope } from '/_102035_/l2/solution/candidate/candidateGateway.js';

interface DraftRow {
  key: string;
  draft: StoredCandidateDraft;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function nameOf(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return `draft_${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 40)}`;
}

/**
 * l4_p4_168: the candidate drafts for an environment with no `indexedDB` (the agents run by command). They live in the work
 * area of the module, `l4/<module>/tobe/candidate/drafts/`, outside the module itself, and the store removes what it
 * created when it is disposed (at the end of the publication, whether it worked or not). Same contract as the IndexedDB one:
 * `create` never replaces what is already stored at the key; it answers with that record.
 */
export class StorCandidateDraftStore implements CandidateDraftStore {
  readonly #folder: string;
  readonly #project: number;
  readonly #created = new Set<string>();

  constructor(scope: CandidateScope) {
    this.#project = scope.project;
    this.#folder = `${scope.moduleName}/tobe/candidate/drafts`;
  }

  async #info(key: string): Promise<Ns5FileInfo> {
    return { project: this.#project, level: 4, folder: this.#folder, shortName: await nameOf(key), extension: '.json' };
  }

  async read(key: string): Promise<StoredCandidateDraft | null> {
    const row = await readJson<DraftRow>(await this.#info(key));
    return row && row.key === key ? clone(row.draft) : null;
  }

  async list(prefix: string): Promise<Array<{ key: string; draft: StoredCandidateDraft }>> {
    const rows: Array<{ key: string; draft: StoredCandidateDraft }> = [];
    for (const file of Object.values(mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>)) {
      if (!file || file.project !== this.#project || file.level !== 4 || file.status === 'deleted' || file.folder !== this.#folder) continue;
      const row = await readJson<DraftRow>({ project: this.#project, level: 4, folder: this.#folder, shortName: file.shortName, extension: '.json' });
      if (row && row.key.startsWith(`${prefix}/`)) rows.push({ key: row.key, draft: clone(row.draft) });
    }
    return rows.sort((left, right) => left.key.localeCompare(right.key));
  }

  async create(key: string, draft: StoredCandidateDraft): Promise<StoredCandidateDraft> {
    const info = await this.#info(key);
    if (fileExists(info)) {
      const existing = await this.read(key);
      if (existing) return existing;
      throw new CandidateRepositoryError(503, 'candidate.draft_store_unavailable');
    }
    await this.write(key, draft);
    return clone(draft);
  }

  async write(key: string, draft: StoredCandidateDraft): Promise<void> {
    await writeJson(await this.#info(key), { key, draft: clone(draft) } satisfies DraftRow);
    this.#created.add(key);
  }

  async remove(key: string): Promise<void> {
    const info = await this.#info(key);
    const file = mls.stor.files[mls.stor.getKeyToFile(info)];
    if (!file || file.status === 'deleted') return;
    const { deleteFile } = await import('/_102027_/l2/libStor.js');
    await deleteFile(file);
    this.#created.delete(key);
  }

  /** Removes every draft this store created. The work area keeps nothing of a review. */
  async dispose(): Promise<void> {
    for (const key of [...this.#created]) await this.remove(key);
  }
}

export interface CandidateDraftStoreChoice {
  store: CandidateDraftStore;
  /** Where the drafts go, for the log. */
  kind: 'indexedDb' | 'stor';
}

/**
 * The one place that chooses where the drafts live, by the environment: `indexedDB` when it exists (the browser, as always),
 * the work area of the module when it does not. The choice is written to the log.
 */
export function selectCandidateDraftStore(scope: CandidateScope, indexedDb?: IDBFactory): CandidateDraftStoreChoice {
  const factory = indexedDb ?? (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  if (factory) return { store: new IndexedDbCandidateDraftStore(factory), kind: 'indexedDb' };
  console.info(`[candidate] no indexedDB in this environment: the drafts of ${scope.moduleName} go to l4/${scope.moduleName}/tobe/candidate/drafts and are removed when the publication ends`);
  return { store: new StorCandidateDraftStore(scope), kind: 'stor' };
}
