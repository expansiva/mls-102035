/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/review20/review20.ts" enhancement="_blank" />

import { tobeDiff, type NewReleaseDiffEntry } from '/_102035_/l2/solution/candidate/tobeDiff.js';
import type { ReviewEntrySnapshot } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { displayPath, pipelineJsonFileForProject, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

export const REVIEW20_SCHEMA_VERSION = '2026-09-21-review20-v1' as const;
export const REVIEW20_CLARIFICATION_MAX = 1000;

const SECRET_KEY = /token|secret|password|authorization|api[-_]?key|credential/iu;
const clipNotes = new WeakMap<Review20Stage, string>();

/** A `parseResponse` refusal. The raw model answer stays on the error so the caller can record it. */
export class Review20ParseRefusal extends Error {
  readonly raw: unknown;
  constructor(message: string, raw: unknown) {
    super(message);
    this.name = 'Review20ParseRefusal';
    this.raw = raw;
  }
}

export interface Review20Operation {
  artifactPath: string;
  op: 'replace';
  pointer: string;
  basis: 'base-unchanged' | 'refine-candidate-edit';
  expectedJson: string;
  valueJson: string;
  reason: string;
}

export interface Review20Response {
  schemaVersion: typeof REVIEW20_SCHEMA_VERSION;
  decision: 'apply' | 'clarification';
  clarification: string;
  operations: Review20Operation[];
}

export interface Review20Stage {
  status: 'staged' | 'clarification';
  clarification: string;
  proposal: Record<string, unknown>;
  explicitDiff: Record<string, NewReleaseDiffEntry[]>;
  operationDiff: Record<string, NewReleaseDiffEntry[]>;
  proposedDiff: Record<string, NewReleaseDiffEntry[]>;
}

export interface Review20PersistedRequest {
  revision: number;
  request: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string): void {
  const actual = Object.keys(value).sort();
  if (actual.length !== keys.length || actual.some((key, index) => key !== [...keys].sort()[index])) {
    throw new Error(`${label} has missing or unexpected fields`);
  }
}

function assertJson(value: unknown, ancestors = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object') throw new Error('snapshot contains a non-JSON value');
  if (ancestors.has(value)) throw new Error('snapshot contains a cycle');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error('snapshot contains a non-plain object');
  }
  ancestors.add(value);
  if (Array.isArray(value)) value.forEach(item => assertJson(item, ancestors));
  else Object.values(value).forEach(item => assertJson(item, ancestors));
  ancestors.delete(value);
}

