/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateRepository.ts" enhancement="_blank" />

import {
  candidatePublish,
  candidateRead,
  CandidateGatewayError,
  type CandidatePointer,
  type CandidatePublishPermit,
  type CandidatePublishInput,
  type CandidatePublishResult,
  type CandidateReadResult,
  type CandidateScope,
  type CandidateSnapshot,
  verifyCandidateSnapshot,
} from './candidateGateway.js';

const DRAFT_SCHEMA = '2026-09-21-candidate-draft-v2' as const;
const TOKEN = /^[A-Za-z0-9_-]{1,100}$/u;
const MODULE = /^[a-z][A-Za-z0-9]{0,59}$/u;
const HASH = /^[a-f0-9]{64}$/u;

export type CandidateDraftStatus = 'pending' | 'submitted' | 'blocked' | 'conflict';

export interface CandidateDraftIdentity {
  changeId: string;
  revisionId: string;
  snapshotHash: string;
}

export interface StoredCandidateDraft extends CandidateScope, CandidateDraftIdentity {
  schemaVersion: typeof DRAFT_SCHEMA;
  expectedRevisionId: string | null;
  requestId: string;
  snapshot: CandidateSnapshot;
  permit?: CandidatePublishPermit;
  status: CandidateDraftStatus;
}

/** Private durable storage. Implementations must list every record below a prefix. */
export interface CandidateDraftStore {
  read(key: string): Promise<StoredCandidateDraft | null>;
  list(prefix: string): Promise<Array<{ key: string; draft: StoredCandidateDraft }>>;
  /** Atomically creates a record or returns the record already stored at this key. */
  create(key: string, draft: StoredCandidateDraft): Promise<StoredCandidateDraft>;
  write(key: string, draft: StoredCandidateDraft): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface CandidateCheckResult {
  ok: boolean;
  reasons?: string[];
}

export interface CandidateRepositoryTransport {
  read(scope: CandidateScope): Promise<CandidateReadResult>;
  publish(input: CandidatePublishInput): Promise<CandidatePublishResult>;
}

export interface CandidateRepositoryOptions {
  store: CandidateDraftStore;
  inventory(input: CandidatePublishInput): Promise<CandidateCheckResult>;
  validate(input: CandidatePublishInput): Promise<CandidateCheckResult>;
  sealedLegacyExists(scope: CandidateScope): Promise<boolean>;
  transport?: CandidateRepositoryTransport;
  createRequestId?: () => string;
}

export interface CandidateRepositoryPublishInput {
  expectedRevisionId: string | null;
  changeId: string;
  revisionId: string;
  snapshot: CandidateSnapshot;
  permit?: CandidatePublishPermit;
}

export interface CandidateRepositoryPermittedPublishInput extends CandidateRepositoryPublishInput {
  expectedRevisionId: string;
  permit: CandidatePublishPermit;
}

export interface CandidateSubmittedReplayInput {
  changeId: string;
  revisionId: string;
  snapshot: CandidateSnapshot;
}

export type CandidateRepositoryPhase =
  | 'idle' | 'ready' | 'draft' | 'publishing' | 'blocked' | 'conflict' | 'unavailable';

export interface CandidateRepositoryState {
  phase: CandidateRepositoryPhase;
  authoritative: CandidateReadResult | null;
  draft: StoredCandidateDraft | null;
  drafts: StoredCandidateDraft[];
  migrationRequired: boolean;
  conflict: CandidatePointer | null;
  errorCode: string | null;
}

export class CandidateRepositoryError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reasons: string[] = [],
  ) {
    super(code);
    this.name = 'CandidateRepositoryError';
  }
}

/** Control-flow marker emitted only after the blocked draft is durably stored. */
class CandidateBlockedError extends CandidateRepositoryError {}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function frozenClone<T>(value: T): T {
  return deepFreeze(clone(value));
}

