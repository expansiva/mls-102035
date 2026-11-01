/// <mls fileReference="_102035_/l2/solution/candidate/candidateGateway.ts" enhancement="_blank" />

import { fileExists, readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { L4SealedCandidateError, readSealedL4Candidate, withModuleWriter } from '/_102035_/l2/solution/candidate/moduleRevision.js';

/** Candidate pointer and marked results live in the frontend stor. The snapshot is recomputed from the sealed revision. */
export interface CandidatePointer {
  changeId: string;
  revisionId: string;
  snapshotHash: string;
  revisionNumber: number;
  resultRevisionId?: string;
  resultSnapshotHash?: string;
  resultRevisionNumber?: number;
  resultId?: string;
  resultHash?: string;
  source?: {
    resultId: string;
    resultHash: string;
    revisionId: string;
    snapshotHash: string;
    revisionNumber: number;
  };
  supersedes?: { changeId: string; revisionId: string; revisionNumber: number };
}

export interface CandidateFile {
  path: string;
  sha256: string;
  contentBase64: string;
}

export interface CandidateSnapshot {
  hash: string;
  baseId: string;
  requestRevision: number;
  request: string;
  files: CandidateFile[];
}

export interface CandidateScope {
  project: number;
  moduleName: string;
}

export interface CandidatePublishInput extends CandidateScope {
  expectedRevisionId: string | null;
  requestId: string;
  changeId: string;
  revisionId: string;
  snapshot: CandidateSnapshot;
  permit?: CandidatePublishPermit;
  supersede?: { changeId: string; revisionId: string };
}

export interface CandidateResultManifest {
  runId: string;
  taskId: string;
  status: 'completed' | 'failed' | 'disputed';
  outputSnapshotHash: string;
  artifacts: Array<{ path: string; sha256: string }>;
  traceHash: string;
}

export interface CandidatePublishPermit {
  resultId: string;
  resultHash: string;
  inputRevisionId: string;
  inputSnapshotHash: string;
  inputRevisionNumber: number;
  outputSnapshotHash: string;
}

export interface CandidateResultRef {
  resultRevisionId: string;
  resultSnapshotHash: string;
  resultRevisionNumber: number;
  resultId: string;
  resultHash: string;
  manifest: CandidateResultManifest;
}

export interface CandidateMarkResultInput extends CandidateScope {
  expectedRevisionId: string;
  expectedSnapshotHash: string;
  expectedRevisionNumber: number;
  resultId: string;
  resultHash: string;
  result: CandidateResultManifest;
  outputSnapshot: CandidateSnapshot;
}

export type CandidateReadResult =
  | { status: 'read'; pointer: null; snapshot: null }
  | { status: 'read'; pointer: CandidatePointer; snapshot: CandidateSnapshot; result?: CandidateResultRef };

export type CandidatePublishResult =
  | { status: 'committed'; pointer: CandidatePointer }
  | { status: 'conflict'; pointer: CandidatePointer | null };

export type CandidateMarkResultResult =
  | { status: 'marked'; pointer: CandidatePointer; permit: CandidatePublishPermit }
  | { status: 'conflict'; pointer: CandidatePointer | null };

export class CandidateGatewayError extends Error {
  constructor(readonly statusCode: number, readonly code: string) {
    super(code);
    this.name = 'CandidateGatewayError';
  }
}

/** Present so existing call sites still typecheck. The gateway does not perform HTTP. */
export interface CandidateGatewayOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

interface StoredResult {
  resultId: string;
  resultHash: string;
  expectedRevisionId: string;
  expectedSnapshotHash: string;
  expectedRevisionNumber: number;
  manifest: CandidateResultManifest;
  outputSnapshot: {
    hash: string;
    baseId: string;
    requestRevision: number;
    request: string;
    files: Array<{ path: string; sha256: string; bytes: number }>;
  };
}
const TOKEN = /^[A-Za-z0-9_-]{1,100}$/u;
const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,191}$/u;
const MODULE = /^[a-z][A-Za-z0-9]{0,59}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const CORE_PATHS = [
  'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
] as const;
const MAX_FILES = 80;
const MAX_FILE_BYTES = 250_000;
const MAX_SNAPSHOT_BYTES = 700_000;
const MAX_REQUEST_BYTES = 64_000;
const RESULT_PATH = /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/u;
const DYNAMIC_L4_PATH = /^(?:journeys\/[a-z][A-Za-z0-9]*|ontology\/[A-Z][A-Za-z0-9]*|workspaces\/[a-z][A-Za-z0-9]*)\.defs\.ts$/u;