function cloneJson<T>(value: T): T {
  assertJson(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeOperationArtifactPath(path: string, moduleName: string): string {
  const prefix = `l4/${moduleName}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

function assertArtifactPath(path: string): void {
  const core = /^(?:module|rules|workflows|access|integration|workspace-model)\.defs\.ts$|^(?:journeys|ontology)\/index\.defs\.ts$/u;
  const child = /^(?:journeys\/[a-z][A-Za-z0-9]*|ontology\/[A-Z][A-Za-z0-9]*|workspaces\/[a-z][A-Za-z0-9]*)\.defs\.ts$/u;
  if (!core.test(path) && !child.test(path)) {
    throw new Error(`invalid artifact path: ${path}`);
  }
}

/** Last whole sentence that fits, otherwise the last word, otherwise a hard cut. */
export function clipClarification(text: string): { text: string; clipped: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= REVIEW20_CLARIFICATION_MAX) return { text: trimmed, clipped: false };
  let end = -1;
  const limit = Math.min(trimmed.length, REVIEW20_CLARIFICATION_MAX);
  for (let index = 0; index < limit; index += 1) {
    const mark = trimmed[index];
    if ((mark === '.' || mark === '?' || mark === '!') && (index + 1 === trimmed.length || /\s/u.test(trimmed[index + 1]))) {
      end = index + 1;
    }
  }
  if (end > 0) return { text: trimmed.slice(0, end).trim(), clipped: true };
  const space = trimmed.lastIndexOf(' ', REVIEW20_CLARIFICATION_MAX);
  const cut = space > 0 ? space : REVIEW20_CLARIFICATION_MAX;
  return { text: trimmed.slice(0, cut).trim(), clipped: true };
}

function refuse(message: string, raw: unknown): never {
  throw new Review20ParseRefusal(message, raw);
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return null;
  if (Array.isArray(value)) return value.slice(0, 64).map(item => redact(item, depth + 1));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY.test(key) ? '[redacted]' : redact(item, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 20_000) return `${value.slice(0, 20_000)}…`;
  return value;
}

/** `l4/<module>/pipeline/review20-refused.json` — the raw refused or clipped answer, never a secret. */
export function review20RefusalInfo(project: number, moduleName: string): Ns5FileInfo {
  return pipelineJsonFileForProject(project, moduleName, 'review20-refused');
}

export async function recordReview20Refusal(
  info: Ns5FileInfo,
  reason: string,
  raw: unknown,
  writer: (file: Ns5FileInfo, value: unknown) => Promise<unknown> = writeJson,
): Promise<string> {
  const citation = displayPath(info);
  await writer(info, { reason, raw: redact(raw) });
  return citation;
}

/** Set when a clarification question was longer than the limit and cut to a whole sentence. */
export function review20ClipNote(stage: Review20Stage): string | undefined {
  return clipNotes.get(stage);
}

function parseResponse(value: unknown): { response: Review20Response; clipNote?: string } {
  if (!isRecord(value)) refuse('review20 response must be an object', value);
  try { exactKeys(value, ['schemaVersion', 'decision', 'clarification', 'operations'], 'review20 response'); }
  catch (error) { refuse(error instanceof Error ? error.message : String(error), value); }
  if (value.schemaVersion !== REVIEW20_SCHEMA_VERSION) refuse('review20 schema version mismatch', value);
  if (value.decision !== 'apply' && value.decision !== 'clarification') refuse('invalid review20 decision', value);
  if (typeof value.clarification !== 'string') refuse('invalid clarification', value);
  if (!Array.isArray(value.operations) || value.operations.length > 32) refuse('invalid operations', value);
  let clarification = value.clarification;
  let clipNote: string | undefined;
  if (value.decision === 'clarification') {
    const clipped = clipClarification(clarification);
    clarification = clipped.text;
    if (clipped.clipped) clipNote = `clarification exceeded ${REVIEW20_CLARIFICATION_MAX} characters and was cut to a whole sentence`;
    if (!clarification || value.operations.length) refuse('clarification requires a question and no operations', value);
  } else if (value.clarification || !value.operations.length) {
    refuse('apply requires operations and no clarification', value);
  }
  for (const operation of value.operations) {
    if (!isRecord(operation)) refuse('operation must be an object', value);
    try { exactKeys(operation, ['artifactPath', 'op', 'pointer', 'basis', 'expectedJson', 'valueJson', 'reason'], 'operation'); }
    catch (error) { refuse(error instanceof Error ? error.message : String(error), value); }
    if (typeof operation.artifactPath !== 'string' || typeof operation.pointer !== 'string'
      || operation.op !== 'replace' || (operation.basis !== 'base-unchanged' && operation.basis !== 'refine-candidate-edit')
      || typeof operation.expectedJson !== 'string'
      || typeof operation.valueJson !== 'string' || typeof operation.reason !== 'string'
      || !operation.reason.trim() || operation.reason.length > 1000
      || operation.expectedJson.length > 10000 || operation.valueJson.length > 10000) {
      refuse('invalid review20 operation', value);
    }
  }
  return { response: { ...(value as unknown as Review20Response), clarification }, clipNote };
}

function parseScalar(text: string): string | number | boolean {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('operation value is not JSON'); }
  if ((typeof value !== 'string' || !value.trim())
    && (typeof value !== 'number' || !Number.isFinite(value))
    && typeof value !== 'boolean') throw new Error('operation value must be a nonblank JSON scalar');
  return value as string | number | boolean;
}

function pointerSegments(pointer: string): string[] {
  if (!pointer.startsWith('/') || pointer === '/' || pointer.length > 1000) throw new Error('invalid JSON pointer');
  return pointer.slice(1).split('/').map(segment => {
    if (/~(?![01])/u.test(segment)) throw new Error('invalid JSON pointer escape');
    const key = segment.replace(/~1/gu, '/').replace(/~0/gu, '~');
    if (!key || key === '__proto__' || key === 'prototype' || key === 'constructor'
      || key === 'id' || /Id$|ID$/u.test(key) || key === 'moduleName' || key === 'schemaVersion') {
      throw new Error('identity or unsafe field cannot be replaced');
    }
    return key;
  });
}

function atPointer(root: unknown, segments: string[]): { parent: Record<string, unknown> | unknown[]; key: string; value: unknown } {
  let parent: unknown = root;
  for (const key of segments.slice(0, -1)) {
    if (Array.isArray(parent)) {
      if (!/^(0|[1-9]\d*)$/u.test(key) || Number(key) >= parent.length) throw new Error('pointer leaves artifact');
      parent = parent[Number(key)];
    } else if (isRecord(parent) && Object.hasOwn(parent, key)) parent = parent[key];
    else throw new Error('pointer leaves artifact');
  }
  const key = segments[segments.length - 1];
  if (Array.isArray(parent)) {
    if (!/^(0|[1-9]\d*)$/u.test(key) || Number(key) >= parent.length) throw new Error('pointer target is missing');
    return { parent, key, value: parent[Number(key)] };
  }
  if (!isRecord(parent) || !Object.hasOwn(parent, key)) throw new Error('pointer target is missing');
  return { parent, key, value: parent[key] };
}

export function diffMaps(base: Record<string, unknown>, next: Record<string, unknown>): Record<string, NewReleaseDiffEntry[]> {
  const result: Record<string, NewReleaseDiffEntry[]> = {};
  for (const path of [...new Set([...Object.keys(base), ...Object.keys(next)])].sort()) {
    const entries = tobeDiff(base[path], next[path]);
    if (entries.length) result[path] = entries;
  }
  return result;
}

function assertReview20Inventories(
  snapshot: Pick<ReviewEntrySnapshot, 'moduleName' | 'request' | 'requestRevision'>,
  persistedRequest: Review20PersistedRequest,
  base: Record<string, unknown>,
  candidate: Record<string, unknown>,
): void {
  const { moduleName, request } = snapshot;
  if (!/^[a-z][a-zA-Z0-9]*$/u.test(moduleName) || !request.trim()) throw new Error('module and request are required');
  if (!Number.isSafeInteger(snapshot.requestRevision) || snapshot.requestRevision < 1
    || persistedRequest.revision !== snapshot.requestRevision || persistedRequest.request !== request) {
    throw new Error('review request differs from the persisted candidate revision');
  }
  if (!isRecord(base) || !isRecord(candidate)) throw new Error('base and candidate inventories are required');
  const basePaths = Object.keys(base).sort();
  const candidatePaths = Object.keys(candidate).sort();
  if (basePaths.length !== candidatePaths.length || basePaths.some((path, index) => path !== candidatePaths[index])) {
    throw new Error('candidate inventory differs from the captured base');
  }
  for (const [inventoryName, inventory] of [['base', base], ['candidate', candidate]] as const) {
    for (const [path, artifact] of Object.entries(inventory)) {
      assertArtifactPath(path);
      if (!isRecord(artifact)) throw new Error(`${inventoryName} artifact is not a JSON object`);
      assertJson(artifact);
      if (Object.hasOwn(artifact, 'moduleName') && artifact.moduleName !== moduleName) throw new Error('artifact belongs to another module');
    }
  }
}

/** Seal an already-edited candidate without a model: proposal is the candidate, operations empty. */
export function stageReview20Applied(
  snapshot: Pick<ReviewEntrySnapshot, 'moduleName' | 'request' | 'requestRevision'>,
  persistedRequest: Review20PersistedRequest,
  base: Record<string, unknown>,
  candidate: Record<string, unknown>,
): Review20Stage {
  assertReview20Inventories(snapshot, persistedRequest, base, candidate);
  const proposal = cloneJson(candidate);
  const explicitDiff = diffMaps(base, candidate);
  return { status: 'staged', clarification: '', proposal, explicitDiff, operationDiff: {}, proposedDiff: explicitDiff };
}

/** Pure staging only. Neither a model call nor an L4 approval/publication. */
export function stageReview20(
  snapshot: Pick<ReviewEntrySnapshot, 'moduleName' | 'request' | 'requestRevision'>,
  persistedRequest: Review20PersistedRequest,
  base: Record<string, unknown>,
  candidate: Record<string, unknown>,
  untrustedResponse: unknown,
): Review20Stage {
  assertReview20Inventories(snapshot, persistedRequest, base, candidate);
  const { moduleName } = snapshot;
  const parsed = parseResponse(untrustedResponse);
  const response = parsed.response;
  const proposal = cloneJson(candidate);
  const explicitDiff = diffMaps(base, candidate);
  if (response.decision === 'clarification') {
    const stage: Review20Stage = { status: 'clarification', clarification: response.clarification.trim(), proposal,
      explicitDiff, operationDiff: {}, proposedDiff: explicitDiff };
    if (parsed.clipNote) clipNotes.set(stage, parsed.clipNote);
    return stage;
  }
  const touched = new Set<string>();
  for (const operation of response.operations) {
    const artifactPath = normalizeOperationArtifactPath(operation.artifactPath, moduleName);
    assertArtifactPath(artifactPath);
    if (!Object.hasOwn(candidate, artifactPath) || !Object.hasOwn(base, artifactPath)) {
      throw new Error('operation artifact is not in both snapshots');
    }
    const identity = `${artifactPath}\u0000${operation.pointer}`;
    if (touched.has(identity)) throw new Error('duplicate operation target');
    touched.add(identity);
    const segments = pointerSegments(operation.pointer);
    const current = atPointer(candidate[artifactPath], segments).value;
    const original = atPointer(base[artifactPath], segments).value;
    const expected = parseScalar(operation.expectedJson);
    const replacement = parseScalar(operation.valueJson);
    if (typeof current !== typeof expected || !Object.is(current, expected)) throw new Error('operation expected value is stale');
    if (typeof original !== typeof current) throw new Error('operation target changed scalar type against the base');
    const candidateWasEdited = !Object.is(original, current);
    if (!candidateWasEdited && operation.basis !== 'base-unchanged') {
      throw new Error('operation policy expected a candidate edit, but the field still matches the base');
    }
    if (candidateWasEdited && operation.basis !== 'refine-candidate-edit') {
      throw new Error('manual candidate edit conflict: explicit refine policy is required');
    }
    if (typeof replacement !== typeof current || Object.is(replacement, current)) throw new Error('replacement changes type or is a no-op');
    const target = atPointer(proposal[artifactPath], segments);
    (target.parent as Record<string, unknown>)[target.key] = replacement;
  }
  return { status: 'staged', clarification: '', proposal, explicitDiff,
    operationDiff: diffMaps(candidate, proposal), proposedDiff: diffMaps(base, proposal) };
}
