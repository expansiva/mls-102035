/// <mls fileReference="_102035_/l2/newRelease/helpers/implementationRunner.ts" enhancement="_blank" />

import { environment } from '/_102036_/l2/environmentContract.js';
import { msgGetMessage, msgGetTaskUpdate } from '/_102036_/l2/shared/api.js';
import type { ExecutionContext, Message, TaskData } from '/_102036_/l2/shared/interfaces.js';
import { getThreadByName } from '/_102036_/l2/collabMessagesIndexedDB.js';
import { createThread, getTemporaryContext, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { implementationPhaseCommand, withL4ImplementationWriter, type L4ImplementationPhase } from '/_102035_/l2/solution/candidate/moduleImplementation.js';
import { readActiveL4Change } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { diffModuleLayers } from '/_102035_/l2/solution/candidate/moduleLayers.js';

export interface ImplementationRunnerDependencies {
  thread?: () => Promise<{ threadId: string }>;
  context?: (threadId: string, userId: string, prompt: string) => ExecutionContext;
  execute?: (agentName: string, context: ExecutionContext) => Promise<void>;
  task?: (userId: string, taskId: string, messageId: string) => Promise<TaskData>;
  message?: (userId: string, threadId: string, messageId: string) => Promise<Message | null>;
  userId?: () => string | null;
  now?: () => string;
}

const THREAD = '_102035_/l2/newRelease/implementations';
const taskId = (value: string) => value.replace(/^task(?:\/#?|#)/u, '');

export function createImplementationRunner(dependencies: ImplementationRunnerDependencies = {}) {
  const userId = dependencies.userId ?? getUserId;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const context = dependencies.context ?? getTemporaryContext;
  const execute = dependencies.execute ?? ((agent, ctx) => environment.agents.executeAgent(agent, ctx));
  const thread = dependencies.thread ?? (async () => {
    const found = await getThreadByName(THREAD) ?? await createThread(THREAD, [], 'company');
    if (!found?.threadId) throw new Error('implementation.thread_unavailable');
    return found;
  });
  const task = dependencies.task ?? (async (userId, taskId, messageId) => {
    const result = await msgGetTaskUpdate({ userId, taskId, messageId });
    if (!result.success || !result.response?.task) throw new Error(result.error || 'implementation.task_unavailable');
    return result.response.task;
  });
  const message = dependencies.message ?? (async (userId, threadId, messageId) => {
    const result = await msgGetMessage({ userId, threadId, messageId });
    return result.success ? result.response?.message ?? null : null;
  });

  async function observed(project: number, moduleName: string, phase: L4ImplementationPhase, value: TaskData): Promise<L4ImplementationPhase> {
    const id = taskId(value.PK);
    if (!id || (phase.taskId && phase.taskId !== id)) throw new Error('implementation.task_mismatch');
    const status = value.status === 'done' ? 'done' : value.status === 'failed' || value.status === 'paused' ? 'failed' : 'running';
    let changedDefs = phase.changedDefs;
    if (status === 'done') {
      const change = await readActiveL4Change(project, moduleName);
      if (!change) throw new Error('implementation.not_accepted');
      changedDefs = (await diffModuleLayers(project, moduleName, change.baseId))
        .filter(file => file.level === (phase.name === 'defsL2' ? 2 : 1))
        .map(({ path, status }) => ({ path, status }));
    }
    return { ...phase, ...(changedDefs ? { changedDefs } : {}), taskId: id, messageId: value.messageid_created || phase.messageId, status,
      ...(status === 'running' ? {} : { endedAt: now() }),
      ...(status === 'failed' ? { error: value.last_update_log ?? undefined } : {}),
    };
  }

  async function dispatch(project: number, moduleName: string, name: L4ImplementationPhase['name'],
    attempt: 1 | 2, save: (phase: L4ImplementationPhase) => Promise<void>,
    previousAttempts?: L4ImplementationPhase['previousAttempts']) {
    const user = userId();
    if (!user) throw new Error('implementation.user_unavailable');
    const resolved = await thread();
    const command = implementationPhaseCommand(name, moduleName);
    const ctx = context(resolved.threadId, user, command.command);
    const phase: L4ImplementationPhase = { name, ...command, attempt, ...(previousAttempts ? { previousAttempts } : {}), taskId: '', threadId: resolved.threadId,
      messageId: `${ctx.message.threadId}/${ctx.message.orderAt || ctx.message.createAt}`, status: 'running', startedAt: now() };
    await save(phase);
    try {
      await execute(command.agent, ctx);
    } catch (error) {
      // The server may already have created a task: keep its identity for observation.
      if (ctx.task?.PK) await save(await observed(project, moduleName, phase, ctx.task));
      throw error;
    }
    if (ctx.task?.PK) await save(await observed(project, moduleName, phase, ctx.task));
  }

  return {
    async runNext(project: number, moduleName: string) {
      return withL4ImplementationWriter(project, moduleName, async (record, save) => {
        const name = (['defsL2', 'defsL1'] as const).find(name => !record.phases.some(phase => phase.name === name && phase.status === 'done'));
        if (!name) return record;
        let phase = record.phases.find(phase => phase.name === name);
        if (phase?.status === 'failed') return record;
        const user = userId();
        if (!user) throw new Error('implementation.user_unavailable');
        if (phase) {
          if (!phase.taskId) {
            const found = await message(user, phase.threadId, phase.messageId);
            if (!found?.taskId) return record; // A persisted reservation must never dispatch twice.
            phase = { ...phase, taskId: taskId(found.taskId) };
          }
          await save(await observed(project, moduleName, phase, await task(user, phase.taskId, phase.messageId)));
          return record;
        }
        await dispatch(project, moduleName, name, 1, save);
        return record;
      });
    },
    async retryPhase(project: number, moduleName: string, name: L4ImplementationPhase['name']) {
      return withL4ImplementationWriter(project, moduleName, async (record, save) => {
        const phase = record.phases.find(item => item.name === name);
        if (!phase || phase.status !== 'failed' || phase.attempt !== 1) throw new Error('implementation.retry_not_allowed');
        const { previousAttempts, ...previous } = phase;
        await dispatch(project, moduleName, name, 2, save, [...(previousAttempts ?? []), previous]);
        return record;
      });
    },
  };
}
