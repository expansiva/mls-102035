/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/finalize50/agentFinalize50.ts" enhancement="_blank" />

import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { scanNs4ClassicJsonObject } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import {
  assertReviewSnapshotMatches,
  reviewSnapshotFromContext,
  type ReviewEntrySnapshot,
} from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { parseReviewInvocation, type ReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';
import { reviewTaskStateFromContext } from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import {
  assertReconcileStateIntegrity,
  assertValidate40DeterministicMatch,
  parseValidate40PrivateState,
  readPrivateReconcileResult,
  resolveValidate40Draft,
  type Validate40Runtime,
  type Validate40PrivateState,
} from '/_102035_/l2/agentReviewSolution/steps/validate40/agentValidate40.js';
import { validate40Private } from '/_102035_/l2/agentReviewSolution/steps/validate40/validate40.js';
import {
  buildCandidateResult,
  buildCandidateSnapshot,
  candidateMarkResult,
  candidateRead,
  type CandidateMarkResultResult,
  type CandidateMarkResultInput,
  type CandidatePointer,
  type CandidatePublishPermit,
  type CandidatePublishResult,
  type CandidateReadResult,
  type CandidateResultManifest,
  type CandidateSnapshot,
} from '/_102035_/l2/newRelease/helpers/candidateGateway.js';
import {
  createStudioCandidateAdapter,
  type StudioCandidateSubmittedReplayInput,
  type StudioCandidatePublishInput,
} from '/_102035_/l2/newRelease/helpers/studioCandidateAdapter.js';
import { stableStringifyTobe } from '/_102035_/l2/newRelease/tobeDiff.js';
import { normalizeTobeArtifactPath } from '/_102035_/l2/newRelease/tobe.js';
import {
  originalL4FileInfo,
  readActiveL4Change,
  readL4Release,
  readSealedL4Candidate,
  type L4SealedCandidateSnapshot,
} from '/_102035_/l2/newRelease/helpers/moduleRevision.js';
import { readSourceText } from '/_102035_/l2/solution/fs.js';

export const FINALIZE50_PRIVATE_RESULT_VERSION = '2026-09-21-finalize50-private-result-v3' as const;

export interface Finalize50PrivateResult {
  schemaVersion: typeof FINALIZE50_PRIVATE_RESULT_VERSION;
  project: number;
  moduleName: string;
  changeId: string;
  inputRevisionId: string;
  outputRevisionId: string;
  outputSnapshotHash: string;
  correctionState: Validate40PrivateState['correctionState'];
  pointer: CandidatePointer;
  summary: {
    fileCount: number;
    changedPaths: string[];
  };
}

export interface Finalize50Runtime {
  readSnapshot(invocation: ReviewInvocation): Promise<ReviewEntrySnapshot>;
  readSealedCandidate(project: number, moduleName: string, changeId: string, revisionId: string): Promise<L4SealedCandidateSnapshot | null>;
  readBaseSource(snapshot: ReviewEntrySnapshot, path: string): Promise<string>;
  buildSnapshot(input: Parameters<typeof buildCandidateSnapshot>[0]): Promise<CandidateSnapshot>;
  readAuthoritative(scope: { project: number; moduleName: string }): Promise<CandidateReadResult>;
  buildResult(input: Omit<CandidateMarkResultInput, 'resultHash'>): Promise<CandidateMarkResultInput>;
  markResult(input: CandidateMarkResultInput): Promise<CandidateMarkResultResult>;
  replaySubmitted(scope: { project: number; moduleName: string }, input: StudioCandidateSubmittedReplayInput): Promise<CandidatePublishResult | null>;
  publishWithPermit(scope: { project: number; moduleName: string }, input: StudioCandidatePublishInput): Promise<CandidatePublishResult>;
  validateDraft: Validate40Runtime['validate'];
}

const defaultRuntime: Finalize50Runtime = {
  readSnapshot: readFinalizeSnapshot,
  readSealedCandidate: readSealedL4Candidate,
  readBaseSource: (snapshot, path) => readSourceText(originalL4FileInfo(
    snapshot.project, snapshot.moduleName, snapshot.baseId, normalizeTobeArtifactPath(path),
  )),
  buildSnapshot: buildCandidateSnapshot,
  readAuthoritative: candidateRead,
  buildResult: buildCandidateResult,
  markResult: candidateMarkResult,
  replaySubmitted: (scope, input) => createStudioCandidateAdapter(scope).replaySubmitted(input),
  publishWithPermit: (scope, input) => createStudioCandidateAdapter(scope).publishWithPermit(input),
  validateDraft: validate40Private,
};

async function readFinalizeSnapshot(invocation: ReviewInvocation): Promise<ReviewEntrySnapshot> {
  const change = await readActiveL4Change(invocation.project, invocation.moduleName);
  if (!change?.activeRevisionId) throw new Error('Active sealed L4 revision is missing.');
  const [release, sealed] = await Promise.all([
    readL4Release(invocation.project, invocation.moduleName, change.baseId),
    readSealedL4Candidate(invocation.project, invocation.moduleName, change.changeId, change.activeRevisionId),
  ]);
  if (!release || !sealed) throw new Error('Active sealed L4 revision is incomplete.');
  return {
    project: invocation.project,
    moduleName: invocation.moduleName,
    originalL4Path: invocation.originalL4Path,
    temporaryL4Path: invocation.temporaryL4Path,
    request: sealed.request,
    baseId: change.baseId,
    changeId: change.changeId,
    revisionId: change.activeRevisionId,
    requestRevision: change.requestRevision,
    originalHashes: { ...release.files },
    candidateHashes: { ...sealed.manifest.files },
    changedPaths: [...sealed.manifest.changedPaths],
  };
}

export async function beforeFinalize50Step(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  runtime: Finalize50Runtime = defaultRuntime,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const invocation = parseReviewInvocation(String(step.prompt || ''), mls.actualProject || 0);
    const frozen = reviewSnapshotFromContext(context);
    const current = await runtime.readSnapshot(invocation);
    assertReviewSnapshotMatches(frozen, current);
    const taskState = await reviewTaskStateFromContext(context, frozen);
    const reconciled = readPrivateReconcileResult(context);
    assertReconcileStateIntegrity(reconciled, frozen, invocation, taskState);
    const validated = readPrivateValidateResult(context);
    const reconstructed = await resolveValidate40Draft(
      context,
      reconciled,
      validated.correctionState.correctionAttemptsUsed,
      { validationContext: taskState.validationContext, validate: runtime.validateDraft },
    );
    assertValidatedState(validated, frozen, invocation, taskState.validationContextHash, reconstructed.correctionState);
    const deterministicValidation = await runtime.validateDraft({
      requestKey: reconstructed.correctionState.requestKey,
      state: { ...reconstructed.correctionState },
      base: reconstructed.base,
      proposal: reconstructed.draft,
      context: taskState.validationContext,
    });
    assertValidate40DeterministicMatch(validated, deterministicValidation);

    const sealed = await runtime.readSealedCandidate(
      frozen.project, frozen.moduleName, frozen.changeId, frozen.revisionId,
    );
    assertSealedIdentity(sealed, frozen);
    const sealedSources = Object.fromEntries(sealed.sources.map(item => [item.path, item.source]));
    const sources = await materializeFinalize50Sources(
      frozen,
      validated.draft,
      runtime.readBaseSource,
      async (_snapshot, path) => sealedSources[path] ?? '',
    );
    assertReviewSnapshotMatches(frozen, await runtime.readSnapshot(invocation));
    const inputSnapshot = await runtime.buildSnapshot({
      baseId: frozen.baseId,
      requestRevision: frozen.requestRevision,
      request: frozen.request,
      sources: sources.map(item => ({ path: item.path, source: item.inputSource })),
    });
    const outputSnapshot = await runtime.buildSnapshot({
      baseId: frozen.baseId,
      requestRevision: frozen.requestRevision,
      request: frozen.request,
      sources: sources.map(item => ({ path: item.path, source: item.outputSource })),
    });
    const publicationKey = await sha256(JSON.stringify({
      project: frozen.project,
      moduleName: frozen.moduleName,
      changeId: frozen.changeId,
      inputRevisionId: frozen.revisionId,
      inputSnapshotHash: inputSnapshot.hash,
      outputSnapshotHash: outputSnapshot.hash,
      validationContextHash: validated.validationContextHash,
      correctionState: validated.correctionState,
    }));
    const resultId = `result-${publicationKey.slice(0, 32)}`;
    const outputRevisionId = `review-${publicationKey.slice(0, 32)}`;
    const scope = { project: frozen.project, moduleName: frozen.moduleName };
    const replayed = await runtime.replaySubmitted(scope, {
      changeId: frozen.changeId,
      revisionId: outputRevisionId,
      snapshot: outputSnapshot,
    });
    if (replayed) {
      const pointer = exactCommittedPointer(replayed, frozen.changeId, outputRevisionId, outputSnapshot.hash);
      return successfulFinalizeIntents(context, parentStep, step, hookSequential,
        privateFinalizeResult(frozen, outputRevisionId, outputSnapshot, pointer, sources, validated));
    }
    const authoritative = await runtime.readAuthoritative(scope);
    if (!authoritative.pointer || !authoritative.snapshot
      || authoritative.pointer.changeId !== frozen.changeId
      || authoritative.pointer.revisionId !== frozen.revisionId
      || authoritative.snapshot.hash !== inputSnapshot.hash
      || authoritative.pointer.snapshotHash !== inputSnapshot.hash) {
      throw new Error('Authoritative candidate differs from the frozen finalize50 input.');
    }
    const taskId = `task-${publicationKey.slice(0, 32)}`;
    const manifest: CandidateResultManifest = {
      runId: resultId,
      taskId,
      status: 'completed',
      artifacts: outputSnapshot.files.map(file => ({ path: file.path, sha256: file.sha256 }))
        .sort((left, right) => compareCodeUnit(left.path, right.path)),
      traceHash: await sha256(JSON.stringify({
        inputSnapshotHash: inputSnapshot.hash,
        outputSnapshotHash: outputSnapshot.hash,
        validationContextHash: validated.validationContextHash,
        correctionState: validated.correctionState,
      })),
      outputSnapshotHash: outputSnapshot.hash,
    };
    const markedInput = await runtime.buildResult({
      project: frozen.project,
      moduleName: frozen.moduleName,
      expectedRevisionId: authoritative.pointer.revisionId,
      expectedSnapshotHash: authoritative.pointer.snapshotHash,
      expectedRevisionNumber: authoritative.pointer.revisionNumber,
      resultId,
      result: manifest,
      outputSnapshot,
    });
    assertMarkedInput(markedInput, manifest, outputSnapshot);
    const marked = await runtime.markResult(markedInput);
    if (marked.status !== 'marked') throw new Error('finalize50 lost the candidate race; the private draft was preserved.');
    const confirmed = await runtime.readAuthoritative(scope);
    const permit = authoritativePermit(confirmed, markedInput, marked.permit, outputSnapshot);
    const published = await runtime.publishWithPermit(
      scope,
      { changeId: frozen.changeId, revisionId: outputRevisionId, snapshot: outputSnapshot, permit },
    );
    const pointer = exactCommittedPointer(published, frozen.changeId, outputRevisionId, outputSnapshot.hash);
    return successfulFinalizeIntents(context, parentStep, step, hookSequential,
      privateFinalizeResult(frozen, outputRevisionId, outputSnapshot, pointer, sources, validated));
  } catch (error) {
    return [status(context, parentStep, step, hookSequential, 'failed', errorMessage(error))];
  }
}

