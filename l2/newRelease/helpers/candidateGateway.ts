/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateGateway.ts" enhancement="_blank" />

/** Wire contract of the authenticated candidate endpoint. No local-store fallback. */
export interface CandidatePointer {
  changeId: string;
  revisionId: string;
  snapshotHash: string;
  revisionNumber: number;
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
}

export type CandidateReadResult =
  | { status: 'read'; pointer: null; snapshot: null }
  | { status: 'read'; pointer: CandidatePointer; snapshot: CandidateSnapshot };

export type CandidatePublishResult =
  | { status: 'committed'; pointer: CandidatePointer }
  | { status: 'conflict'; pointer: CandidatePointer | null };

export class CandidateGatewayError extends Error {
  constructor(readonly statusCode: number, readonly code: string) {
    super(code);
    this.name = 'CandidateGatewayError';
  }
}

export interface CandidateGatewayOptions {
  /** Same-origin in Studio; the CLI may inject an authenticated fetch and URL. */
  endpoint?: string;
  fetchImpl?: typeof fetch;
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

function requireScope(scope: CandidateScope): void {
  if (!Number.isSafeInteger(scope.project) || scope.project <= 0 || !MODULE.test(scope.moduleName)) {
    throw new CandidateGatewayError(400, 'candidate.invalid_scope');
  }
}

function requireToken(value: string): void {
  if (!TOKEN.test(value)) throw new CandidateGatewayError(400, 'candidate.invalid_identifier');
}

function validPath(path: string): boolean {
  return CORE_PATHS.some(core => core === path)
    || path === 'workspace-model.defs.ts'
    || /^(?:journeys\/[a-z][A-Za-z0-9]*|ontology\/[A-Z][A-Za-z0-9]*|workspaces\/[a-z][A-Za-z0-9]*)\.defs\.ts$/u.test(path);
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
  return {
    changeId: pointer.changeId,
    revisionId: pointer.revisionId,
    snapshotHash: pointer.snapshotHash,
    revisionNumber: Number(pointer.revisionNumber),
  };
}

/** Validates every source byte and the exact ordered manifest hash used by the CBE. */
export async function verifyCandidateSnapshot(value: unknown): Promise<CandidateSnapshot> {
  const snapshot = record(value);
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
    if (!file || typeof file.path !== 'string' || !validPath(file.path) || file.path.length > 180
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

/** Builds immutable wire bytes from complete L4 sources, never from a mutable shared path. */
export async function buildCandidateSnapshot(input: {
  baseId: string;
  requestRevision: number;
  request: string;
  sources: readonly { path: string; source: string }[];
}): Promise<CandidateSnapshot> {
  requireToken(input.baseId);
  if (!Number.isSafeInteger(input.requestRevision) || input.requestRevision < 0
    || typeof input.request !== 'string' || new TextEncoder().encode(input.request).byteLength > MAX_REQUEST_BYTES) {
    throw new CandidateGatewayError(400, 'candidate.invalid_request');
  }
  const files: CandidateFile[] = [];
  for (const item of input.sources) {
    if (!validPath(item.path) || typeof item.source !== 'string') {
      throw new CandidateGatewayError(400, 'candidate.invalid_file');
    }
    const bytes = new TextEncoder().encode(item.source);
    files.push({ path: item.path, sha256: await sha256(bytes), contentBase64: encodeBase64(bytes) });
  }
  const metadata = files.map(file => ({ path: file.path, sha256: file.sha256, bytes: decodeBase64(file.contentBase64).length }))
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const manifest = { baseId: input.baseId, requestRevision: input.requestRevision, request: input.request, files: metadata };
  const snapshot: CandidateSnapshot = {
    hash: await sha256(new TextEncoder().encode(JSON.stringify(manifest))),
    baseId: input.baseId, requestRevision: input.requestRevision, request: input.request, files,
  };
  try { await verifyCandidateSnapshot(snapshot); }
  catch { throw new CandidateGatewayError(400, 'candidate.invalid_snapshot'); }
  return snapshot;
}

async function post(
  body: Record<string, unknown>,
  options: CandidateGatewayOptions,
): Promise<{ httpStatus: number; payload: Record<string, unknown> }> {
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
  return { status: 'read', pointer, snapshot };
}

export async function candidatePublish(input: CandidatePublishInput, options: CandidateGatewayOptions = {}): Promise<CandidatePublishResult> {
  requireScope(input);
  requireToken(input.requestId);
  requireToken(input.changeId);
  requireToken(input.revisionId);
  if (input.expectedRevisionId !== null) requireToken(input.expectedRevisionId);
  const snapshot = await verifyCandidateSnapshot(input.snapshot);
  const { httpStatus, payload } = await post({
    action: 'candidatePublish', project: input.project, moduleName: input.moduleName,
    expectedRevisionId: input.expectedRevisionId, requestId: input.requestId,
    changeId: input.changeId, revisionId: input.revisionId, snapshot,
  }, options);
  if (httpStatus === 409 && payload.status === 'conflict') {
    return { status: 'conflict', pointer: parsePointer(payload.pointer) };
  }
  if (httpStatus !== 200 || payload.status !== 'committed') throw new CandidateGatewayError(502, 'candidate.invalid_response');
  const pointer = parsePointer(payload.pointer);
  if (!pointer || pointer.changeId !== input.changeId || pointer.revisionId !== input.revisionId
    || pointer.snapshotHash !== snapshot.hash) throw new CandidateGatewayError(502, 'candidate.invalid_response');
  return { status: 'committed', pointer };
}