function requireScope(scope: CandidateScope): void {
  if (!Number.isSafeInteger(scope.project) || scope.project <= 0 || !MODULE.test(scope.moduleName)) {
    throw new CandidateGatewayError(400, 'candidate.invalid_scope');
  }
}

function requireToken(value: string): void {
  if (!TOKEN.test(value)) throw new CandidateGatewayError(400, 'candidate.invalid_identifier');
}

/** Canonical L4 snapshot grammar, intentionally duplicated at the CBE and CLI trust boundaries. */
function isCandidateSnapshotPath(path: string): boolean {
  return CORE_PATHS.some(core => core === path)
    || path === 'workspace-model.defs.ts'
    || DYNAMIC_L4_PATH.test(path);
}

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

async function sha256(bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', input.buffer);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function decodeBase64(value: string): Uint8Array {
  try {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
      throw new Error('noncanonical base64');
    }
    const binary = atob(value);
    if (btoa(binary) !== value) throw new Error('noncanonical base64');
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    throw new CandidateGatewayError(502, 'candidate.invalid_snapshot');
  }
}

function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  }
  return btoa(chunks.join(''));
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parsePointer(value: unknown): CandidatePointer | null {
  if (value === null) return null;
  const pointer = record(value);
  if (!pointer || typeof pointer.changeId !== 'string' || !TOKEN.test(pointer.changeId)
    || typeof pointer.revisionId !== 'string' || !TOKEN.test(pointer.revisionId)
    || typeof pointer.snapshotHash !== 'string' || !HASH.test(pointer.snapshotHash)
    || !Number.isSafeInteger(pointer.revisionNumber) || Number(pointer.revisionNumber) < 1) {
    throw new CandidateGatewayError(502, 'candidate.invalid_pointer');
  }
  const hasResult = pointer.resultRevisionId !== undefined || pointer.resultSnapshotHash !== undefined
    || pointer.resultRevisionNumber !== undefined || pointer.resultId !== undefined || pointer.resultHash !== undefined;
  if (hasResult && (typeof pointer.resultRevisionId !== 'string' || !TOKEN.test(pointer.resultRevisionId)
    || typeof pointer.resultSnapshotHash !== 'string' || !HASH.test(pointer.resultSnapshotHash)
    || !Number.isSafeInteger(pointer.resultRevisionNumber) || Number(pointer.resultRevisionNumber) < 1
    || typeof pointer.resultId !== 'string' || !TOKEN.test(pointer.resultId)
    || typeof pointer.resultHash !== 'string' || !HASH.test(pointer.resultHash)
    || pointer.resultRevisionId !== pointer.revisionId || pointer.resultSnapshotHash !== pointer.snapshotHash
    || Number(pointer.resultRevisionNumber) !== Number(pointer.revisionNumber))) {
    throw new CandidateGatewayError(502, 'candidate.invalid_pointer');
  }
  const sourceRaw = pointer.source === undefined ? undefined : record(pointer.source);
  if (pointer.source !== undefined && (!sourceRaw
    || typeof sourceRaw.resultId !== 'string' || !TOKEN.test(sourceRaw.resultId)
    || typeof sourceRaw.resultHash !== 'string' || !HASH.test(sourceRaw.resultHash)
    || typeof sourceRaw.revisionId !== 'string' || !TOKEN.test(sourceRaw.revisionId)
    || typeof sourceRaw.snapshotHash !== 'string' || !HASH.test(sourceRaw.snapshotHash)
    || !Number.isSafeInteger(sourceRaw.revisionNumber) || Number(sourceRaw.revisionNumber) < 1
    || sourceRaw.revisionId === pointer.revisionId
    || Number(sourceRaw.revisionNumber) >= Number(pointer.revisionNumber))) {
    throw new CandidateGatewayError(502, 'candidate.invalid_pointer');
  }
  const supersedesRaw = pointer.supersedes === undefined ? undefined : record(pointer.supersedes);
  if (pointer.supersedes !== undefined && (!supersedesRaw
    || typeof supersedesRaw.changeId !== 'string' || !TOKEN.test(supersedesRaw.changeId)
    || typeof supersedesRaw.revisionId !== 'string' || !TOKEN.test(supersedesRaw.revisionId)
    || !Number.isSafeInteger(supersedesRaw.revisionNumber) || Number(supersedesRaw.revisionNumber) < 1
    || Number(supersedesRaw.revisionNumber) >= Number(pointer.revisionNumber)
    || supersedesRaw.revisionId === pointer.revisionId)) {
    throw new CandidateGatewayError(502, 'candidate.invalid_pointer');
  }
  return {
    changeId: pointer.changeId,
    revisionId: pointer.revisionId,
    snapshotHash: pointer.snapshotHash,
    revisionNumber: Number(pointer.revisionNumber),
    ...(hasResult ? {
      resultRevisionId: pointer.resultRevisionId as string,
      resultSnapshotHash: pointer.resultSnapshotHash as string,
      resultRevisionNumber: Number(pointer.resultRevisionNumber),
      resultId: pointer.resultId as string,
      resultHash: pointer.resultHash as string,
    } : {}),
    ...(sourceRaw ? {
      source: {
        resultId: sourceRaw.resultId as string,
        resultHash: sourceRaw.resultHash as string,
        revisionId: sourceRaw.revisionId as string,
        snapshotHash: sourceRaw.snapshotHash as string,
        revisionNumber: Number(sourceRaw.revisionNumber),
      },
    } : {}),
    ...(supersedesRaw ? { supersedes: {
      changeId: supersedesRaw.changeId as string,
      revisionId: supersedesRaw.revisionId as string,
      revisionNumber: Number(supersedesRaw.revisionNumber),
    } } : {}),
  };
}

