/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunExecution.ts" enhancement="_blank" />

import {
  applyReviewObservation,
  buildReviewAgentInvocation,
  evaluateReviewReadiness,
  recordReviewTransportFailure,
  retryReviewTransport,
  submittingReviewRun,
  type ReviewAgentInvocation,
  type ReviewReadinessProof,
  type ReviewRunRecord,
  type ReviewTerminalObservation,
} from './reviewRun.js';
import type { ReviewRunStore } from './reviewRunStore.js';

export type ReviewChannelMode = 'submit' | 'reattach' | 'retry';
export interface ReviewChannelAttachment {
  mode: ReviewChannelMode;
  taskId: string | null;
  threadId: string | null;
  attempt: number;
}

/** Official execution is an injected boundary. This module deliberately provides no production channel. */
export interface ReviewExecutionChannel {
  stream(invocation: ReviewAgentInvocation, attachment: ReviewChannelAttachment): AsyncIterable<ReviewTerminalObservation>;
}

export interface ExecuteReviewRunInput {
  store: ReviewRunStore;
  channel: ReviewExecutionChannel;
  run: ReviewRunRecord;
  readiness?: ReviewReadinessProof;
  retryFailed?: boolean;
  now?: () => string;
}

export type ExecuteReviewRunResult =
  | { status: 'disabled'; run: ReviewRunRecord; missing: ReturnType<typeof evaluateReviewReadiness>['missing'] }
  | { status: 'finished'; run: ReviewRunRecord };

const TERMINAL = new Set(['ready', 'failed', 'disputed']);
const RESUMABLE_PENDING = new Set([
  'review-run.planner_result_contract_pending',
]);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  }
  return value;
}

function captureInput(input: ExecuteReviewRunInput) {
  const sourceStore = input.store;
  const sourceChannel = input.channel;
  const sourceNow = input.now;
  if (!sourceStore || typeof sourceStore.create !== 'function' || typeof sourceStore.compareAndSwap !== 'function'
    || !sourceChannel || typeof sourceChannel.stream !== 'function'
    || (sourceNow !== undefined && typeof sourceNow !== 'function')) {
    throw new Error('review-run.invalid_execution_input');
  }
  return Object.freeze({
    store: Object.freeze({
      read: sourceStore.read.bind(sourceStore),
      create: sourceStore.create.bind(sourceStore),
      compareAndSwap: sourceStore.compareAndSwap.bind(sourceStore),
    }) satisfies ReviewRunStore,
    stream: sourceChannel.stream.bind(sourceChannel),
    run: deepFreeze(structuredClone(input.run)),
    readiness: deepFreeze(structuredClone(input.readiness ?? {})),
    retryFailed: input.retryFailed === true,
    now: sourceNow ?? (() => new Date().toISOString()),
  });
}

async function commit(store: ReviewRunStore, current: ReviewRunRecord, next: ReviewRunRecord): Promise<ReviewRunRecord> {
  const stored = await store.compareAndSwap(current.storeRevision, next);
  if (!stored.committed) throw new Error('review-run.concurrent_update');
  return stored.current;
}

async function failActive(
  store: ReviewRunStore,
  current: ReviewRunRecord,
  code: string,
  now: string,
): Promise<ReviewRunRecord> {
  const failed = recordReviewTransportFailure(current, code, now);
  return commit(store, current, failed);
}

/** Persists before first send, reattaches active runs, and retries failed runs only when explicit. */
export async function executeReviewRun(input: ExecuteReviewRunInput): Promise<ExecuteReviewRunResult> {
  // Capture every caller-controlled value, including method references, before the first await.
  const fixed = captureInput(input);
  let current = await fixed.store.create(fixed.run);
  const readiness = evaluateReviewReadiness(fixed.readiness);
  if (!readiness.ready) return { status: 'disabled', run: current, missing: readiness.missing };

  let mode: ReviewChannelMode;
  if (current.status === 'planning') {
    const next = submittingReviewRun(current, fixed.now());
    const submitted = await fixed.store.compareAndSwap(current.storeRevision, next);
    if (!submitted.committed) return { status: 'finished', run: submitted.current };
    current = submitted.current;
    mode = 'submit';
  } else if (current.status === 'running'
    && (current.errorCode === null || RESUMABLE_PENDING.has(current.errorCode))) {
    mode = 'reattach';
  } else if (current.status === 'running' && current.errorCode !== null && fixed.retryFailed) {
    current = await commit(fixed.store, current, retryReviewTransport(current, fixed.now()));
    mode = 'retry';
  } else {
    return { status: 'finished', run: current };
  }

  const invocation = buildReviewAgentInvocation(current);
  try {
    for await (const observation of fixed.stream(invocation, {
      mode, taskId: current.taskId, threadId: current.threadId, attempt: current.attemptsUsed,
    })) {
      current = await commit(fixed.store, current, await applyReviewObservation(current, observation, fixed.now()));
      if (TERMINAL.has(current.status)) break;
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'review-run.concurrent_update') throw error;
    current = await failActive(fixed.store, current, 'review-run.channel_failed', fixed.now());
  }
  if (current.status === 'running' && !current.superseded && current.errorCode === null) {
    current = await failActive(fixed.store, current, 'review-run.channel_ended_without_terminal', fixed.now());
  }
  return { status: 'finished', run: current };
}