export function createFinalize50Step(invocationPrompt: string): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 0, interaction: null, nextSteps: [], status: 'waiting_dependency',
    agentName: 'agentReviewSolution', stepTitle: 'Finalize private L4 review', prompt: invocationPrompt, rags: [],
    planning: { planId: 'finalize50', dependsOn: ['validate40-private-result'], executionMode: 'sequential', executionHost: 'client' },
  };
}

export interface MaterializedFinalize50Source {
  path: string;
  inputSource: string;
  outputSource: string;
  changed: boolean;
}

export async function materializeFinalize50Sources(
  snapshot: ReviewEntrySnapshot,
  draft: Record<string, unknown>,
  readBaseSource: (snapshot: ReviewEntrySnapshot, path: string) => Promise<string>,
  readCandidateSource: (snapshot: ReviewEntrySnapshot, path: string) => Promise<string>,
): Promise<MaterializedFinalize50Source[]> {
  const basePaths = Object.keys(snapshot.originalHashes).sort();
  const inputPaths = Object.keys(snapshot.candidateHashes).sort();
  const draftPaths = Object.keys(draft).sort();
  if (!sameStrings(basePaths, inputPaths) || !sameStrings(inputPaths, draftPaths)) {
    throw new Error('finalize50 refuses new, removed or renamed artifact paths.');
  }
  const materialized: MaterializedFinalize50Source[] = [];
  for (const path of inputPaths) {
    const [baseSource, inputSource] = await Promise.all([
      readBaseSource(snapshot, path),
      readCandidateSource(snapshot, path),
    ]);
    if (await prefixedSha256(baseSource) !== snapshot.originalHashes[path]) {
      throw new Error(`finalize50 base bytes are stale: ${path}`);
    }
    if (await prefixedSha256(inputSource) !== snapshot.candidateHashes[path]) {
      throw new Error(`finalize50 candidate bytes are stale: ${path}`);
    }
    const baseEnvelope = splitDefsEnvelope(baseSource);
    const envelope = splitDefsEnvelope(inputSource);
    assertSafeWrapper(path, baseEnvelope, envelope);
    const current = JSON.parse(envelope.objectSource) as unknown;
    if (!isRecord(current) || !isRecord(draft[path])) {
      throw new Error(`finalize50 requires object artifacts: ${path}`);
    }
    const changed = stableStringifyTobe(current) !== stableStringifyTobe(draft[path]);
    const outputSource = changed
      ? `${envelope.prefix}${JSON.stringify(draft[path], null, 2)}${envelope.suffix}`
      : inputSource;
    materialized.push({ path, inputSource, outputSource, changed });
  }
  return materialized;
}