/** Validates every source byte and the exact ordered manifest hash used by the CBE. */
export async function verifyCandidateSnapshot(value: unknown): Promise<CandidateSnapshot> {
  let fixed: unknown;
  try { fixed = frozenClone(value); }
  catch { throw new CandidateGatewayError(502, 'candidate.invalid_snapshot'); }
  const snapshot = record(fixed);
  if (!snapshot || typeof snapshot.hash !== 'string' || !HASH.test(snapshot.hash)
    || typeof snapshot.baseId !== 'string' || !TOKEN.test(snapshot.baseId)
    || !Number.isSafeInteger(snapshot.requestRevision) || Number(snapshot.requestRevision) < 0
    || typeof snapshot.request !== 'string'
    || new TextEncoder().encode(snapshot.request).byteLength > MAX_REQUEST_BYTES
    || !Array.isArray(snapshot.files) || snapshot.files.length < 1 || snapshot.files.length > MAX_FILES) {
    throw new CandidateGatewayError(502, 'candidate.invalid_snapshot');
  }
  const seen = new Set<string>();
  let total = 0;
  const files: CandidateFile[] = [];
  const metadata: Array<{ path: string; sha256: string; bytes: number }> = [];
  for (const raw of snapshot.files) {
    const file = record(raw);
    if (!file || typeof file.path !== 'string' || !isCandidateSnapshotPath(file.path) || file.path.length > 180
      || seen.has(file.path) || typeof file.sha256 !== 'string' || !HASH.test(file.sha256)
      || typeof file.contentBase64 !== 'string') {
      throw new CandidateGatewayError(502, 'candidate.invalid_snapshot');
    }
    seen.add(file.path);
    const bytes = decodeBase64(file.contentBase64);
    total += bytes.length;
    if (bytes.length < 1 || bytes.length > MAX_FILE_BYTES || total > MAX_SNAPSHOT_BYTES
      || await sha256(bytes) !== file.sha256) {
      throw new CandidateGatewayError(502, 'candidate.invalid_snapshot');
    }
    files.push({ path: file.path, sha256: file.sha256, contentBase64: file.contentBase64 });
    metadata.push({ path: file.path, sha256: file.sha256, bytes: bytes.length });
  }
  if (CORE_PATHS.some(path => !seen.has(path))) throw new CandidateGatewayError(502, 'candidate.incomplete_snapshot');
  metadata.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const manifest = {
    baseId: snapshot.baseId,
    requestRevision: Number(snapshot.requestRevision),
    request: snapshot.request,
    files: metadata,
  };
  if (await sha256(new TextEncoder().encode(JSON.stringify(manifest))) !== snapshot.hash) {
    throw new CandidateGatewayError(502, 'candidate.invalid_snapshot_hash');
  }
  return { hash: snapshot.hash, baseId: snapshot.baseId, requestRevision: Number(snapshot.requestRevision), request: snapshot.request, files };
}

