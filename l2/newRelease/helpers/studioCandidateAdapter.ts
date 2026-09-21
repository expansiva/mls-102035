/// <mls fileReference="_102035_/l2/newRelease/helpers/studioCandidateAdapter.ts" enhancement="_blank" />

import {
  buildCandidateSnapshot,
  type CandidatePublishPermit,
  type CandidatePublishInput,
  type CandidatePublishResult,
  type CandidateScope,
  type CandidateSnapshot,
} from './candidateGateway.js';
import { IndexedDbCandidateDraftStore } from './candidateDraftStore.js';
import {
  CandidateRepository,
  CandidateRepositoryError,
  type CandidateCheckResult,
  type CandidateDraftStore,
  type CandidateRepositoryOptions,
  type CandidateRepositoryPermittedPublishInput,
  type CandidateRepositoryState,
  type CandidateRepositoryTransport,
} from './candidateRepository.js';
import {
  L4SealedCandidateError,
  readActiveSealedL4Candidate,
  withModuleWriter,
  type L4SealedCandidateSnapshot,
} from './moduleRevision.js';

export type StudioCandidateChecks = Pick<CandidateRepositoryOptions, 'inventory' | 'validate'>;

export interface StudioLegacyCandidateReader {
  read(scope: CandidateScope): Promise<L4SealedCandidateSnapshot | null>;
  withStableCandidate<T>(scope: CandidateScope, work: () => Promise<T>): Promise<T>;
}

export interface StudioCandidateAdapterOptions {
  store?: CandidateDraftStore;
  indexedDb?: IDBFactory;
  checks?: StudioCandidateChecks;
  transport?: CandidateRepositoryTransport;
  createRequestId?: () => string;
  legacy?: StudioLegacyCandidateReader;
}

export interface StudioCandidatePublishInput {
  changeId: string;
  revisionId: string;
  snapshot: CandidateRepositoryPermittedPublishInput['snapshot'];
  permit: CandidatePublishPermit;
}

export interface StudioCandidateSubmittedReplayInput {
  changeId: string;
  revisionId: string;
  snapshot: CandidateSnapshot;
}

const CHECK_REQUIRED = 'candidate.finalize50_check_required';
const ordinal = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function frozenClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

const productionLegacyReader: StudioLegacyCandidateReader = {
  read: scope => readActiveSealedL4Candidate(scope.project, scope.moduleName),
  withStableCandidate: (scope, work) => withModuleWriter(scope.project, scope.moduleName, work),
};

function sameSnapshotInput(
  input: CandidatePublishInput,
  sealed: L4SealedCandidateSnapshot,
  snapshotHash: string,
): boolean {
  return input.changeId === sealed.manifest.changeId
    && input.revisionId === sealed.manifest.revisionId
    && input.snapshot.baseId === sealed.manifest.baseId
    && input.snapshot.requestRevision === sealed.manifest.requestRevision
    && input.snapshot.hash === snapshotHash;
}

/**
 * Production Studio boundary for authoritative candidate reads and explicit legacy migration.
 * Ordinary edit publication is intentionally not exposed until finalize50 provides a checked permit.
 */
export class StudioCandidateAdapter {
  readonly #scope: CandidateScope;
  readonly #legacy: StudioLegacyCandidateReader;
  readonly #checks: StudioCandidateChecks | null;
  readonly #repository: CandidateRepository;

