/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateGateway.ts" enhancement="_blank" />

/** Wire contract of the authenticated candidate endpoint. No local-store fallback. */
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

export interface CandidateGatewayOptions {
  /** Explicit test/Studio override. Production host calls use the restricted `mls.candidateIO`. */
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

type CandidateCapabilityResponse = Record<string, unknown> & { statusCode: number };

interface CandidateIoCapability {
  read(input: CandidateScope): Promise<CandidateCapabilityResponse>;
  publish(input: CandidatePublishInput): Promise<CandidateCapabilityResponse>;
  markResult(input: CandidateMarkResultInput): Promise<CandidateCapabilityResponse>;
}

const DEFAULT_ENDPOINT = '/exec/candidate';
const TOKEN = /^[A-Za-z0-9_-]{1,100}$/u;
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

function fixedOptions(options: CandidateGatewayOptions): CandidateGatewayOptions {
  return Object.freeze({
    ...(options.endpoint !== undefined ? { endpoint: options.endpoint } : {}),
    ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),
  });
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

function injectedCandidateIo(): CandidateIoCapability | null {
  const host = record((globalThis as typeof globalThis & { mls?: unknown }).mls);
  if (!host || host.candidateIO === undefined) return null;
  const capability = record(host.candidateIO);
  if (!capability || typeof capability.read !== 'function' || typeof capability.publish !== 'function'
    || typeof capability.markResult !== 'function') {
    throw new CandidateGatewayError(503, 'candidate.transport_unavailable');
  }
  return capability as unknown as CandidateIoCapability;
}

async function postThroughCandidateIo(
  body: Record<string, unknown>,
  capability: CandidateIoCapability,
): Promise<{ httpStatus: number; payload: Record<string, unknown> }> {
  const { action, ...input } = frozenClone(body);
  let raw: CandidateCapabilityResponse;
  try {
    if (action === 'candidateRead') raw = await capability.read(input as unknown as CandidateScope);
    else if (action === 'candidatePublish') raw = await capability.publish(input as unknown as CandidatePublishInput);
    else if (action === 'candidateMarkResult') raw = await capability.markResult(input as unknown as CandidateMarkResultInput);
    else throw new CandidateGatewayError(400, 'candidate.invalid_action');
  } catch (error) {
    if (error instanceof CandidateGatewayError) throw error;
    const failure = record(error);
    if (failure && Number.isInteger(failure.statusCode) && Number(failure.statusCode) >= 400
      && Number(failure.statusCode) <= 599 && typeof failure.code === 'string'
      && failure.code.startsWith('candidate.')) {
      throw new CandidateGatewayError(Number(failure.statusCode), failure.code);
    }
    throw new CandidateGatewayError(503, 'candidate.transport_unavailable');
  }
  const payload = record(frozenClone(raw));
  if (!payload || !Number.isInteger(payload.statusCode)) {
    throw new CandidateGatewayError(502, 'candidate.invalid_response');
  }
  return { httpStatus: Number(payload.statusCode), payload };
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
    || typeof raw.taskId !== 'string' || !TOKEN.test(raw.taskId)
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
  if (!pointer.resultRevisionId || !pointer.resultSnapshotHash || !pointer.resultRevisionNumber
    || !pointer.resultId || !pointer.resultHash || !result
    || result.resultRevisionId !== pointer.resultRevisionId || result.resultId !== pointer.resultId
    || result.resultSnapshotHash !== pointer.resultSnapshotHash
    || result.resultRevisionNumber !== pointer.resultRevisionNumber
    || result.resultHash !== pointer.resultHash) {
    throw new CandidateGatewayError(502, 'candidate.invalid_result');
  }
  const normalized = await normalizeResultManifest(result.manifest, 502);
  if (normalized.hash !== pointer.resultHash) throw new CandidateGatewayError(502, 'candidate.invalid_result_hash');
  return {
    resultRevisionId: pointer.resultRevisionId, resultSnapshotHash: pointer.resultSnapshotHash,
    resultRevisionNumber: pointer.resultRevisionNumber, resultId: pointer.resultId,
    resultHash: pointer.resultHash, manifest: normalized.manifest,
  };
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

async function post(
  body: Record<string, unknown>,
  options: CandidateGatewayOptions,
): Promise<{ httpStatus: number; payload: Record<string, unknown> }> {
  if (options.endpoint === undefined && options.fetchImpl === undefined) {
    const capability = injectedCandidateIo();
    if (capability) return postThroughCandidateIo(body, capability);
  }
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(options.endpoint ?? DEFAULT_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', cache: 'no-store', redirect: 'error', body: JSON.stringify(body),
    });
  } catch {
    throw new CandidateGatewayError(503, 'candidate.transport_unavailable');
  }
  if (response.status === 401) throw new CandidateGatewayError(401, 'candidate.unauthorized');
  if (response.status === 403) throw new CandidateGatewayError(403, 'candidate.forbidden');
  if (response.status >= 500) throw new CandidateGatewayError(503, 'candidate.storage_unavailable');
  let payload: Record<string, unknown> | null;
  try { payload = record(await response.json()); }
  catch { payload = null; }
  if (!payload || payload.statusCode !== response.status) {
    throw new CandidateGatewayError(502, 'candidate.invalid_response');
  }
  if (response.status !== 200 && response.status !== 409) {
    throw new CandidateGatewayError(response.status, typeof payload.msg === 'string' ? payload.msg : 'candidate.request_failed');
  }
  return { httpStatus: response.status, payload };
}