async function normalizeResultManifest(value: unknown, failureStatus: 400 | 502): Promise<{
  manifest: CandidateResultManifest; hash: string;
}> {
  const raw = record(value);
  const fail = (code: string): never => { throw new CandidateGatewayError(failureStatus, code); };
  if (!raw || typeof raw.runId !== 'string' || !TOKEN.test(raw.runId)
    || typeof raw.taskId !== 'string' || !TASK_ID.test(raw.taskId)
    || (raw.status !== 'completed' && raw.status !== 'failed' && raw.status !== 'disputed')
    || typeof raw.traceHash !== 'string' || !HASH.test(raw.traceHash)
    || typeof raw.outputSnapshotHash !== 'string' || !HASH.test(raw.outputSnapshotHash)
    || !Array.isArray(raw.artifacts) || raw.artifacts.length > 80
    || (raw.status === 'completed' && raw.artifacts.length === 0)) {
    throw new CandidateGatewayError(failureStatus, 'candidate.invalid_result');
  }
  const runId = raw.runId;
  const taskId = raw.taskId;
  const status = raw.status;
  const traceHash = raw.traceHash;
  const outputSnapshotHash = raw.outputSnapshotHash;
  const rawArtifacts = raw.artifacts;
  const seen = new Set<string>();
  const artifacts = rawArtifacts.map((item): { path: string; sha256: string } => {
    const artifact = record(item);
    if (!artifact || typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string') {
      throw new CandidateGatewayError(failureStatus, 'candidate.invalid_result_artifact');
    }
    const path = artifact.path;
    const artifactHash = artifact.sha256;
    const pathValid = status === 'completed' ? isCandidateSnapshotPath(path) : RESULT_PATH.test(path);
    if (path.length > 180 || !pathValid || path.split('/').some(part => part === '.' || part === '..')
      || !HASH.test(artifactHash) || seen.has(path)) fail('candidate.invalid_result_artifact');
    seen.add(path);
    return { path, sha256: artifactHash };
  }).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  if (status === 'completed' && CORE_PATHS.some(path => !seen.has(path))) {
    fail('candidate.incomplete_result_artifacts');
  }
  const manifest: CandidateResultManifest = {
    runId, taskId, status, outputSnapshotHash, artifacts, traceHash,
  };
  return { manifest, hash: await sha256(new TextEncoder().encode(JSON.stringify(manifest))) };
}

function normalizePermit(value: CandidatePublishPermit | undefined, required: boolean): CandidatePublishPermit | null {
  if (!value) {
    if (required) throw new CandidateGatewayError(409, 'candidate.result_permit_required');
    return null;
  }
  if (!required) throw new CandidateGatewayError(400, 'candidate.unexpected_result_permit');
  if (!TOKEN.test(value.resultId) || !HASH.test(value.resultHash) || !TOKEN.test(value.inputRevisionId)
    || !HASH.test(value.inputSnapshotHash) || !Number.isSafeInteger(value.inputRevisionNumber)
    || value.inputRevisionNumber < 1 || !HASH.test(value.outputSnapshotHash)) {
    throw new CandidateGatewayError(400, 'candidate.invalid_result_permit');
  }
  return { ...value };
}

export async function buildCandidateResult(input: Omit<CandidateMarkResultInput, 'resultHash'>): Promise<CandidateMarkResultInput> {
  const fixed = frozenClone(input);
  requireScope(fixed);
  requireToken(fixed.expectedRevisionId);
  if (!HASH.test(fixed.expectedSnapshotHash) || !Number.isSafeInteger(fixed.expectedRevisionNumber)
    || fixed.expectedRevisionNumber < 1) throw new CandidateGatewayError(400, 'candidate.invalid_identifier');
  requireToken(fixed.resultId);
  const normalized = await normalizeResultManifest(fixed.result, 400);
  let outputSnapshot: CandidateSnapshot;
  try { outputSnapshot = await verifyCandidateSnapshot(fixed.outputSnapshot); }
  catch { throw new CandidateGatewayError(400, 'candidate.invalid_snapshot'); }
  if (normalized.manifest.outputSnapshotHash !== outputSnapshot.hash) {
    throw new CandidateGatewayError(400, 'candidate.result_output_mismatch');
  }
  if (normalized.manifest.status === 'completed') {
    const files = outputSnapshot.files.map(({ path, sha256 }) => ({ path, sha256 }))
      .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
    if (JSON.stringify(files) !== JSON.stringify(normalized.manifest.artifacts)) {
      throw new CandidateGatewayError(400, 'candidate.result_output_mismatch');
    }
  }
  return { ...fixed, outputSnapshot, result: normalized.manifest, resultHash: normalized.hash };
}