function requireScope(scope: CandidateScope): void {
  if (!Number.isSafeInteger(scope.project) || scope.project <= 0 || !MODULE.test(scope.moduleName)) {
    throw new CandidateRepositoryError(400, 'candidate.invalid_scope');
  }
}

function requireToken(value: string): void {
  if (!TOKEN.test(value)) throw new CandidateRepositoryError(400, 'candidate.invalid_identifier');
}

function requireHash(value: string): void {
  if (!HASH.test(value)) throw new CandidateRepositoryError(400, 'candidate.invalid_snapshot_hash');
}

function errorCode(error: unknown): string {
  if (error instanceof CandidateRepositoryError || error instanceof CandidateGatewayError) return error.code;
  return 'candidate.storage_unavailable';
}

function sameScope(left: CandidateScope, right: CandidateScope): boolean {
  return left.project === right.project && left.moduleName === right.moduleName;
}

function identityOf(input: CandidateRepositoryPublishInput | StoredCandidateDraft): CandidateDraftIdentity {
  return { changeId: input.changeId, revisionId: input.revisionId, snapshotHash: input.snapshot.hash };
}

function sameIdentity(left: CandidateDraftIdentity, right: CandidateDraftIdentity): boolean {
  return left.changeId === right.changeId
    && left.revisionId === right.revisionId
    && left.snapshotHash === right.snapshotHash;
}

function samePermit(left: CandidatePublishPermit | undefined, right: CandidatePublishPermit | undefined): boolean {
  if (!left || !right) return !left && !right;
  return left.resultId === right.resultId && left.resultHash === right.resultHash
    && left.inputRevisionId === right.inputRevisionId
    && left.inputSnapshotHash === right.inputSnapshotHash
    && left.inputRevisionNumber === right.inputRevisionNumber
    && left.outputSnapshotHash === right.outputSnapshotHash;
}

function matchesPointer(draft: StoredCandidateDraft, pointer: CandidatePointer): boolean {
  return draft.changeId === pointer.changeId
    && draft.revisionId === pointer.revisionId
    && draft.snapshotHash === pointer.snapshotHash;
}

export function candidateDraftPrefix(scope: CandidateScope): string {
  requireScope(scope);
  return `candidate-drafts/${scope.project}/${scope.moduleName}`;
}

export function candidateDraftKey(scope: CandidateScope, identity: CandidateDraftIdentity): string {
  requireScope(scope);
  requireToken(identity.changeId);
  requireToken(identity.revisionId);
  requireHash(identity.snapshotHash);
  return `${candidateDraftPrefix(scope)}/${identity.changeId}/${identity.revisionId}/${identity.snapshotHash}`;
}

function defaultRequestId(): string {
  return `request-${crypto.randomUUID()}`;
}

const defaultTransport: CandidateRepositoryTransport = {
  read: candidateRead,
  publish: candidatePublish,
};

/**
 * Isolated candidate state machine. It never reads or writes the shared tobe/plan tree.
 * A draft is immutable by identity and remains private until an exact CAS commit wins.
 */