export async function candidateRead(scope: CandidateScope, options: CandidateGatewayOptions = {}): Promise<CandidateReadResult> {
  requireScope(scope);
  const { httpStatus, payload } = await post({
    action: 'candidateRead', project: scope.project, moduleName: scope.moduleName,
  }, options);
  if (httpStatus !== 200 || payload.status !== 'read') throw new CandidateGatewayError(502, 'candidate.invalid_response');
  const pointer = parsePointer(payload.pointer);
  if (!pointer) {
    if (payload.snapshot !== undefined && payload.snapshot !== null) throw new CandidateGatewayError(502, 'candidate.invalid_response');
    return { status: 'read', pointer: null, snapshot: null };
  }
  const snapshot = await verifyCandidateSnapshot(payload.snapshot);
  if (pointer.snapshotHash !== snapshot.hash) throw new CandidateGatewayError(502, 'candidate.invalid_snapshot_hash');
  if (pointer.resultId) {
    return { status: 'read', pointer, snapshot, result: await verifyCandidateResult(payload.result, pointer) };
  }
  if (payload.result !== undefined && payload.result !== null) throw new CandidateGatewayError(502, 'candidate.invalid_response');
  return { status: 'read', pointer, snapshot };
}

export async function candidatePublish(input: CandidatePublishInput, options: CandidateGatewayOptions = {}): Promise<CandidatePublishResult> {
  const fixed = frozenClone(input);
  const transport = fixedOptions(options);
  requireScope(fixed);
  requireToken(fixed.requestId);
  requireToken(fixed.changeId);
  requireToken(fixed.revisionId);
  if (fixed.expectedRevisionId !== null) requireToken(fixed.expectedRevisionId);
  const snapshot = await verifyCandidateSnapshot(fixed.snapshot);
  const permit = normalizePermit(fixed.permit, fixed.expectedRevisionId !== null);
  if (permit && (permit.inputRevisionId !== fixed.expectedRevisionId
    || permit.outputSnapshotHash !== snapshot.hash)) {
    throw new CandidateGatewayError(409, 'candidate.result_permit_mismatch');
  }
  const { httpStatus, payload } = await post({
    action: 'candidatePublish', project: fixed.project, moduleName: fixed.moduleName,
    expectedRevisionId: fixed.expectedRevisionId, requestId: fixed.requestId,
    changeId: fixed.changeId, revisionId: fixed.revisionId, snapshot, ...(permit ? { permit } : {}),
  }, transport);
  if (httpStatus === 409 && payload.status === 'conflict') {
    return { status: 'conflict', pointer: parsePointer(payload.pointer) };
  }
  if (httpStatus !== 200 || payload.status !== 'committed') throw new CandidateGatewayError(502, 'candidate.invalid_response');
  const pointer = parsePointer(payload.pointer);
  if (!pointer || pointer.changeId !== fixed.changeId || pointer.revisionId !== fixed.revisionId
    || pointer.snapshotHash !== snapshot.hash) throw new CandidateGatewayError(502, 'candidate.invalid_response');
  return { status: 'committed', pointer };
}

export async function candidateMarkResult(input: CandidateMarkResultInput, options: CandidateGatewayOptions = {}): Promise<CandidateMarkResultResult> {
  const fixed = frozenClone(input);
  const transport = fixedOptions(options);
  const normalized = await buildCandidateResult({ ...fixed, result: fixed.result });
  if (normalized.resultHash !== fixed.resultHash) throw new CandidateGatewayError(400, 'candidate.invalid_result_hash');
  const { httpStatus, payload } = await post({
    action: 'candidateMarkResult', project: fixed.project, moduleName: fixed.moduleName,
    expectedRevisionId: fixed.expectedRevisionId, expectedSnapshotHash: fixed.expectedSnapshotHash,
    expectedRevisionNumber: fixed.expectedRevisionNumber, resultId: fixed.resultId,
    resultHash: fixed.resultHash, result: normalized.result, outputSnapshot: normalized.outputSnapshot,
  }, transport);
  if (httpStatus === 409 && payload.status === 'conflict') {
    return { status: 'conflict', pointer: parsePointer(payload.pointer) };
  }
  if (httpStatus !== 200 || payload.status !== 'marked') throw new CandidateGatewayError(502, 'candidate.invalid_response');
  const pointer = parsePointer(payload.pointer);
  if (!pointer || pointer.revisionId !== fixed.expectedRevisionId || pointer.snapshotHash !== fixed.expectedSnapshotHash
    || pointer.revisionNumber !== fixed.expectedRevisionNumber || pointer.resultRevisionId !== fixed.expectedRevisionId
    || pointer.resultSnapshotHash !== fixed.expectedSnapshotHash
    || pointer.resultRevisionNumber !== fixed.expectedRevisionNumber
    || pointer.resultId !== fixed.resultId || pointer.resultHash !== fixed.resultHash) {
    throw new CandidateGatewayError(502, 'candidate.invalid_response');
  }
  return {
    status: 'marked', pointer,
    permit: {
      resultId: fixed.resultId, resultHash: fixed.resultHash,
      inputRevisionId: fixed.expectedRevisionId, inputSnapshotHash: fixed.expectedSnapshotHash,
      inputRevisionNumber: fixed.expectedRevisionNumber,
      outputSnapshotHash: normalized.result.outputSnapshotHash,
    },
  };
}