export async function verifyCandidateResult(value: unknown, pointer: CandidatePointer): Promise<CandidateResultRef> {
  const result = record(value);
  const viaMarked = !!result && !!pointer.resultRevisionId && !!pointer.resultSnapshotHash
    && !!pointer.resultRevisionNumber && !!pointer.resultId && !!pointer.resultHash
    && result.resultRevisionId === pointer.resultRevisionId && result.resultId === pointer.resultId
    && result.resultSnapshotHash === pointer.resultSnapshotHash
    && result.resultRevisionNumber === pointer.resultRevisionNumber
    && result.resultHash === pointer.resultHash;
  const source = pointer.source;
  const viaSource = !!result && !!source
    && result.resultRevisionId === source.revisionId && result.resultId === source.resultId
    && result.resultSnapshotHash === source.snapshotHash
    && result.resultRevisionNumber === source.revisionNumber
    && result.resultHash === source.resultHash;
  if (!viaMarked && !viaSource) {
    throw new CandidateGatewayError(502, 'candidate.invalid_result');
  }
  const bound = viaMarked
    ? {
      resultRevisionId: pointer.resultRevisionId as string,
      resultSnapshotHash: pointer.resultSnapshotHash as string,
      resultRevisionNumber: pointer.resultRevisionNumber as number,
      resultId: pointer.resultId as string,
      resultHash: pointer.resultHash as string,
    }
    : {
      resultRevisionId: source!.revisionId,
      resultSnapshotHash: source!.snapshotHash,
      resultRevisionNumber: source!.revisionNumber,
      resultId: source!.resultId,
      resultHash: source!.resultHash,
    };
  const normalized = await normalizeResultManifest(result!.manifest, 502);
  if (normalized.hash !== bound.resultHash) throw new CandidateGatewayError(502, 'candidate.invalid_result_hash');
  return { ...bound, manifest: normalized.manifest };
}

/** Builds immutable wire bytes from complete L4 sources, never from a mutable shared path. */
export async function buildCandidateSnapshot(input: {
  baseId: string;
  requestRevision: number;
  request: string;
  sources: readonly { path: string; source: string }[];
}): Promise<CandidateSnapshot> {
  const fixed = frozenClone(input);
  requireToken(fixed.baseId);
  if (!Number.isSafeInteger(fixed.requestRevision) || fixed.requestRevision < 0
    || typeof fixed.request !== 'string' || new TextEncoder().encode(fixed.request).byteLength > MAX_REQUEST_BYTES) {
    throw new CandidateGatewayError(400, 'candidate.invalid_request');
  }
  const files: CandidateFile[] = [];
  for (const item of fixed.sources) {
    if (!isCandidateSnapshotPath(item.path) || typeof item.source !== 'string') {
      throw new CandidateGatewayError(400, 'candidate.invalid_file');
    }
    const bytes = new TextEncoder().encode(item.source);
    files.push({ path: item.path, sha256: await sha256(bytes), contentBase64: encodeBase64(bytes) });
  }
  const metadata = files.map(file => ({ path: file.path, sha256: file.sha256, bytes: decodeBase64(file.contentBase64).length }))
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const manifest = { baseId: fixed.baseId, requestRevision: fixed.requestRevision, request: fixed.request, files: metadata };
  const snapshot: CandidateSnapshot = {
    hash: await sha256(new TextEncoder().encode(JSON.stringify(manifest))),
    baseId: fixed.baseId, requestRevision: fixed.requestRevision, request: fixed.request, files,
  };
  try { await verifyCandidateSnapshot(snapshot); }
  catch { throw new CandidateGatewayError(400, 'candidate.invalid_snapshot'); }
  return snapshot;
}

function pointerInfo(scope: CandidateScope): Ns5FileInfo {
  return { project: scope.project, level: 4, folder: `${scope.moduleName}/tobe/candidate`, shortName: 'pointer', extension: '.json' };
}

function resultInfo(scope: CandidateScope, resultId: string): Ns5FileInfo {
  requireToken(resultId);
  return { project: scope.project, level: 4, folder: `${scope.moduleName}/tobe/candidate/results`, shortName: resultId, extension: '.json' };
}

function asStorageError(error: unknown): never {
  if (error instanceof CandidateGatewayError) throw error;
  if (error instanceof L4SealedCandidateError) throw new CandidateGatewayError(502, error.code);
  throw new CandidateGatewayError(503, 'candidate.storage_unavailable');
}

