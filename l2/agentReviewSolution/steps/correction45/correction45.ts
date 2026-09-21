/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/correction45/correction45.ts" enhancement="_blank" />

import type { NewReleaseOverlayValidation } from '/_102035_/l2/newRelease/tobe.js';
import {
  VALIDATE40_MAX_ATTEMPTS,
  type Validate40CorrectionState,
} from '/_102035_/l2/agentReviewSolution/steps/validate40/validate40.js';

export const CORRECTION45_PRIVATE_STATE_VERSION = '2026-09-21-correction45-private-state-v1' as const;
export const MAX_CORRECTION45_PRIVATE_STATE_CHARS = 550_000;

export interface Correction45Mutation {
  artifactPath: string;
  pointer: string;
  issueCode: string;
  fromJson: string;
  toJson: string;
}

export interface Correction45Result {
  status: 'corrected' | 'uncorrectable';
  attempted: boolean;
  state: Validate40CorrectionState;
  draft: Record<string, unknown>;
  mutations: Correction45Mutation[];
  reasons: string[];
}

export interface Correction45PrivateState extends Correction45Result {
  schemaVersion: typeof CORRECTION45_PRIVATE_STATE_VERSION;
  project: number;
  moduleName: string;
  baseId: string;
  changeId: string;
  revisionId: string;
  requestRevision: number;
  originalHashes: Record<string, string>;
  candidateHashes: Record<string, string>;
  validationContextHash: string;
  sourceValidationPlanId: string;
}

const PROTECTED_KEYS = new Set(['__proto__', 'prototype', 'constructor', 'id', 'moduleName', 'schemaVersion']);

/**
 * Applies the only automatic correction rule: an exact invalid scalar may be restored to the
 * corresponding scalar from the frozen base. No path is added/removed and no value is invented.
 */
export function correct45Directed(
  base: Record<string, unknown>,
  draftInput: Record<string, unknown>,
  validation: NewReleaseOverlayValidation | null,
  stateInput: Validate40CorrectionState,
): Correction45Result {
  assertCorrectionState(stateInput);
  const draft = cloneJson(draftInput);
  const state = { ...stateInput };
  if (state.correctionAttemptsUsed >= VALIDATE40_MAX_ATTEMPTS) {
    return terminal(draft, state, `Correction attempt limit (${VALIDATE40_MAX_ATTEMPTS}) reached for this request.`);
  }
  if (!validation) return terminal(draft, state, 'Validation details are unavailable; no safe correction was attempted.');

  const mutations: Correction45Mutation[] = [];
  const seen = new Set<string>();
  const rejected: string[] = [];
  for (const issue of validation.issues.filter(item => item.severity === 'error')) {
    const pointer = jsonPathToPointer(issue.path);
    const identity = pointer ? `${issue.artifact}\u0000${pointer}` : '';
    if (!pointer || seen.has(identity)) continue;
    seen.add(identity);
    try {
      const segments = pointerSegments(pointer);
      const current = atPointer(draft[issue.artifact], segments);
      const original = atPointer(base[issue.artifact], segments);
      if (!isCorrectableScalar(current.value) || !isCorrectableScalar(original.value)
        || typeof current.value !== typeof original.value || Object.is(current.value, original.value)) {
        rejected.push(`${issue.code} ${issue.artifact}${issue.path}: no distinct base scalar is available.`);
        continue;
      }
      if (typeof original.value === 'string' && !original.value.trim()) {
        rejected.push(`${issue.code} ${issue.artifact}${issue.path}: the base scalar is blank.`);
        continue;
      }
      const mutation: Correction45Mutation = {
        artifactPath: issue.artifact,
        pointer,
        issueCode: issue.code,
        fromJson: JSON.stringify(current.value),
        toJson: JSON.stringify(original.value),
      };
      setPointer(current.parent, current.key, original.value);
      mutations.push(mutation);
    } catch (error) {
      rejected.push(`${issue.code} ${issue.artifact}${issue.path}: ${errorMessage(error)}`);
    }
  }
  if (!mutations.length) {
    return terminal(draft, state, rejected[0] || 'No validation error has a safe scalar correction target.');
  }
  return {
    status: 'corrected',
    attempted: true,
    state: { requestKey: state.requestKey, correctionAttemptsUsed: state.correctionAttemptsUsed + 1 },
    draft,
    mutations,
    reasons: rejected,
  };
}