export function splitDefsEnvelope(source: string): { prefix: string; objectSource: string; suffix: string } {
  const bounds = scanNs4ClassicJsonObject(source);
  if (!bounds) throw new Error('finalize50 could not locate the classic defs object.');
  const prefix = source.slice(0, bounds.start);
  const assignments = prefix.match(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/gu) || [];
  if (assignments.length !== 1) throw new Error('finalize50 requires exactly one classic defs object assignment.');
  const objectSource = source.slice(bounds.start, bounds.end);
  let parsed: unknown;
  try { parsed = JSON.parse(objectSource); }
  catch { throw new Error('finalize50 classic defs object is not valid JSON.'); }
  if (!isRecord(parsed)) throw new Error('finalize50 classic defs value must be an object.');
  return { prefix, objectSource, suffix: source.slice(bounds.end) };
}

function assertSealedIdentity(sealed: L4SealedCandidateSnapshot | null, frozen: ReviewEntrySnapshot): asserts sealed is L4SealedCandidateSnapshot {
  if (!sealed || sealed.manifest.project !== frozen.project || sealed.manifest.moduleName !== frozen.moduleName
    || sealed.manifest.baseId !== frozen.baseId || sealed.manifest.changeId !== frozen.changeId
    || sealed.manifest.revisionId !== frozen.revisionId || sealed.manifest.requestRevision !== frozen.requestRevision
    || sealed.request !== frozen.request || !sameJson(sealed.manifest.files, frozen.candidateHashes)
    || !sameStrings(sealed.manifest.changedPaths, frozen.changedPaths)
    || !sameStrings(sealed.sources.map(item => item.path).sort(), Object.keys(frozen.candidateHashes).sort())) {
    throw new Error('Sealed revision namespace differs from the frozen finalize50 input.');
  }
}