async function loadPointer(scope: CandidateScope): Promise<CandidatePointer | null> {
  const info = pointerInfo(scope);
  if (!fileExists(info)) return null;
  let raw: unknown;
  try { raw = await readJson<unknown>(info); }
  catch (error) { asStorageError(error); }
  if (raw === null) throw new CandidateGatewayError(502, 'candidate.invalid_pointer');
  return parsePointer(raw);
}

async function savePointer(scope: CandidateScope, pointer: CandidatePointer): Promise<void> {
  try { await writeJson(pointerInfo(scope), pointer); }
  catch (error) { asStorageError(error); }
}

function outputRecord(snapshot: CandidateSnapshot): StoredResult['outputSnapshot'] {
  return {
    hash: snapshot.hash,
    baseId: snapshot.baseId,
    requestRevision: snapshot.requestRevision,
    request: snapshot.request,
    files: snapshot.files.map(file => ({
      path: file.path,
      sha256: file.sha256,
      bytes: decodeBase64(file.contentBase64).length,
    })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0),
  };
}

async function loadStoredResult(scope: CandidateScope, resultId: string): Promise<StoredResult | null> {
  const info = resultInfo(scope, resultId);
  if (!fileExists(info)) return null;
  let raw: unknown;
  try { raw = await readJson<unknown>(info); }
  catch (error) { asStorageError(error); }
  const value = record(raw);
  if (!value || typeof value.resultId !== 'string' || typeof value.resultHash !== 'string') {
    throw new CandidateGatewayError(502, 'candidate.invalid_result');
  }
  return value as unknown as StoredResult;
}

async function saveStoredResult(scope: CandidateScope, stored: StoredResult): Promise<void> {
  try { await writeJson(resultInfo(scope, stored.resultId), stored); }
  catch (error) { asStorageError(error); }
}

async function snapshotFromSeal(scope: CandidateScope, changeId: string, revisionId: string): Promise<CandidateSnapshot> {
  let sealed: Awaited<ReturnType<typeof readSealedL4Candidate>>;
  try {
    sealed = await readSealedL4Candidate(scope.project, scope.moduleName, changeId, revisionId);
  } catch (error) { asStorageError(error); }
  if (!sealed) throw new CandidateGatewayError(502, 'candidate.invalid_snapshot');
  try {
    return await buildCandidateSnapshot({
      baseId: sealed.manifest.baseId,
      requestRevision: sealed.manifest.requestRevision,
      request: sealed.request,
      sources: sealed.sources,
    });
  } catch (error) {
    if (error instanceof CandidateGatewayError && error.code === 'candidate.invalid_snapshot_hash') throw error;
    if (error instanceof CandidateGatewayError) throw new CandidateGatewayError(502, 'candidate.invalid_snapshot');
    asStorageError(error);
  }
}

function sameStoredResult(left: StoredResult, right: StoredResult): boolean {
  return left.resultId === right.resultId && left.resultHash === right.resultHash
    && left.expectedRevisionId === right.expectedRevisionId
    && left.expectedSnapshotHash === right.expectedSnapshotHash
    && left.expectedRevisionNumber === right.expectedRevisionNumber
    && JSON.stringify(left.manifest) === JSON.stringify(right.manifest)
    && JSON.stringify(left.outputSnapshot) === JSON.stringify(right.outputSnapshot);
}

async function boundResult(scope: CandidateScope, pointer: CandidatePointer): Promise<CandidateResultRef> {
  const resultId = pointer.resultId ?? pointer.source?.resultId;
  if (!resultId) throw new CandidateGatewayError(502, 'candidate.invalid_result');
  const stored = await loadStoredResult(scope, resultId);
  if (!stored) throw new CandidateGatewayError(502, 'candidate.invalid_result');
  const viaMarked = !!pointer.resultId;
  return verifyCandidateResult({
    resultRevisionId: viaMarked ? pointer.resultRevisionId : pointer.source?.revisionId,
    resultSnapshotHash: viaMarked ? pointer.resultSnapshotHash : pointer.source?.snapshotHash,
    resultRevisionNumber: viaMarked ? pointer.resultRevisionNumber : pointer.source?.revisionNumber,
    resultId: viaMarked ? pointer.resultId : pointer.source?.resultId,
    resultHash: viaMarked ? pointer.resultHash : pointer.source?.resultHash,
    manifest: stored.manifest,
  }, pointer);
}

