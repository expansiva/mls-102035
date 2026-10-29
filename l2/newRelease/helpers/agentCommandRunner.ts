/// <mls fileReference="_102035_/l2/newRelease/helpers/agentCommandRunner.ts" enhancement="_blank" />
import { environment } from '/_102036_/l2/environmentContract.js';
import { msgGetTaskUpdate } from '/_102036_/l2/shared/api.js';
import { getThreadByName } from '/_102036_/l2/collabMessagesIndexedDB.js';
import { createThread, getTemporaryContext, ensureUserId } from '/_102025_/l2/collabMessagesHelper.js';
import type { AIPayload, TaskData } from '/_102036_/l2/shared/interfaces.js';
import type { ImplementationRunnerDependencies } from '/_102035_/l2/newRelease/helpers/implementationRunner.js';

/** Canonical result/clarification payloads, including nested agent interactions. */
export function taskResultTexts(task: TaskData): string[] {
  const output: string[] = [];
  function visit(steps: AIPayload[]) {
    for (const step of steps) {
      if (step.type === 'result') output.push(step.result);
      if (step.type === 'clarification') output.push(step.json || step.stepTitle || '');
      visit(step.nextSteps || []);
      visit(step.interaction?.payload || []);
    }
  }
  visit(task.iaCompressed?.nextSteps || []);
  return [...new Set(output)];
}

export interface NewReleaseRequestSummary {
  key: string;
  values: { reason?: string; question?: string; count?: number };
  retry: boolean;
}

/** Decode producer outcomes; indexes, proposals and successful intermediate gates stay out of the main flow. */
export function summarizeNewReleaseRequest(results: readonly string[], status: TaskData['status']): NewReleaseRequestSummary {
  let question = '';
  let refusal = '';
  let written: number | null = null;
  for (const result of results) {
    let value: unknown;
    try { value = JSON.parse(result); }
    catch {
      if (status === 'paused') question = result;
      else if (result.trim()) refusal = result;
      continue;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const outcome = value as { written?: unknown; reason?: unknown; files?: unknown; triage?: { valid?: unknown; clarification?: unknown; reason?: unknown }; question?: unknown };
    if (typeof outcome.question === 'string') question = outcome.question;
    if (outcome.triage?.valid === false) {
      if (typeof outcome.triage.clarification === 'string') question = outcome.triage.clarification;
      if (typeof outcome.triage.reason === 'string') refusal = outcome.triage.reason;
    }
    if (outcome.written === false) refusal = typeof outcome.reason === 'string' ? outcome.reason : '';
    if (outcome.written === true) written = Array.isArray(outcome.files) ? outcome.files.length : 0;
  }
  if (question) return { key: 'request.question', values: { question }, retry: true };
  if (refusal) return { key: 'request.refused', values: { reason: refusal }, retry: true };
  if (status === 'failed') return { key: 'request.failed', values: {}, retry: true };
  if (written !== null) return { key: 'request.success', values: { count: written }, retry: false };
  return { key: 'request.noResult', values: {}, retry: true };
}

export interface NewReleasePromptRequest { moduleName: string; request: string }

export async function runNewReleaseRequest(moduleName: string, request: string,
  progress: (task: TaskData) => void, dependencies: ImplementationRunnerDependencies & { wait?: () => Promise<void> } = {}): Promise<{ task: TaskData; results: string[] }> {
  if (!request.trim()) throw new Error('new-release.request_empty');
  const payload: NewReleasePromptRequest = { moduleName, request };
  return runNewReleaseCommand('agentNewReleasePrompt', JSON.stringify(payload), progress, dependencies);
}

export async function runNewReleaseCommand(agent: 'agentNewReleasePrompt' | 'agentAddLanguage' | 'agentRemoveLanguage', payload: string,
  progress: (task: TaskData) => void, dependencies: ImplementationRunnerDependencies & { wait?: () => Promise<void> } = {}): Promise<{ task: TaskData; results: string[] }> {
  const user = await (dependencies.userId ?? ensureUserId)();
  if (!user) throw new Error('implementation.user_unavailable');
  const threadName = '_102035_/l2/newRelease/requests';
  const resolved = await (dependencies.thread ?? (async () => await getThreadByName(threadName) ?? await createThread(threadName, [], 'company')))();
  if (!resolved?.threadId) throw new Error('implementation.thread_unavailable');
  const prompt = '@@' + agent + ' ' + payload;
  const context = (dependencies.context ?? getTemporaryContext)(resolved.threadId, user, prompt);
  await (dependencies.execute ?? ((agent, ctx) => environment.agents.executeAgent(agent, ctx)))(agent, context);
  if (!context.task?.PK) throw new Error('implementation.task_unavailable');
  let task = context.task;
  const identity = task.PK;
  const id = identity.replace(/^task(?:\/#?|#)/u, '');
  const messageId = task.messageid_created || `${context.message.threadId}/${context.message.orderAt || context.message.createAt}`;
  for (;;) {
    if (task.PK !== identity) throw new Error('implementation.task_mismatch');
    progress(task);
    if (['done', 'failed', 'paused'].includes(task.status)) return { task, results: taskResultTexts(task) };
    await (dependencies.wait ?? (() => new Promise<void>(resolve => setTimeout(resolve, 1500))))();
    task = await (dependencies.task ?? (async (userId, taskId, messageId) => {
      const read = await msgGetTaskUpdate({ userId, taskId, messageId });
      if (!read.success || !read.response?.task) throw new Error(read.error || 'implementation.task_unavailable');
      return read.response.task;
    }))(user, id, messageId);
  }
}
