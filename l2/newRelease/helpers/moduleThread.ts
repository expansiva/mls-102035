/// <mls fileReference="_102035_/l2/newRelease/helpers/moduleThread.ts" enhancement="_blank" />
import { createThread } from '/_102025_/l2/collabMessagesHelper.js';
import { messageThreadIdOk } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import { pipelineFileForProject, readPipelineForProject, writeJson } from '/_102035_/l2/solution/fs.js';
import type { Ns5PipelineState } from '/_102035_/l2/solution/types.js';

export interface ModuleThreadRef { threadId: string }

export interface ModuleThreadDependencies {
  read?: (project: number, moduleName: string) => Promise<Ns5PipelineState | null>;
  write?: (project: number, state: Ns5PipelineState) => Promise<void>;
  create?: (moduleName: string) => Promise<{ threadId?: string } | undefined>;
}

/** Server refused the stored thread because this user is not a member. */
export function moduleThreadMemberRefusal(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  if (/not a member|não é membro/i.test(message)) return message;
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  if (status === 403 && /member/i.test(message)) return message;
  return null;
}

/**
 * Thread of one module. A stored `messageThreadId` is used as-is.
 * An old module gets one thread, written back, and reused.
 */
export async function resolveModuleThread(
  project: number,
  moduleName: string,
  dependencies: ModuleThreadDependencies = {},
): Promise<ModuleThreadRef> {
  const read = dependencies.read ?? readPipelineForProject;
  const write = dependencies.write ?? (async (target: number, state: Ns5PipelineState) => {
    await writeJson(pipelineFileForProject(target, state.moduleName), state);
  });
  const create = dependencies.create ?? (async (name: string) => createThread(name, [], 'company'));
  const pipeline = await read(project, moduleName);
  const stored = pipeline?.messageThreadId;
  if (typeof stored === 'string' && stored.length > 0) {
    if (!messageThreadIdOk(stored)) throw new Error(`new-release.thread_invalid:${stored}`);
    return { threadId: stored };
  }
  if (stored !== undefined && stored !== '') throw new Error(`new-release.thread_invalid:${String(stored)}`);
  if (!pipeline) throw new Error('implementation.thread_unavailable');
  let created: { threadId?: string } | undefined;
  try {
    created = await create(moduleName);
  } catch (error) {
    const reason = moduleThreadMemberRefusal(error);
    if (reason) throw new Error(`new-release.thread_forbidden:${reason}`);
    throw error;
  }
  const threadId = created?.threadId;
  if (!threadId || !messageThreadIdOk(threadId)) throw new Error('implementation.thread_unavailable');
  await write(project, { ...pipeline, messageThreadId: threadId });
  return { threadId };
}
