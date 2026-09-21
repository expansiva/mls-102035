/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/reviewTaskState.ts" enhancement="_blank" />

import type { MdmOntology, DataFamilyOntology } from '/_102034_/l1/mdm/defs/ontologyTypes.js';
import type { Ns5OntologyV3PlanDraft } from '/_102035_/l2/agentNewSolution5/steps/ontology30/contractsV3.js';
import {
  pipelineJsonFileForProject,
  readDefsJson,
  readJson,
  readPipelineForProject,
} from '/_102035_/l2/solution/fs.js';
import { listNs5Modules } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type {
  Validate40Context,
  Validate40CorrectionState,
} from '/_102035_/l2/agentReviewSolution/steps/validate40/validate40.js';
import type { ReviewEntrySnapshot } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';

export const REVIEW_TASK_STATE_VERSION = '2026-09-21-review-task-state-v1' as const;
export const MAX_REVIEW_TASK_STATE_CHARS = 350_000;
const MAX_CORRECTION_ATTEMPTS = 3;

export interface ReviewTaskState {
  schemaVersion: typeof REVIEW_TASK_STATE_VERSION;
  project: number;
  moduleName: string;
  changeId: string;
  revisionId: string;
  requestRevision: number;
  requestKey: string;
  correctionAttemptsUsed: number;
  validationContextHash: string;
  validationContext: Validate40Context;
}

export async function captureReviewTaskState(snapshot: ReviewEntrySnapshot): Promise<ReviewTaskState> {
  const validationContext = await readRealValidationContext(snapshot.project, snapshot.moduleName);
  return buildReviewTaskState(snapshot, validationContext, 0);
}

export async function buildReviewTaskState(
  snapshot: ReviewEntrySnapshot,
  validationContext: Validate40Context,
  correctionAttemptsUsed: number,
): Promise<ReviewTaskState> {
  if (!Number.isSafeInteger(correctionAttemptsUsed) || correctionAttemptsUsed < 0
    || correctionAttemptsUsed > MAX_CORRECTION_ATTEMPTS) {
    throw new Error('Invalid review correction counter.');
  }
  const context = cloneJson(validationContext);
  const state: ReviewTaskState = {
    schemaVersion: REVIEW_TASK_STATE_VERSION,
    project: snapshot.project,
    moduleName: snapshot.moduleName,
    changeId: snapshot.changeId,
    revisionId: snapshot.revisionId,
    requestRevision: snapshot.requestRevision,
    requestKey: requestKeyFor(snapshot),
    correctionAttemptsUsed,
    validationContextHash: await sha256(JSON.stringify(context)),
    validationContext: context,
  };
  assertStateSize(state);
  return state;
}

export async function reviewTaskStateFromContext(
  context: mls.msg.ExecutionContext,
  snapshot: ReviewEntrySnapshot,
): Promise<ReviewTaskState> {
  const raw = context.task?.iaCompressed?.longMemory?.reviewPrivateState;
  if (typeof raw !== 'string') throw new Error('Private review task state is missing.');
  if (raw.length > MAX_REVIEW_TASK_STATE_CHARS) throw new Error('Private review task state exceeds its size limit.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('Private review task state is invalid JSON.'); }
  const state = parseReviewTaskState(parsed);
  if (state.project !== snapshot.project || state.moduleName !== snapshot.moduleName
    || state.changeId !== snapshot.changeId || state.revisionId !== snapshot.revisionId
    || state.requestRevision !== snapshot.requestRevision || state.requestKey !== requestKeyFor(snapshot)) {
    throw new Error('Private review task state differs from the frozen entry snapshot.');
  }
  if (state.validationContextHash !== await sha256(JSON.stringify(state.validationContext))) {
    throw new Error('Private validation context was altered.');
  }
  return state;
}

export function correctionStateOf(state: ReviewTaskState): Validate40CorrectionState {
  return { requestKey: state.requestKey, correctionAttemptsUsed: state.correctionAttemptsUsed };
}

function parseReviewTaskState(value: unknown): ReviewTaskState {
  const keys = ['schemaVersion', 'project', 'moduleName', 'changeId', 'revisionId', 'requestRevision', 'requestKey',
    'correctionAttemptsUsed', 'validationContextHash', 'validationContext'].sort();
  if (!isRecord(value) || Object.keys(value).length !== keys.length
    || Object.keys(value).sort().some((key, index) => key !== keys[index])
    || value.schemaVersion !== REVIEW_TASK_STATE_VERSION || !Number.isSafeInteger(value.project) || Number(value.project) <= 0
    || typeof value.moduleName !== 'string' || !value.moduleName || typeof value.changeId !== 'string' || !value.changeId
    || typeof value.revisionId !== 'string' || !value.revisionId
    || !Number.isSafeInteger(value.requestRevision) || Number(value.requestRevision) < 1
    || typeof value.requestKey !== 'string' || !value.requestKey
    || !Number.isSafeInteger(value.correctionAttemptsUsed) || Number(value.correctionAttemptsUsed) < 0
    || Number(value.correctionAttemptsUsed) > MAX_CORRECTION_ATTEMPTS
    || typeof value.validationContextHash !== 'string' || !/^sha256:[a-f0-9]{64}$/u.test(value.validationContextHash)
    || !isValidationContext(value.validationContext)) {
    throw new Error('Private review task state has an invalid shape.');
  }
  return value as unknown as ReviewTaskState;
}

async function readRealValidationContext(project: number, moduleName: string): Promise<Validate40Context> {
  const [mdm, tdm, ddm, pipeline, ontologyPlan] = await Promise.all([
    readDefsJson<MdmOntology>({ project: 102034, level: 4, folder: 'ontology', shortName: 'mdm', extension: '.defs.ts' }),
    readDefsJson<DataFamilyOntology>({ project: 102034, level: 4, folder: 'ontology', shortName: 'tdm', extension: '.defs.ts' }),
    readDefsJson<DataFamilyOntology>({ project: 102034, level: 4, folder: 'ontology', shortName: 'ddm', extension: '.defs.ts' }),
    readPipelineForProject(project, moduleName),
    readJson<Ns5OntologyV3PlanDraft>(pipelineJsonFileForProject(project, moduleName, 'ontology30-plan-draft')),
  ]);
  const registryModuleNames = listNs5Modules(project);
  return {
    v3: {
      ...(mdm ? { mdm } : {}),
      ...(tdm ? { tdm } : {}),
      ...(ddm ? { ddm } : {}),
      ontologyPlan,
      registryModuleNames,
    },
    v2: { pipeline, registryModuleNames },
  };
}

function requestKeyFor(snapshot: Pick<ReviewEntrySnapshot, 'changeId' | 'requestRevision'>): string {
  return `${snapshot.changeId}/request-${snapshot.requestRevision}`;
}

function assertStateSize(state: ReviewTaskState): void {
  if (JSON.stringify(state).length > MAX_REVIEW_TASK_STATE_CHARS) {
    throw new Error('Private review task state exceeds its size limit.');
  }
}

function isValidationContext(value: unknown): value is Validate40Context {
  if (!isRecord(value)) return false;
  if (value.v3 !== undefined && !isRecord(value.v3)) return false;
  if (value.v2 !== undefined && !isRecord(value.v2)) return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function sha256(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