  constructor(scope: CandidateScope, options: StudioCandidateAdapterOptions = {}) {
    this.#scope = frozenClone(scope);
    this.#legacy = options.legacy ?? productionLegacyReader;
    this.#checks = options.checks ?? null;
    const store = options.store ?? new IndexedDbCandidateDraftStore(options.indexedDb);
    this.#repository = new CandidateRepository(this.#scope, {
      store,
      ...(options.transport ? { transport: options.transport } : {}),
      ...(options.createRequestId ? { createRequestId: options.createRequestId } : {}),
      sealedLegacyExists: async () => (await this.#readLegacy()) !== null,
      inventory: input => input.permit
        ? this.#checkPermit(input)
        : this.#checkExactLegacy('inventory', input),
      validate: input => input.permit
        ? this.#checkPermit(input)
        : this.#checkExactLegacy('validate', input),
    });
  }

  get state(): CandidateRepositoryState {
    return this.#repository.state;
  }

  /** Same-origin authenticated read. Failure never falls back to the mutable legacy mirror. */
  read(): Promise<CandidateRepositoryState> {
    return this.#repository.read();
  }

  /** Retries an already-submitted durable draft before any authoritative pointer gate. */
  replaySubmitted(input: StudioCandidateSubmittedReplayInput): Promise<CandidatePublishResult | null> {
    return this.#repository.replaySubmitted(frozenClone(input));
  }

  /** Publishes only through a fresh, authoritative and still-current completed-result permit. */
  async publishWithPermit(input: StudioCandidatePublishInput): Promise<CandidatePublishResult> {
    const fixed = frozenClone(input);
    const wire: CandidateRepositoryPermittedPublishInput = {
      expectedRevisionId: fixed.permit.inputRevisionId,
      changeId: fixed.changeId,
      revisionId: fixed.revisionId,
      snapshot: fixed.snapshot,
      permit: fixed.permit,
    };
    const replayed = await this.#repository.replayWithPermit(wire);
    if (replayed) return replayed;
    await this.#repository.read();
    const checked = await this.#checkPermit(wire);
    if (!checked.ok) {
      throw new CandidateRepositoryError(409, checked.reasons?.[0] ?? 'candidate.result_permit_mismatch');
    }
    return this.#repository.publishWithPermit(wire);
  }

  /**
   * Explicit, non-destructive import of the active sealed legacy revision. It never deletes or
   * rewrites the legacy revision/tobe tree. Without both injected checks it blocks before POST.
   */
  migrateLegacy(): Promise<CandidatePublishResult> {
    return this.#legacy.withStableCandidate(structuredClone(this.#scope), async () => {
      await this.#repository.read();
      const sealed = await this.#readLegacy();
      if (!sealed) throw new CandidateRepositoryError(409, 'candidate.sealed_legacy_required');
      const snapshot = await buildCandidateSnapshot({
        baseId: sealed.manifest.baseId,
        requestRevision: sealed.manifest.requestRevision,
        request: sealed.request,
        sources: sealed.sources,
      });
      return this.#repository.migrate({
        expectedRevisionId: null,
        changeId: sealed.manifest.changeId,
        revisionId: sealed.manifest.revisionId,
        snapshot,
      });
    });
  }

  async #checkExactLegacy(
    kind: keyof StudioCandidateChecks,
    input: CandidatePublishInput,
  ): Promise<CandidateCheckResult> {
    const sealed = await this.#readLegacy();
    if (!sealed) return { ok: false, reasons: ['candidate.sealed_legacy_required'] };
    const snapshot = await buildCandidateSnapshot({
      baseId: sealed.manifest.baseId,
      requestRevision: sealed.manifest.requestRevision,
      request: sealed.request,
      sources: sealed.sources,
    });
    if (!sameSnapshotInput(input, sealed, snapshot.hash)) {
      return { ok: false, reasons: ['candidate.legacy_snapshot_changed'] };
    }
    if (!this.#checks) return { ok: false, reasons: [CHECK_REQUIRED] };
    return this.#checks[kind](structuredClone(input));
  }

  async #checkPermit(input: Pick<CandidatePublishInput, 'expectedRevisionId' | 'snapshot' | 'permit'>): Promise<CandidateCheckResult> {
    const permit = input.permit;
    const authoritative = this.#repository.state.authoritative;
    const pointer = authoritative?.pointer;
    const inputSnapshot = authoritative?.snapshot;
    const result = authoritative && 'result' in authoritative ? authoritative.result : undefined;
    if (!permit || !pointer || !inputSnapshot || !result || result.manifest.status !== 'completed'
      || input.expectedRevisionId !== permit.inputRevisionId
      || pointer.revisionId !== permit.inputRevisionId
      || pointer.snapshotHash !== permit.inputSnapshotHash
      || pointer.revisionNumber !== permit.inputRevisionNumber
      || pointer.resultRevisionId !== permit.inputRevisionId
      || pointer.resultSnapshotHash !== permit.inputSnapshotHash
      || pointer.resultRevisionNumber !== permit.inputRevisionNumber
      || pointer.resultId !== permit.resultId || pointer.resultHash !== permit.resultHash
      || result.resultId !== permit.resultId || result.resultHash !== permit.resultHash
      || result.manifest.outputSnapshotHash !== permit.outputSnapshotHash
      || input.snapshot.hash !== permit.outputSnapshotHash) {
      return { ok: false, reasons: ['candidate.result_permit_mismatch'] };
    }
    const files = input.snapshot.files.map(({ path, sha256 }) => ({ path, sha256 }))
      .sort((left, right) => ordinal(left.path, right.path));
    const artifacts = result.manifest.artifacts.map(({ path, sha256 }) => ({ path, sha256 }))
      .sort((left, right) => ordinal(left.path, right.path));
    const inputPaths = inputSnapshot.files.map(({ path }) => path).sort(ordinal);
    const outputPaths = files.map(({ path }) => path).sort(ordinal);
    return JSON.stringify(inputPaths) === JSON.stringify(outputPaths)
      && JSON.stringify(files) === JSON.stringify(artifacts)
      ? { ok: true }
      : { ok: false, reasons: ['candidate.result_permit_artifacts_mismatch'] };
  }

  async #readLegacy(): Promise<L4SealedCandidateSnapshot | null> {
    try {
      return await this.#legacy.read(structuredClone(this.#scope));
    } catch (error) {
      if (error instanceof L4SealedCandidateError) {
        throw new CandidateRepositoryError(409, error.code);
      }
      throw error;
    }
  }
}

export function createStudioCandidateAdapter(
  scope: CandidateScope,
  options: StudioCandidateAdapterOptions = {},
): StudioCandidateAdapter {
  return new StudioCandidateAdapter(scope, options);
}