export function parseCorrection45PrivateState(raw: string): Correction45PrivateState {
  if (raw.length > MAX_CORRECTION45_PRIVATE_STATE_CHARS) throw new Error('correction45 private state exceeds its size limit.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('correction45 private state is invalid JSON.'); }
  const keys = ['schemaVersion', 'project', 'moduleName', 'baseId', 'changeId', 'revisionId', 'requestRevision',
    'originalHashes', 'candidateHashes', 'validationContextHash', 'sourceValidationPlanId', 'status', 'attempted',
    'state', 'draft', 'mutations', 'reasons'].sort();
  if (!isRecord(parsed) || Object.keys(parsed).length !== keys.length
    || Object.keys(parsed).sort().some((key, index) => key !== keys[index])
    || parsed.schemaVersion !== CORRECTION45_PRIVATE_STATE_VERSION
    || !Number.isSafeInteger(parsed.project) || Number(parsed.project) <= 0
    || typeof parsed.moduleName !== 'string' || !parsed.moduleName || typeof parsed.baseId !== 'string' || !parsed.baseId
    || typeof parsed.changeId !== 'string' || !parsed.changeId || typeof parsed.revisionId !== 'string' || !parsed.revisionId
    || !Number.isSafeInteger(parsed.requestRevision) || Number(parsed.requestRevision) < 1
    || !isHashMap(parsed.originalHashes) || !isHashMap(parsed.candidateHashes)
    || typeof parsed.validationContextHash !== 'string' || !/^sha256:[a-f0-9]{64}$/u.test(parsed.validationContextHash)
    || typeof parsed.sourceValidationPlanId !== 'string' || !/^validate40-private-terminal-\d+$/u.test(parsed.sourceValidationPlanId)
    || (parsed.status !== 'corrected' && parsed.status !== 'uncorrectable') || typeof parsed.attempted !== 'boolean'
    || !isCorrectionState(parsed.state) || !isInventory(parsed.draft) || !Array.isArray(parsed.mutations)
    || parsed.mutations.some(item => !isMutation(item)) || !isStringArray(parsed.reasons)
    || (parsed.status === 'corrected') !== parsed.attempted
    || (parsed.attempted && (!parsed.mutations.length || Number(parsed.state.correctionAttemptsUsed) < 1))
    || (!parsed.attempted && parsed.mutations.length > 0)) {
    throw new Error('correction45 private state has an invalid shape.');
  }
  return parsed as unknown as Correction45PrivateState;
}

export function correction45ResultMatches(
  stored: Correction45PrivateState,
  expected: Correction45Result,
): boolean {
  return JSON.stringify({
    status: stored.status,
    attempted: stored.attempted,
    state: stored.state,
    draft: stored.draft,
    mutations: stored.mutations,
    reasons: stored.reasons,
  }) === JSON.stringify(expected);
}

function terminal(
  draft: Record<string, unknown>,
  state: Validate40CorrectionState,
  reason: string,
): Correction45Result {
  return { status: 'uncorrectable', attempted: false, state, draft, mutations: [], reasons: [reason] };
}

function jsonPathToPointer(path: string): string | null {
  if (!path || path === '$' || path.length > 1000) return null;
  const normalized = path.startsWith('$') ? path : `$.${path}`;
  const segments: string[] = [];
  let cursor = 1;
  while (cursor < normalized.length) {
    if (normalized[cursor] === '.') {
      const match = /^[A-Za-z_$][A-Za-z0-9_$]*/u.exec(normalized.slice(cursor + 1));
      if (!match) return null;
      segments.push(match[0]);
      cursor += match[0].length + 1;
    } else if (normalized[cursor] === '[') {
      const match = /^\[(0|[1-9]\d*)\]/u.exec(normalized.slice(cursor));
      if (!match) return null;
      segments.push(match[1]);
      cursor += match[0].length;
    } else return null;
  }
  if (!segments.length || segments.some(isProtectedKey)) return null;
  return `/${segments.map(segment => segment.replace(/~/gu, '~0').replace(/\//gu, '~1')).join('/')}`;
}

function pointerSegments(pointer: string): string[] {
  if (!pointer.startsWith('/') || pointer === '/' || pointer.length > 1000) throw new Error('invalid JSON pointer');
  return pointer.slice(1).split('/').map(segment => {
    if (/~(?![01])/u.test(segment)) throw new Error('invalid JSON pointer escape');
    const key = segment.replace(/~1/gu, '/').replace(/~0/gu, '~');
    if (!key || isProtectedKey(key)) throw new Error('identity or unsafe field cannot be corrected');
    return key;
  });
}

function isProtectedKey(key: string): boolean {
  return PROTECTED_KEYS.has(key) || /Id$|ID$/u.test(key);
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

function setPointer(parent: Record<string, unknown> | unknown[], key: string, value: string | number | boolean): void {
  if (Array.isArray(parent)) parent[Number(key)] = value;
  else parent[key] = value;
}

function isCorrectableScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
}

function assertCorrectionState(state: Validate40CorrectionState): void {
  if (!state.requestKey.trim() || !Number.isSafeInteger(state.correctionAttemptsUsed)
    || state.correctionAttemptsUsed < 0 || state.correctionAttemptsUsed > VALIDATE40_MAX_ATTEMPTS) {
    throw new Error('invalid correction45 attempt state');
  }
}

function isCorrectionState(value: unknown): value is Validate40CorrectionState {
  return isRecord(value) && Object.keys(value).length === 2 && typeof value.requestKey === 'string' && value.requestKey.length > 0
    && Number.isSafeInteger(value.correctionAttemptsUsed) && Number(value.correctionAttemptsUsed) >= 0
    && Number(value.correctionAttemptsUsed) <= VALIDATE40_MAX_ATTEMPTS;
}

function isMutation(value: unknown): value is Correction45Mutation {
  return isRecord(value) && Object.keys(value).length === 5 && typeof value.artifactPath === 'string'
    && typeof value.pointer === 'string' && typeof value.issueCode === 'string'
    && typeof value.fromJson === 'string' && typeof value.toJson === 'string';
}

function isHashMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(hash => typeof hash === 'string' && hash.startsWith('sha256:'));
}

function isInventory(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Object.values(value).every(isRecord);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
