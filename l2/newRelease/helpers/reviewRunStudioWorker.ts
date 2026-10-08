/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunStudioWorker.ts" enhancement="_blank" />

import { environment } from '/_102036_/l2/environmentContract.js';
import { getPostError, post, msgGetMessage, msgGetMessagesAfter, msgGetTaskUpdate } from '/_102036_/l2/shared/api.js';
import type { ExecutionContext, Message, TaskData } from '/_102036_/l2/shared/interfaces.js';
import { getAllMessagesByThreadId, getThreadByName } from '/_102036_/l2/collabMessagesIndexedDB.js';
import { createThread, getTemporaryContext, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { buildTaskStatistics } from '/_102025_/l2/collabMessagesTaskInfo.js';
import { readSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { candidateRead, type CandidateGatewayOptions } from '/_102035_/l2/solution/candidate/candidateGateway.js';
import {
  outputRevisionIdForRun,
  type KeyValueStorage,
  type PlatformReviewRun,
  type ReviewRunStartInput,
  type ReviewStudioHost,
  type ReviewWorkerClaim,
  type ReviewWorkerExecution,
  type ReviewWorkerIdentity,
  type ReviewWorkerProgress,
  type ReviewWorkerTransport,
} from './reviewRunWorker.js';
import { postReviewMessage } from './reviewRunMessageTransport.js';

interface ReviewRunResponse { statusCode: number; msg?: string; run?: PlatformReviewRun; work?: ReviewWorkerClaim | null; }
type MsgPost = <T>(args: Record<string, unknown>) => Promise<T>;

function defaultReviewPost<T>(args: Record<string, unknown>): Promise<T> {
  return postReviewMessage<T>(args, {
    origin: window.location.origin,
    hostname: window.location.hostname,
    configuredUrl: environment.config.getApiUrl(),
    configuredCredentials: environment.config.getApiCredentials(),
  }, {
    configuredPost: value => post(value as never),
    fetchImpl: fetch,
    errorFromResponse: (response, value) => getPostError(response, value as never),
  });
}

export function createReviewWorkerTransport(
  postMessage: MsgPost = defaultReviewPost,
): ReviewWorkerTransport<PlatformReviewRun> {
  return {
    async claim(input) {
      const response = await postMessage<ReviewRunResponse>({ action: 'claimReviewRunWork', ...input });
      return response.work ? {
        ...response.work,
        project: input.project,
        moduleName: input.moduleName,
        changeId: input.changeId,
      } : null;
    },
    async report(input) {
      const response = await postMessage<ReviewRunResponse>({ action: 'reportReviewRunWork', ...input });
      if (!response.run) throw new Error(response.msg || 'review-run.invalid_report_response');
      return response.run;
    },
  };
}

export async function startReviewRun(
  input: ReviewRunStartInput,
  postMessage: MsgPost = defaultReviewPost,
): Promise<PlatformReviewRun> {
  const response = await postMessage<ReviewRunResponse>({ action: 'startReviewRun', ...input });
  if (!response.run) throw new Error(response.msg || 'review-run.invalid_start_response');
  return response.run;
}

export async function observeReviewRun(
  input: ReviewWorkerIdentity,
  postMessage: MsgPost = defaultReviewPost,
): Promise<PlatformReviewRun> {
  const response = await postMessage<ReviewRunResponse>({ action: 'observeReviewRun', ...input });
  if (!response.run) throw new Error(response.msg || 'review-run.invalid_observe_response');
  return response.run;
}

interface SavedExecution {
  claimId: string;
  agentName: string;
  threadId: string;
  messageOrder: string;
  messageId: string;
  savedAt?: string;
  execution: ReviewWorkerExecution | null;
}

export interface ReviewStudioHostDependencies {
  storage?: KeyValueStorage;
  userId?: () => string | null;
  thread?: () => Promise<{ threadId: string }>;
  context?: (threadId: string, userId: string, prompt: string) => ExecutionContext;
  execute?: (agentName: string, context: ExecutionContext) => Promise<void>;
  task?: (userId: string, taskId: string, messageId: string) => Promise<TaskData>;
  message?: (userId: string, threadId: string, messageId: string) => Promise<Message | null>;
  messagesAfter?: (userId: string, threadId: string, lastOrderAt: string) => Promise<Message[]>;
  findMessage?: (threadId: string, taskId: string) => Promise<Message | null>;
  artifacts?: (claim: ReviewWorkerClaim, taskId: string) => Promise<ReviewPlannerArtifact[]>;
  candidateTransport?: CandidateGatewayOptions;
  now?: () => string;
  onTaskChange?: (listener: (context: ExecutionContext) => void) => () => void;
}

interface ReviewPlannerArtifact {
  kind: string;
  path: string;
  sha256: string;
  revisionId: string;
  runId: string;
  taskId: string;
}

const EXECUTION_KEY = 'collab-new-release-review-worker-v1/';
const REVIEW_THREAD = '_102035_/l2/newRelease/review-runs';

/** Concrete Studio host. The pending marker is durable before execution and server evidence wins on reattach. */
export function createReviewStudioHost(dependencies: ReviewStudioHostDependencies = {}): ReviewStudioHost {
  const storage = dependencies.storage ?? globalThis.localStorage;
  const currentUserId = dependencies.userId ?? getUserId;
  const resolveThread = dependencies.thread ?? (async () => {
    const existing = await getThreadByName(REVIEW_THREAD);
    const thread = existing ?? await createThread(REVIEW_THREAD, [], 'company');
    if (!thread?.threadId) throw new Error('review-worker.thread_unavailable');
    return { threadId: thread.threadId };
  });
  const createContext = dependencies.context ?? getTemporaryContext;
  const execute = dependencies.execute ?? ((agentName, context) => environment.agents.executeAgent(agentName, context));
  const readTask = dependencies.task ?? (async (userId, taskId, messageId) => {
    const result = await msgGetTaskUpdate({ userId, taskId, messageId });
    if (!result.success || !result.response?.task) throw new Error(result.error || 'review-worker.task_unavailable');
    return result.response.task;
  });
  const readMessage = dependencies.message ?? (async (userId, threadId, messageId) => {
    const result = await msgGetMessage({ userId, threadId, messageId });
    return result.success ? result.response?.message ?? null : null;
  });
  const listMessagesAfter = dependencies.messagesAfter ?? (async (userId, threadId, lastOrderAt) => {
    const result = await msgGetMessagesAfter({ userId, threadId, lastOrderAt });
    if (!result.success) throw new Error(result.error || 'review-worker.messages_unavailable');
    return result.response?.data ?? [];
  });
  const findMessage = dependencies.findMessage ?? (async (threadId, taskId) => {
    const messages = await getAllMessagesByThreadId(threadId);
    return messages.find(message => normalizeTaskId(message.taskId || '') === taskId) ?? null;
  });
  const readArtifacts = dependencies.artifacts ?? readPlannerArtifacts;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const subscribeTaskChange = dependencies.onTaskChange ?? ((listener: (context: ExecutionContext) => void) => {
    const target = typeof window === 'undefined' ? undefined : window.top ?? window;
    if (!target?.addEventListener) return () => undefined;
    const handler = (event: Event) => {
      const changed = (event as CustomEvent<{ context: ExecutionContext }>).detail?.context;
      if (changed) listener(changed);
    };
    target.addEventListener('task-change', handler);
    return () => target.removeEventListener('task-change', handler);
  });

  function key(claim: ReviewWorkerClaim): string { return `${EXECUTION_KEY}${claim.runId}/${claim.attempt}/${claim.phase}`; }
  function read(claim: ReviewWorkerClaim): SavedExecution | null {
    try {
      const raw = storage?.getItem(key(claim));
      return raw ? JSON.parse(raw) as SavedExecution : null;
    } catch { throw new Error('review-worker.execution_store_failed'); }
  }
  function save(claim: ReviewWorkerClaim, value: SavedExecution): void {
    try { storage?.setItem(key(claim), JSON.stringify(value)); }
    catch { throw new Error('review-worker.execution_store_failed'); }
  }

  async function saveServerExecution(claim: ReviewWorkerClaim, execution: ReviewWorkerExecution): Promise<ReviewWorkerExecution> {
    const message = await findMessage(execution.threadId, execution.taskId);
    if (!message) throw new Error('review-worker.execution_message_pending');
    const messageOrder = message.orderAt || message.createAt;
    save(claim, {
      claimId: claim.claimId,
      agentName: execution.agentName,
      threadId: execution.threadId,
      messageOrder,
      messageId: `${execution.threadId}/${messageOrder}`,
      execution,
    });
    return execution;
  }

  return {
    async startOrGet(claim) {
      const saved = read(claim);
      const userId = currentUserId();
      if (!userId) throw new Error('review-worker.user_unavailable');
      if (saved?.execution) return saved.execution;
      if (claim.execution) return saveServerExecution(claim, claim.execution);
      if (saved) {
        const listed = await listMessagesAfter(userId, saved.threadId, messagesAfterCursor(saved));
        const command = claim.command.trim();
        const matches = listed.filter(message =>
          message.senderId === userId && message.content === command && Boolean(message.taskId));
        if (matches.length > 1) {
          throw new Error(`review-worker.execution_start_ambiguous:${matches.map(message => normalizeTaskId(message.taskId || '')).join(',')}`);
        }
        if (matches.length === 1) {
          const message = matches[0];
          const messageOrder = message.orderAt || message.createAt;
          const messageId = `${saved.threadId}/${messageOrder}`;
          const task = await readTask(userId, normalizeTaskId(message.taskId || ''), messageId);
          const execution = executionFromTask(saved.agentName, claim.attempt, task, saved.threadId, now());
          save(claim, { ...saved, claimId: claim.claimId, messageOrder, messageId, execution });
          return execution;
        }
        const age = Date.parse(now()) - markerInstant(saved);
        throw new Error(age >= 120_000 ? 'review-worker.execution_start_lost' : 'review-worker.execution_start_pending');
      }
      const thread = await resolveThread();
      const context = createContext(thread.threadId, userId, claim.command);
      const agentName = claim.phase === 'review' ? 'agentReviewSolution' : 'agentPlannerL4';
      const messageOrder = context.message.orderAt || context.message.createAt;
      const messageId = `${context.message.threadId}/${messageOrder}`;
      const savedAt = now();
      save(claim, { claimId: claim.claimId, agentName, threadId: thread.threadId, messageOrder, messageId, savedAt, execution: null });
      let captured = false;
      const unsubscribe = subscribeTaskChange(changed => {
        if (captured || changed !== context || !context.task?.PK) return;
        captured = true;
        try {
          const canonicalMessageId = context.task.messageid_created || '';
          save(claim, {
            claimId: claim.claimId,
            agentName,
            threadId: thread.threadId,
            messageOrder,
            messageId: canonicalMessageId || messageId,
            savedAt,
            execution: executionFromTask(agentName, claim.attempt, context.task, context.message.threadId, now()),
          });
        } catch (error) {
          console.error(error);
        }
      });
      try {
        await execute(agentName, context);
        if (!context.task?.PK || !context.message?.threadId) throw new Error('review-worker.task_not_created');
        const execution = executionFromTask(agentName, claim.attempt, context.task, context.message.threadId, now());
        const canonicalMessageId = context.task.messageid_created || '';
        save(claim, {
          claimId: claim.claimId,
          agentName,
          threadId: thread.threadId,
          messageOrder,
          messageId: canonicalMessageId || messageId,
          execution,
        });
        return execution;
      } finally {
        unsubscribe();
      }
    },
    async observe(claim, execution) {
      let saved = read(claim);
      if (!saved?.execution && claim.execution) {
        await saveServerExecution(claim, claim.execution);
        saved = read(claim);
      }
      if (!saved?.execution || saved.execution.taskId !== execution.taskId || saved.execution.threadId !== execution.threadId) {
        throw new Error('review-worker.execution_mismatch');
      }
      const userId = currentUserId();
      if (!userId) throw new Error('review-worker.user_unavailable');
      const task = await readTask(userId, execution.taskId, saved.messageId);
      const observed = executionFromTask(execution.agentName, claim.attempt, task, execution.threadId, now());
      const progress = await progressFromTask(claim, task, observed, readArtifacts, dependencies.candidateTransport);
      save(claim, { ...saved, claimId: claim.claimId, execution: progress.executions[0] ?? observed });
      return progress;
    },
  };
}

function normalizeTaskId(value: string): string {
  return value.replace(/^task(?:\/#?|#)/u, '');
}

function orderAtFromMs(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}.0000`;
}

function markerInstant(saved: SavedExecution): number {
  if (saved.savedAt) return Date.parse(saved.savedAt);
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/u.exec(saved.messageOrder);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]));
}

function messagesAfterCursor(saved: SavedExecution): string {
  if (!saved.savedAt) return saved.messageOrder;
  return orderAtFromMs(Date.parse(saved.savedAt) - 120_000);
}

function executionFromTask(
  agentName: string,
  attempt: number,
  task: TaskData,
  threadId: string,
  now: string,
): ReviewWorkerExecution {
  const statistics = buildTaskStatistics(task);
  const observedModel = statistics.models.find(model => model.provider !== '-')
    ?? statistics.models.find(model => model.provider !== '-' || model.model !== '-');
  return {
    agentName,
    taskId: normalizeTaskId(task.PK),
    threadId,
    status: task.status === 'done' ? 'completed' : task.status === 'failed' || task.status === 'paused' ? 'failed' : 'running',
    attempt,
    provider: observedModel?.provider && observedModel.provider !== '-' ? observedModel.provider : null,
    model: observedModel?.model && observedModel.model !== '-' ? observedModel.model : null,
    resultRunId: null,
    candidateRevisionId: null,
    startedAt: task.last_updated ? new Date(task.last_updated).toISOString() : now,
    updatedAt: now,
  };
}

async function progressFromTask(
  claim: ReviewWorkerClaim,
  task: TaskData,
  execution: ReviewWorkerExecution,
  readArtifacts: (claim: ReviewWorkerClaim, taskId: string) => Promise<ReviewPlannerArtifact[]>,
  candidateTransport?: CandidateGatewayOptions,
): Promise<ReviewWorkerProgress> {
  const statistics = buildTaskStatistics(task);
  const fallbackUsed = statistics.fallbackCount > 0 || statistics.models.some(model =>
    model.stage.toLowerCase().includes('fallback'),
  );
  if (task.status === 'failed') {
    return { status: 'failed', executions: [execution], errorCode: task.last_update_log || 'review-worker.agent_failed', fallbackUsed };
  }
  if (task.status === 'paused') {
    const reason = task.last_update_log?.trim();
    return {
      status: 'failed',
      executions: [execution],
      errorCode: reason ? `review-worker.agent_paused:${reason}` : 'review-worker.agent_paused',
      fallbackUsed,
    };
  }
  if (task.status !== 'done') {
    return { status: claim.phase === 'review' ? 'reviewing' : 'planning', executions: [execution], fallbackUsed };
  }
  if (claim.phase === 'review') {
    const authoritative = await candidateRead(
      { project: claim.project, moduleName: claim.moduleName },
      candidateTransport,
    );
    const candidateRef = authoritative?.status === 'read' && authoritative.pointer ? authoritative.result : undefined;
    const candidateResult = candidateRef ? {
      ...candidateRef,
      permit: {
        resultId: candidateRef.resultId,
        resultHash: candidateRef.resultHash,
        inputRevisionId: candidateRef.resultRevisionId,
        inputSnapshotHash: candidateRef.resultSnapshotHash,
        inputRevisionNumber: candidateRef.resultRevisionNumber,
        outputSnapshotHash: candidateRef.manifest.outputSnapshotHash,
      },
    } : undefined;
    const manifest = candidateResult?.manifest as Record<string, unknown> | undefined;
    return candidateResult
      ? { status: 'planning', executions: [{ ...execution, resultRunId: String(manifest?.runId || '') }], candidateResult, fallbackUsed }
      : { status: 'failed', executions: [execution], errorCode: 'review-worker.candidate_result_missing', fallbackUsed };
  }
  const plannerArtifacts = await readArtifacts(claim, execution.taskId);
  const revisionId = plannerArtifacts[0]?.revisionId ?? null;
  const plannerExecution = { ...execution, candidateRevisionId: revisionId };
  return plannerArtifacts.length
    ? { status: 'ready', executions: [plannerExecution], plannerArtifacts, fallbackUsed }
    : { status: 'failed', executions: [plannerExecution], errorCode: 'review-worker.planner_artifacts_missing', fallbackUsed };
}

async function readPlannerArtifacts(claim: ReviewWorkerClaim, taskId: string): Promise<ReviewPlannerArtifact[]> {
  const command = /\s\/candidate\s+(\S+)\s*$/u.exec(claim.command)?.[1] || '';
  const match = /^pipeline\/changes\/([^/]+)\/revisions\/([^/]+)\/l4$/u.exec(command);
  if (!match) return [];
  const [, changeId, revisionId] = match;
  const root = `${claim.command.split(/\s+/u)[1]}/pipeline/changes/${changeId}/revisions/${revisionId}/l4`;
  const specs = [
    ['pipeline', 'pipeline', 'pipeline'],
    ['l4diff-l1', 'pool/l1/web', 'l4diff'],
    ['l4diff-l2', 'pool/l2/web', 'l4diff'],
    ['change-effort', 'pool/l4', 'changeEffort'],
  ] as const;
  const out: ReviewPlannerArtifact[] = [];
  for (const [kind, folder, shortName] of specs) {
    const info: Ns5FileInfo = { project: claim.project, level: 4, folder: `${root}/${folder}`, shortName, extension: '.json' };
    try {
      const source = await readSourceText(info);
      const path = `l4/${root}/${folder}/${shortName}.json`;
      out.push({ kind, path, sha256: await sha256(source), revisionId, runId: claim.runId, taskId });
      if (kind === 'pipeline') {
        const parsed = JSON.parse(source) as { reviewSeal?: unknown; reviewSealHash?: unknown };
        const sealHash = parsed.reviewSeal ? await sha256(JSON.stringify(parsed.reviewSeal)) : '';
        if (!sealHash || parsed.reviewSealHash !== sealHash) return [];
        out.push({ kind: 'pipeline-seal', path: `${path}#reviewSeal`, sha256: sealHash, revisionId, runId: claim.runId, taskId });
      }
    } catch { /* missing artifact stays visible as a failed terminal contract when none exist */ }
  }
  return out.length === specs.length + 1 ? out : [];
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export { driveReviewRunWorker } from './reviewRunWorkerCore.js';
export {
  outputRevisionIdForRun,
  readReviewRunLink,
  reviewRunLinkKey,
  reviewRunStableLinkKey,
  saveReviewRunLink,
} from './reviewRunWorker.js';