async function assertPermit(
  scope: CandidateScope,
  current: CandidatePointer,
  permit: CandidatePublishPermit,
  snapshot: CandidateSnapshot,
): Promise<void> {
  if (current.revisionId !== permit.inputRevisionId || current.snapshotHash !== permit.inputSnapshotHash
    || current.revisionNumber !== permit.inputRevisionNumber || current.resultId !== permit.resultId
    || current.resultHash !== permit.resultHash || current.resultRevisionId !== permit.inputRevisionId
    || current.resultSnapshotHash !== permit.inputSnapshotHash
    || current.resultRevisionNumber !== permit.inputRevisionNumber) {
    throw new CandidateGatewayError(409, 'candidate.result_permit_stale');
  }
  const stored = await loadStoredResult(scope, permit.resultId);
  if (!stored || stored.resultHash !== permit.resultHash || stored.manifest.status !== 'completed'
    || stored.manifest.outputSnapshotHash !== permit.outputSnapshotHash
    || stored.outputSnapshot.hash !== permit.outputSnapshotHash
    || snapshot.hash !== stored.outputSnapshot.hash
    || snapshot.baseId !== stored.outputSnapshot.baseId
    || snapshot.requestRevision !== stored.outputSnapshot.requestRevision
    || snapshot.request !== stored.outputSnapshot.request
    || JSON.stringify(outputRecord(snapshot).files) !== JSON.stringify(stored.outputSnapshot.files)) {
    throw new CandidateGatewayError(409, 'candidate.result_permit_mismatch');
  }
}

function markedPermit(fixed: CandidateMarkResultInput, outputSnapshotHash: string): CandidatePublishPermit {
  return {
    resultId: fixed.resultId, resultHash: fixed.resultHash,
    inputRevisionId: fixed.expectedRevisionId, inputSnapshotHash: fixed.expectedSnapshotHash,
    inputRevisionNumber: fixed.expectedRevisionNumber, outputSnapshotHash,
  };
}

export async function candidateRead(scope: CandidateScope, _options: CandidateGatewayOptions = {}): Promise<CandidateReadResult> {
  requireScope(scope);
  let pointer: CandidatePointer | null;
  try { pointer = await loadPointer(scope); }
  catch (error) { asStorageError(error); }
  if (!pointer) return { status: 'read', pointer: null, snapshot: null };
  const snapshot = await snapshotFromSeal(scope, pointer.changeId, pointer.revisionId);
  if (pointer.snapshotHash !== snapshot.hash) throw new CandidateGatewayError(502, 'candidate.invalid_snapshot_hash');
  if (pointer.resultId || pointer.source) {
    return { status: 'read', pointer, snapshot, result: await boundResult(scope, pointer) };
  }
  return { status: 'read', pointer, snapshot };
}

export async function candidatePublish(input: CandidatePublishInput, _options: CandidateGatewayOptions = {}): Promise<CandidatePublishResult> {
  const fixed = frozenClone(input);
  requireScope(fixed);
  requireToken(fixed.requestId);
  requireToken(fixed.changeId);
  requireToken(fixed.revisionId);
  if (fixed.expectedRevisionId !== null) requireToken(fixed.expectedRevisionId);
  if (fixed.supersede) {
    requireToken(fixed.supersede.changeId);
    requireToken(fixed.supersede.revisionId);
    if (fixed.permit) throw new CandidateGatewayError(400, 'candidate.supersede_with_permit');
    if (fixed.expectedRevisionId === null) throw new CandidateGatewayError(409, 'candidate.supersede_mismatch');
  }
  const snapshot = await verifyCandidateSnapshot(fixed.snapshot);
  const permit = normalizePermit(fixed.permit, fixed.expectedRevisionId !== null && !fixed.supersede);
  if (permit && (permit.inputRevisionId !== fixed.expectedRevisionId || permit.outputSnapshotHash !== snapshot.hash)) {
    throw new CandidateGatewayError(409, 'candidate.result_permit_mismatch');
  }
  try {
    return await withModuleWriter(fixed.project, fixed.moduleName, async () => {
      const current = await loadPointer(fixed);
      if ((current?.revisionId ?? null) !== fixed.expectedRevisionId) {
        return { status: 'conflict', pointer: current };
      }
      const sealed = await snapshotFromSeal(fixed, fixed.changeId, fixed.revisionId);
      if (sealed.hash !== snapshot.hash) throw new CandidateGatewayError(502, 'candidate.invalid_snapshot_hash');
      if (fixed.expectedRevisionId !== null) {
        if (fixed.supersede) {
          if (!current || fixed.revisionId === current.revisionId || fixed.supersede.changeId !== current.changeId
            || fixed.supersede.revisionId !== current.revisionId || current.revisionId !== fixed.expectedRevisionId) {
            throw new CandidateGatewayError(409, 'candidate.supersede_mismatch');
          }
        } else if (!current || !permit) {
          throw new CandidateGatewayError(409, 'candidate.result_permit_required');
        } else {
          await assertPermit(fixed, current, permit, sealed);
        }
      }
      const pointer: CandidatePointer = {
        changeId: fixed.changeId,
        revisionId: fixed.revisionId,
        snapshotHash: snapshot.hash,
        revisionNumber: (current?.revisionNumber ?? 0) + 1,
        ...(permit ? { source: {
          resultId: permit.resultId, resultHash: permit.resultHash, revisionId: permit.inputRevisionId,
          snapshotHash: permit.inputSnapshotHash, revisionNumber: permit.inputRevisionNumber,
        } } : {}),
        ...(fixed.supersede && current ? { supersedes: {
          changeId: current.changeId, revisionId: current.revisionId, revisionNumber: current.revisionNumber,
        } } : {}),
      };
      await savePointer(fixed, pointer);
      return { status: 'committed', pointer };
    });
  } catch (error) { asStorageError(error); }
}