export class CandidateRepository {
  readonly #scope: CandidateScope;
  readonly #options: CandidateRepositoryOptions;
  #hasRead = false;
  #state: CandidateRepositoryState = {
    phase: 'idle', authoritative: null, draft: null, drafts: [],
    migrationRequired: false, conflict: null, errorCode: null,
  };

  constructor(scope: CandidateScope, options: CandidateRepositoryOptions) {
    const fixedScope = frozenClone(scope);
    requireScope(fixedScope);
    this.#scope = fixedScope;
    this.#options = options;
  }

  get state(): CandidateRepositoryState {
    return clone(this.#state);
  }

  async read(): Promise<CandidateRepositoryState> {
    let drafts: StoredCandidateDraft[] = [];
    try {
      drafts = await this.#loadDrafts();
      const authoritative = await this.#normalizeReadResult(
        await (this.#options.transport ?? defaultTransport).read(clone(this.#scope)),
      );
      if (authoritative.pointer) {
        for (const draft of drafts.filter(item => matchesPointer(item, authoritative.pointer!))) {
          await this.#options.store.remove(candidateDraftKey(this.#scope, identityOf(draft)));
        }
        drafts = drafts.filter(item => !matchesPointer(item, authoritative.pointer!));
      }
      const migrationRequired = authoritative.pointer === null
        ? await this.#options.sealedLegacyExists(clone(this.#scope))
        : false;
      this.#hasRead = true;
      this.#settle(authoritative, drafts, migrationRequired);
      return this.state;
    } catch (error) {
      this.#unavailable(error, drafts);
      throw error;
    }
  }

  async publishWithPermit(input: CandidateRepositoryPermittedPublishInput): Promise<CandidatePublishResult> {
    const fixed = frozenClone(input);
    this.#requireReady();
    if (this.#state.migrationRequired) {
      throw new CandidateRepositoryError(409, 'candidate.migration_required');
    }
    if (!fixed.permit) {
      throw new CandidateRepositoryError(409, 'candidate.result_permit_required');
    }
    return this.#publishFixed(fixed, false);
  }

  /** Finds an already-submitted private attempt by immutable output identity; no pointer read first. */
  async replaySubmitted(input: CandidateSubmittedReplayInput): Promise<CandidatePublishResult | null> {
    const fixed = frozenClone(input);
    requireToken(fixed.changeId);
    requireToken(fixed.revisionId);
    const snapshot = deepFreeze(await verifyCandidateSnapshot(fixed.snapshot));
    const identity = identityOf({ ...fixed, expectedRevisionId: null, snapshot });
    const drafts = await this.#loadDrafts();
    const draft = drafts.find(item => sameIdentity(item, identity));
    if (!draft || draft.status !== 'submitted' || draft.expectedRevisionId === null || !draft.permit) return null;
    return this.replayWithPermit({
      expectedRevisionId: draft.expectedRevisionId,
      changeId: fixed.changeId,
      revisionId: fixed.revisionId,
      snapshot,
      permit: clone(draft.permit),
    });
  }

  /** Replays only a durable attempt that already passed checks and reached transport. No read first. */
  async replayWithPermit(
    input: CandidateRepositoryPermittedPublishInput,
  ): Promise<CandidatePublishResult | null> {
    const fixed = frozenClone(input);
    requireToken(fixed.changeId);
    requireToken(fixed.revisionId);
    requireToken(fixed.expectedRevisionId);
    const snapshot = deepFreeze(await verifyCandidateSnapshot(fixed.snapshot));
    const identity = identityOf({ ...fixed, snapshot });
    const key = candidateDraftKey(this.#scope, identity);
    let drafts = await this.#loadDrafts();
    const draft = drafts.find(item => sameIdentity(item, identity));
    if (!draft || draft.status !== 'submitted') return null;
    if (draft.expectedRevisionId !== fixed.expectedRevisionId
      || !samePermit(draft.permit, fixed.permit)) {
      throw new CandidateRepositoryError(409, 'candidate.draft_identity_conflict');
    }
    const wire = this.#wireFromDraft(draft);
    try {
      this.#state = {
        ...this.#state, phase: 'publishing', draft: clone(draft), drafts: clone(drafts),
        conflict: null, errorCode: null,
      };
      const result = await (this.#options.transport ?? defaultTransport).publish(clone(wire));
      if (result.status === 'conflict') {
        this.#requireConflictPointer(result.pointer);
        const conflict = deepFreeze({ ...draft, status: 'conflict' as const });
        await this.#options.store.write(key, clone(conflict));
        await this.read();
        return clone(result);
      }
      await this.#acceptCommitted(result, identity, key);
      return clone(result);
    } catch (error) {
      this.#unavailable(error, await this.#safeLoadDrafts(drafts));
      throw error;
    }
  }

  /** Explicitly imports a sealed legacy snapshot through the same empty-pointer CAS. */
  async migrate(input: CandidateRepositoryPublishInput): Promise<CandidatePublishResult> {
    const fixed = frozenClone(input);
    this.#requireReady();
    if (!this.#state.migrationRequired || this.#state.authoritative?.pointer !== null
      || fixed.expectedRevisionId !== null) {
      throw new CandidateRepositoryError(409, 'candidate.migration_not_required');
    }
    return this.#publishFixed(fixed, false);
  }

  /**
   * Explicitly supersedes one preserved blocked/conflicting draft. The previous draft is
   * deleted only after the replacement commits; failed replacement attempts preserve both.
   */
  async reconcile(
    previous: CandidateDraftIdentity,
    replacement: CandidateRepositoryPublishInput,
  ): Promise<CandidatePublishResult> {
    const fixedPrevious = frozenClone(previous);
    const fixedReplacement = frozenClone(replacement);
    this.#requireReady();
    const drafts = await this.#loadDrafts();
    const old = drafts.find(item => sameIdentity(item, fixedPrevious));
    if (!old || (old.status !== 'blocked' && old.status !== 'conflict')) {
      throw new CandidateRepositoryError(409, 'candidate.draft_not_reconcilable');
    }
    if (sameIdentity(fixedPrevious, identityOf(fixedReplacement))) {
      throw new CandidateRepositoryError(409, 'candidate.replacement_must_differ');
    }
    const expected = this.#state.authoritative?.pointer?.revisionId ?? null;
    if (fixedReplacement.expectedRevisionId !== expected) {
      throw new CandidateRepositoryError(409, 'candidate.stale_reconciliation');
    }
    const result = await this.#publishFixed(fixedReplacement, true);
    if (result.status === 'committed') {
      try {
        await this.#options.store.remove(candidateDraftKey(this.#scope, fixedPrevious));
        this.#settle(this.#state.authoritative!, await this.#loadDrafts(), false);
      } catch (error) {
        this.#unavailable(error, await this.#safeLoadDrafts());
        throw error;
      }
    }
    return result;
  }

  /** Explicit local abandonment; it never mutates the authoritative candidate. */
  async discardDraft(identity: CandidateDraftIdentity): Promise<void> {
    const fixed = frozenClone(identity);
    this.#requireReady();
    const key = candidateDraftKey(this.#scope, fixed);
    const stored = await this.#options.store.read(key);
    if (!stored) throw new CandidateRepositoryError(404, 'candidate.draft_not_found');
    await this.#validateStored(stored, key);
    await this.#options.store.remove(key);
    this.#settle(this.#state.authoritative!, await this.#loadDrafts(), this.#state.migrationRequired);
  }

  async #publishFixed(
    fixed: Readonly<CandidateRepositoryPublishInput>,
    allowDifferent: boolean,
  ): Promise<CandidatePublishResult> {
    requireToken(fixed.changeId);
    requireToken(fixed.revisionId);
    if (fixed.expectedRevisionId !== null) {
      requireToken(fixed.expectedRevisionId);
      if (!fixed.permit) throw new CandidateRepositoryError(409, 'candidate.result_permit_required');
    } else if (fixed.permit) {
      throw new CandidateRepositoryError(400, 'candidate.unexpected_result_permit');
    }
    const snapshot = deepFreeze(await verifyCandidateSnapshot(fixed.snapshot));
    const identity = identityOf({ ...fixed, snapshot });
    const key = candidateDraftKey(this.#scope, identity);
    let drafts = await this.#loadDrafts();
    const exact = drafts.find(item => sameIdentity(item, identity));
    const currentRevision = this.#state.authoritative?.pointer?.revisionId ?? null;
    if (!allowDifferent && !exact && drafts.some(item => item.status === 'blocked'
      || item.status === 'conflict' || item.expectedRevisionId !== currentRevision)) {
      throw new CandidateRepositoryError(409, 'candidate.explicit_draft_resolution_required');
    }
    if (exact && (exact.expectedRevisionId !== fixed.expectedRevisionId
      || !samePermit(exact.permit, fixed.permit))) {
      throw new CandidateRepositoryError(409, 'candidate.draft_identity_conflict');
    }
    const proposedRequestId = exact?.requestId ?? this.#createRequestId();
    const proposed: StoredCandidateDraft = deepFreeze({
      schemaVersion: DRAFT_SCHEMA, ...clone(this.#scope), expectedRevisionId: fixed.expectedRevisionId,
      requestId: proposedRequestId, changeId: fixed.changeId, revisionId: fixed.revisionId,
      snapshotHash: snapshot.hash, snapshot, ...(fixed.permit ? { permit: clone(fixed.permit) } : {}),
      status: exact?.status ?? 'pending',
    });
    let persisted: StoredCandidateDraft;
    try {
      persisted = exact ?? await this.#validateStored(
        await this.#options.store.create(key, clone(proposed)), key,
      );
    } catch (error) {
      this.#unavailable(error, await this.#safeLoadDrafts(drafts));
      throw error;
    }
    if (persisted.expectedRevisionId !== fixed.expectedRevisionId
      || !samePermit(persisted.permit, fixed.permit)) {
      throw new CandidateRepositoryError(409, 'candidate.draft_identity_conflict');
    }
    const requestId = persisted.requestId;
    const wire = deepFreeze<CandidatePublishInput>({
      ...clone(this.#scope), expectedRevisionId: fixed.expectedRevisionId,
      requestId, changeId: fixed.changeId, revisionId: fixed.revisionId, snapshot,
      ...(fixed.permit ? { permit: clone(fixed.permit) } : {}),
    });
    let draft: StoredCandidateDraft = deepFreeze({ ...persisted, status: 'pending' as const });
    try {
      await this.#options.store.write(key, clone(draft));
      drafts = this.#upsert(drafts, draft);
      this.#state = {
        ...this.#state, phase: 'publishing', draft: clone(draft), drafts: clone(drafts),
        conflict: null, errorCode: null,
      };
      const inventory = await this.#options.inventory(frozenClone(wire));
      if (!inventory.ok) return await this.#block(key, draft, drafts, 'candidate.invalid_inventory', inventory.reasons);
      const validation = await this.#options.validate(frozenClone(wire));
      if (!validation.ok) return await this.#block(key, draft, drafts, 'candidate.validation_failed', validation.reasons);
      draft = deepFreeze({ ...draft, status: 'submitted' as const });
      await this.#options.store.write(key, clone(draft));
      drafts = this.#upsert(drafts, draft);
      const result = await (this.#options.transport ?? defaultTransport).publish(clone(wire));
      if (result.status === 'conflict') {
        this.#requireConflictPointer(result.pointer);
        draft = deepFreeze({ ...draft, status: 'conflict' });
        await this.#options.store.write(key, clone(draft));
        drafts = this.#upsert(drafts, draft);
        this.#state = {
          ...this.#state, phase: 'conflict', draft: clone(draft), drafts: clone(drafts),
          conflict: clone(result.pointer), errorCode: 'candidate.conflict',
        };
        return clone(result);
      }
      await this.#acceptCommitted(result, identity, key);
      return clone(result);
    } catch (error) {
      if (error instanceof CandidateBlockedError) throw error;
      this.#unavailable(error, await this.#safeLoadDrafts(drafts));
      throw error;
    }
  }

  #wireFromDraft(draft: StoredCandidateDraft): CandidatePublishInput {
    return deepFreeze({
      ...clone(this.#scope), expectedRevisionId: draft.expectedRevisionId,
      requestId: draft.requestId, changeId: draft.changeId, revisionId: draft.revisionId,
      snapshot: clone(draft.snapshot), ...(draft.permit ? { permit: clone(draft.permit) } : {}),
    });
  }

  async #acceptCommitted(
    result: Extract<CandidatePublishResult, { status: 'committed' }>,
    identity: CandidateDraftIdentity,
    key: string,
  ): Promise<void> {
    this.#requireCommitted(result.pointer, identity);
    const authoritative = await this.#normalizeReadResult(
      await (this.#options.transport ?? defaultTransport).read(clone(this.#scope)),
    );
    if (!authoritative.pointer
      || authoritative.pointer.revisionNumber < result.pointer.revisionNumber) {
      throw new CandidateRepositoryError(502, 'candidate.invalid_response');
    }
    await this.#options.store.remove(key);
    const remaining = (await this.#loadDrafts()).filter(item => !sameIdentity(item, identity));
    this.#hasRead = true;
    this.#settle(authoritative, remaining, false);
  }

  async #block(
    key: string,
    draft: StoredCandidateDraft,
    drafts: StoredCandidateDraft[],
    code: string,
    reasons: string[] | undefined,
  ): Promise<never> {
    const blocked = deepFreeze({ ...draft, status: 'blocked' as const });
    await this.#options.store.write(key, clone(blocked));
    const updated = this.#upsert(drafts, blocked);
    this.#state = {
      ...this.#state, phase: 'blocked', draft: clone(blocked), drafts: clone(updated),
      conflict: null, errorCode: code,
    };
    throw new CandidateBlockedError(422, code, clone(reasons ?? []));
  }

  #createRequestId(): string {
    const requestId = (this.#options.createRequestId ?? defaultRequestId)();
    requireToken(requestId);
    return requestId;
  }

  #requireReady(): void {
    if (!this.#hasRead || !this.#state.authoritative) {
      throw new CandidateRepositoryError(409, 'candidate.authoritative_read_required');
    }
  }

  async #normalizeReadResult(result: CandidateReadResult): Promise<CandidateReadResult> {
    if (result.status !== 'read' || (result.pointer === null) !== (result.snapshot === null)) {
      throw new CandidateRepositoryError(502, 'candidate.invalid_response');
    }
    if (!result.pointer) return { status: 'read', pointer: null, snapshot: null };
    this.#requireConflictPointer(result.pointer);
    const snapshot = await verifyCandidateSnapshot(result.snapshot);
    if (result.pointer.snapshotHash !== snapshot.hash) {
      throw new CandidateRepositoryError(502, 'candidate.invalid_response');
    }
    return { ...clone(result), pointer: clone(result.pointer), snapshot };
  }

  #requireCommitted(pointer: CandidatePointer, identity: CandidateDraftIdentity): void {
    this.#requireConflictPointer(pointer);
    if (!pointer || !sameIdentity({
      changeId: pointer.changeId, revisionId: pointer.revisionId, snapshotHash: pointer.snapshotHash,
    }, identity)) throw new CandidateRepositoryError(502, 'candidate.invalid_response');
  }

  #requireConflictPointer(pointer: CandidatePointer | null): void {
    if (pointer === null) return;
    if (!TOKEN.test(pointer.changeId) || !TOKEN.test(pointer.revisionId) || !HASH.test(pointer.snapshotHash)
      || !Number.isSafeInteger(pointer.revisionNumber) || pointer.revisionNumber < 1) {
      throw new CandidateRepositoryError(502, 'candidate.invalid_response');
    }
  }

  async #loadDrafts(): Promise<StoredCandidateDraft[]> {
    const raw = await this.#options.store.list(candidateDraftPrefix(this.#scope));
    if (!Array.isArray(raw)) throw new CandidateRepositoryError(503, 'candidate.draft_store_invalid');
    const drafts: StoredCandidateDraft[] = [];
    const identities = new Set<string>();
    for (const item of raw) {
      if (!item || typeof item.key !== 'string' || !item.draft) {
        throw new CandidateRepositoryError(503, 'candidate.invalid_draft');
      }
      const identity = identityOf(item.draft);
      const key = candidateDraftKey(this.#scope, identity);
      if (item.key !== key) throw new CandidateRepositoryError(503, 'candidate.invalid_draft');
      const draft = await this.#validateStored(item.draft, key);
      if (identities.has(key)) throw new CandidateRepositoryError(503, 'candidate.duplicate_draft');
      identities.add(key);
      drafts.push(draft);
    }
    return drafts.sort((left, right) => candidateDraftKey(this.#scope, identityOf(left))
      .localeCompare(candidateDraftKey(this.#scope, identityOf(right))));
  }

  async #safeLoadDrafts(fallback: StoredCandidateDraft[] = []): Promise<StoredCandidateDraft[]> {
    try { return await this.#loadDrafts(); }
    catch { return clone(fallback); }
  }

  async #validateStored(value: StoredCandidateDraft, expectedKey: string): Promise<StoredCandidateDraft> {
    if (!value || value.schemaVersion !== DRAFT_SCHEMA || !sameScope(value, this.#scope)
      || (value.status !== 'pending' && value.status !== 'submitted'
        && value.status !== 'blocked' && value.status !== 'conflict')) {
      throw new CandidateRepositoryError(503, 'candidate.invalid_draft');
    }
    requireToken(value.requestId);
    requireToken(value.changeId);
    requireToken(value.revisionId);
    requireHash(value.snapshotHash);
    if (value.expectedRevisionId !== null) requireToken(value.expectedRevisionId);
    if (value.expectedRevisionId === null && value.permit) {
      throw new CandidateRepositoryError(503, 'candidate.invalid_draft');
    }
    if (value.expectedRevisionId !== null) {
      if (!value.permit || value.permit.inputRevisionId !== value.expectedRevisionId
        || !TOKEN.test(value.permit.resultId) || !HASH.test(value.permit.resultHash)
        || !TOKEN.test(value.permit.inputRevisionId) || !HASH.test(value.permit.inputSnapshotHash)
        || !Number.isSafeInteger(value.permit.inputRevisionNumber) || value.permit.inputRevisionNumber < 1
        || !HASH.test(value.permit.outputSnapshotHash) || value.permit.outputSnapshotHash !== value.snapshotHash) {
        throw new CandidateRepositoryError(503, 'candidate.invalid_draft');
      }
    }
    const snapshot = await verifyCandidateSnapshot(value.snapshot);
    if (snapshot.hash !== value.snapshotHash
      || candidateDraftKey(this.#scope, identityOf(value)) !== expectedKey) {
      throw new CandidateRepositoryError(503, 'candidate.invalid_draft');
    }
    return deepFreeze({ ...clone(value), snapshot });
  }

  #upsert(drafts: StoredCandidateDraft[], draft: StoredCandidateDraft): StoredCandidateDraft[] {
    return [...drafts.filter(item => !sameIdentity(item, draft)), clone(draft)]
      .sort((left, right) => candidateDraftKey(this.#scope, identityOf(left))
        .localeCompare(candidateDraftKey(this.#scope, identityOf(right))));
  }

  #settle(
    authoritative: CandidateReadResult,
    drafts: StoredCandidateDraft[],
    migrationRequired: boolean,
  ): void {
    const currentRevision = authoritative.pointer?.revisionId ?? null;
    const conflict = drafts.find(item => item.status === 'conflict' || item.expectedRevisionId !== currentRevision);
    const blocked = drafts.find(item => item.status === 'blocked');
    const selected = conflict ?? blocked ?? drafts[0] ?? null;
    this.#state = {
      phase: conflict ? 'conflict' : blocked ? 'blocked' : drafts.length ? 'draft' : 'ready',
      authoritative: clone(authoritative), draft: clone(selected), drafts: clone(drafts),
      migrationRequired, conflict: conflict ? clone(authoritative.pointer) : null,
      errorCode: conflict ? 'candidate.conflict' : blocked ? 'candidate.validation_blocked' : null,
    };
  }

  #unavailable(error: unknown, drafts: StoredCandidateDraft[]): void {
    this.#state = {
      ...this.#state, phase: 'unavailable', draft: clone(drafts[0] ?? this.#state.draft),
      drafts: clone(drafts), migrationRequired: false, conflict: null, errorCode: errorCode(error),
    };
  }
}