function assertSafeWrapper(
  path: string,
  base: { prefix: string; suffix: string },
  candidate: { prefix: string; suffix: string },
): void {
  if (candidate.prefix === base.prefix && candidate.suffix === base.suffix) return;
  const assignment = candidate.prefix.match(/export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*$/u);
  const exportName = assignment?.[1] || '';
  const safePrefix = new RegExp(
    `^/// <mls fileReference="_[0-9]+_/l4/[A-Za-z0-9_/-]+/${escapeRegExp(path)}" enhancement="_blank"/>\\n\\n`
      + `(?:import type \\{ [A-Za-z_$][A-Za-z0-9_$]* \\} from '/_102035_/l2/solution/types\\.js';\\n\\n)?`
      + 'export\\s+const\\s+[A-Za-z_$][A-Za-z0-9_$]*\\s*=\\s*$',
    'u',
  ).test(candidate.prefix);
  const safeSuffix = !!exportName && new RegExp(
    `^ as const(?: satisfies [A-Za-z_$][A-Za-z0-9_$]*)?;\\n\\n(?:export type [A-Za-z_$][A-Za-z0-9_$]* = typeof ${exportName};\\n\\n)?export default ${exportName};\\n$`,
    'u',
  ).test(candidate.suffix);
  if (!safePrefix || !safeSuffix) throw new Error(`finalize50 refuses a divergent or unsafe defs wrapper: ${path}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function readPrivateValidateResult(context: mls.msg.ExecutionContext): Validate40PrivateState {
  const matches = getAllSteps(context.task?.iaCompressed?.nextSteps).filter((item): item is mls.msg.AIResultStep =>
    item.type === 'result' && item.status === 'completed' && item.planning?.planId === 'validate40-private-result');
  if (matches.length !== 1) throw new Error('Expected exactly one completed private validate40 result.');
  const state = parseValidate40PrivateState(matches[0].result);
  if (state.status !== 'ready' || !state.publishable || !state.validation
    || state.affectedAreas.length < 1 || state.unsupportedPaths.length > 0
    || state.affectedAreas.some(area => state.validation!.coverage[area].status !== 'checked')
    || state.validation.issues.some(issue => issue.severity === 'error')) {
    throw new Error('finalize50 requires a fully checked validate40 result.');
  }
  return state;
}

function assertValidatedState(
  state: Validate40PrivateState,
  snapshot: ReviewEntrySnapshot,
  invocation: ReviewInvocation,
  validationContextHash: string,
  correctionState: Validate40PrivateState['correctionState'],
): void {
  if (state.project !== snapshot.project || state.moduleName !== snapshot.moduleName || state.baseId !== snapshot.baseId
    || state.changeId !== snapshot.changeId || state.revisionId !== snapshot.revisionId
    || state.requestRevision !== snapshot.requestRevision || invocation.project !== snapshot.project
    || invocation.moduleName !== snapshot.moduleName || invocation.baseId !== snapshot.baseId
    || invocation.originalL4Path !== snapshot.originalL4Path || invocation.temporaryL4Path !== snapshot.temporaryL4Path
    || invocation.request !== snapshot.request
    || (invocation.expectedRevisionId !== undefined && invocation.expectedRevisionId !== snapshot.revisionId)
    || !sameJson(state.originalHashes, snapshot.originalHashes)
    || !sameJson(state.candidateHashes, snapshot.candidateHashes)
    || state.validationContextHash !== validationContextHash || !sameJson(state.correctionState, correctionState)) {
    throw new Error('validate40 private result differs from the frozen finalize50 input.');
  }
}

function assertMarkedInput(
  input: CandidateMarkResultInput,
  expected: CandidateResultManifest,
  outputSnapshot: CandidateSnapshot,
): void {
  if (input.result.outputSnapshotHash !== outputSnapshot.hash || input.resultHash.length !== 64
    || input.outputSnapshot.hash !== outputSnapshot.hash
    || !sameJson(input.result.artifacts, expected.artifacts)
    || input.result.artifacts.length !== outputSnapshot.files.length
    || input.result.artifacts.some((artifact, index) => artifact.path !== outputSnapshot.files.slice()
      .sort((left, right) => compareCodeUnit(left.path, right.path))[index].path
      || artifact.sha256 !== outputSnapshot.files.slice()
        .sort((left, right) => compareCodeUnit(left.path, right.path))[index].sha256)) {
    throw new Error('candidateMarkResult did not preserve the complete output snapshot manifest.');
  }
}

function authoritativePermit(
  read: CandidateReadResult,
  input: CandidateMarkResultInput,
  markedPermit: CandidatePublishPermit,
  outputSnapshot: CandidateSnapshot,
): CandidatePublishPermit {
  const result = ('result' in read ? read.result : undefined) as unknown as { resultRevisionId: string; resultSnapshotHash: string;
    resultRevisionNumber: number; resultId: string; resultHash: string; manifest: CandidateResultManifest } | undefined;
  if (!read.pointer || !read.snapshot || read.pointer.revisionId !== input.expectedRevisionId
    || read.pointer.snapshotHash !== input.expectedSnapshotHash
    || read.pointer.revisionNumber !== input.expectedRevisionNumber
    || read.snapshot.hash !== input.expectedSnapshotHash
    || !result || result.resultRevisionId !== input.expectedRevisionId
    || result.resultSnapshotHash !== input.expectedSnapshotHash
    || result.resultRevisionNumber !== input.expectedRevisionNumber || result.resultId !== input.resultId
    || result.resultHash !== input.resultHash || result.manifest.outputSnapshotHash !== outputSnapshot.hash
    || !sameJson(result.manifest.artifacts, input.result.artifacts)
    || !sameJson(markedPermit, {
      resultId: result.resultId,
      resultHash: result.resultHash,
      inputRevisionId: result.resultRevisionId,
      inputSnapshotHash: result.resultSnapshotHash,
      inputRevisionNumber: result.resultRevisionNumber,
      outputSnapshotHash: result.manifest.outputSnapshotHash,
    })) {
    throw new Error('candidateMarkResult was not confirmed by an authoritative read.');
  }
  return { ...markedPermit };
}

function exactCommittedPointer(
  result: CandidatePublishResult,
  changeId: string,
  revisionId: string,
  snapshotHash: string,
): CandidatePointer {
  if (result.status !== 'committed' || result.pointer.changeId !== changeId
    || result.pointer.revisionId !== revisionId || result.pointer.snapshotHash !== snapshotHash) {
    throw new Error('finalize50 publish did not commit the exact marked output snapshot.');
  }
  return result.pointer;
}

function privateFinalizeResult(
  frozen: ReviewEntrySnapshot,
  outputRevisionId: string,
  outputSnapshot: CandidateSnapshot,
  pointer: CandidatePointer,
  sources: MaterializedFinalize50Source[],
  validated: Validate40PrivateState,
): Finalize50PrivateResult {
  return {
    schemaVersion: FINALIZE50_PRIVATE_RESULT_VERSION,
    project: frozen.project,
    moduleName: frozen.moduleName,
    changeId: frozen.changeId,
    inputRevisionId: frozen.revisionId,
    outputRevisionId,
    outputSnapshotHash: outputSnapshot.hash,
    correctionState: { ...validated.correctionState },
    pointer: { ...pointer },
    summary: {
      fileCount: outputSnapshot.files.length,
      changedPaths: sources.filter(item => item.changed).map(item => item.path).sort(),
    },
  };
}

function successfulFinalizeIntents(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  privateResult: Finalize50PrivateResult,
): mls.msg.AgentIntent[] {
  return [
    addStep(context, parentStep, {
      type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
      stepTitle: 'Private candidate conditionally published', result: JSON.stringify(privateResult),
      planning: { planId: 'finalize50-private-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep),
    status(context, parentStep, step, hookSequential, 'completed',
      'finalize50 conditionally published the exact deterministic output snapshot.'),
  ];
}

function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step,
  };
}

function status(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  statusValue: mls.msg.AIStepStatus,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId,
    hookSequential, status: statusValue, cleaner: 'input_output', traceMsg,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function prefixedSha256(source: string): Promise<string> {
  return `sha256:${await sha256(source)}`;
}

async function sha256(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