export async function candidateMarkResult(input: CandidateMarkResultInput, _options: CandidateGatewayOptions = {}): Promise<CandidateMarkResultResult> {
  const fixed = frozenClone(input);
  const normalized = await buildCandidateResult({ ...fixed, result: fixed.result });
  if (normalized.resultHash !== fixed.resultHash) throw new CandidateGatewayError(400, 'candidate.invalid_result_hash');
  const stored: StoredResult = {
    resultId: fixed.resultId,
    resultHash: fixed.resultHash,
    expectedRevisionId: fixed.expectedRevisionId,
    expectedSnapshotHash: fixed.expectedSnapshotHash,
    expectedRevisionNumber: fixed.expectedRevisionNumber,
    manifest: normalized.result,
    outputSnapshot: outputRecord(normalized.outputSnapshot),
  };
  try {
    return await withModuleWriter(fixed.project, fixed.moduleName, async () => {
      const current = await loadPointer(fixed);
      if (!current || current.revisionId !== fixed.expectedRevisionId || current.snapshotHash !== fixed.expectedSnapshotHash
        || current.revisionNumber !== fixed.expectedRevisionNumber) {
        return { status: 'conflict', pointer: current };
      }
      const sealed = await snapshotFromSeal(fixed, current.changeId, current.revisionId);
      if (sealed.hash !== current.snapshotHash) throw new CandidateGatewayError(502, 'candidate.invalid_snapshot_hash');
      if (normalized.result.status === 'completed') {
        const paths = (files: Array<{ path: string }>) => files.map(file => file.path).sort();
        const inputPaths = JSON.stringify(paths(sealed.files));
        if (inputPaths !== JSON.stringify(paths(normalized.outputSnapshot.files))
          || inputPaths !== JSON.stringify(paths(normalized.result.artifacts))) {
          throw new CandidateGatewayError(400, 'candidate.result_artifact_paths_mismatch');
        }
      }
      const prior = await loadStoredResult(fixed, fixed.resultId);
      if (prior) {
        if (!sameStoredResult(prior, stored)) throw new CandidateGatewayError(409, 'candidate.result_reused');
        if (current.resultId === fixed.resultId && current.resultHash === fixed.resultHash
          && current.resultRevisionId === fixed.expectedRevisionId) {
          return { status: 'marked', pointer: current, permit: markedPermit(fixed, normalized.result.outputSnapshotHash) };
        }
        return { status: 'conflict', pointer: current };
      }
      if (current.resultId) return { status: 'conflict', pointer: current };
      await saveStoredResult(fixed, stored);
      const pointer: CandidatePointer = {
        ...current,
        resultRevisionId: fixed.expectedRevisionId,
        resultSnapshotHash: fixed.expectedSnapshotHash,
        resultRevisionNumber: fixed.expectedRevisionNumber,
        resultId: fixed.resultId,
        resultHash: fixed.resultHash,
      };
      await savePointer(fixed, pointer);
      return { status: 'marked', pointer, permit: markedPermit(fixed, normalized.result.outputSnapshotHash) };
    });
  } catch (error) { asStorageError(error); }
}
