/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/review20/review20.ts" enhancement="_blank" />

import { tobeDiff, type NewReleaseDiffEntry } from '/_102035_/l2/newRelease/tobeDiff.js';
import type { ReviewEntrySnapshot } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';

export const REVIEW20_SCHEMA_VERSION = '2026-09-21-review20-v1' as const;

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

function assertArtifactPath(path: string): void {
  const core = /^(?:module|rules|workflows|access|integration|workspace-model)\.defs\.ts$|^(?:journeys|ontology)\/index\.defs\.ts$/u;
  const child = /^(?:journeys\/[a-z][A-Za-z0-9]*|ontology\/[A-Z][A-Za-z0-9]*|workspaces\/[a-z][A-Za-z0-9]*)\.defs\.ts$/u;
  if (!core.test(path) && !child.test(path)) {
    throw new Error(`invalid artifact path: ${path}`);
  }
}

function parseResponse(value: unknown): Review20Response {
  if (!isRecord(value)) throw new Error('review20 response must be an object');
  exactKeys(value, ['schemaVersion', 'decision', 'clarification', 'operations'], 'review20 response');
  if (value.schemaVersion !== REVIEW20_SCHEMA_VERSION) throw new Error('review20 schema version mismatch');
  if (value.decision !== 'apply' && value.decision !== 'clarification') throw new Error('invalid review20 decision');
  if (typeof value.clarification !== 'string' || value.clarification.length > 1000) throw new Error('invalid clarification');
  if (!Array.isArray(value.operations) || value.operations.length > 32) throw new Error('invalid operations');
  if (value.decision === 'clarification') {
    if (!value.clarification.trim() || value.operations.length) throw new Error('clarification requires a question and no operations');
  } else if (value.clarification || !value.operations.length) {
    throw new Error('apply requires operations and no clarification');
  }
  for (const operation of value.operations) {
    if (!isRecord(operation)) throw new Error('operation must be an object');
    exactKeys(operation, ['artifactPath', 'op', 'pointer', 'basis', 'expectedJson', 'valueJson', 'reason'], 'operation');
    if (typeof operation.artifactPath !== 'string' || typeof operation.pointer !== 'string'
      || operation.op !== 'replace' || (operation.basis !== 'base-unchanged' && operation.basis !== 'refine-candidate-edit')
      || typeof operation.expectedJson !== 'string'
      || typeof operation.valueJson !== 'string' || typeof operation.reason !== 'string'
      || !operation.reason.trim() || operation.reason.length > 1000
      || operation.expectedJson.length > 10000 || operation.valueJson.length > 10000) {
      throw new Error('invalid review20 operation');
    }
  }
  return value as unknown as Review20Response;
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

function diffMaps(base: Record<string, unknown>, next: Record<string, unknown>): Record<string, NewReleaseDiffEntry[]> {
  const result: Record<string, NewReleaseDiffEntry[]> = {};
  for (const path of [...new Set([...Object.keys(base), ...Object.keys(next)])].sort()) {
    const entries = tobeDiff(base[path], next[path]);
    if (entries.length) result[path] = entries;
  }
  return result;
}

/** Pure staging only. Neither a model call nor an L4 approval/publication. */
export function stageReview20(
  snapshot: Pick<ReviewEntrySnapshot, 'moduleName' | 'request' | 'requestRevision'>,
  persistedRequest: Review20PersistedRequest,
  base: Record<string, unknown>,
  candidate: Record<string, unknown>,
  untrustedResponse: unknown,
): Review20Stage {
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
  const response = parseResponse(untrustedResponse);
  const proposal = cloneJson(candidate);
  const explicitDiff = diffMaps(base, candidate);
  if (response.decision === 'clarification') {
    return { status: 'clarification', clarification: response.clarification.trim(), proposal,
      explicitDiff, operationDiff: {}, proposedDiff: explicitDiff };
  }
  const touched = new Set<string>();
  for (const operation of response.operations) {
    assertArtifactPath(operation.artifactPath);
    if (!Object.hasOwn(candidate, operation.artifactPath) || !Object.hasOwn(base, operation.artifactPath)) {
      throw new Error('operation artifact is not in both snapshots');
    }
    const identity = `${operation.artifactPath}\u0000${operation.pointer}`;
    if (touched.has(identity)) throw new Error('duplicate operation target');
    touched.add(identity);
    const segments = pointerSegments(operation.pointer);
    const current = atPointer(candidate[operation.artifactPath], segments).value;
    const original = atPointer(base[operation.artifactPath], segments).value;
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
    const target = atPointer(proposal[operation.artifactPath], segments);
    (target.parent as Record<string, unknown>)[target.key] = replacement;
  }
  return { status: 'staged', clarification: '', proposal, explicitDiff,
    operationDiff: diffMaps(candidate, proposal), proposedDiff: diffMaps(base, proposal) };
}
