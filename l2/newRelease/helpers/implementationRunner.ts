/// <mls fileReference="_102035_/l2/newRelease/helpers/implementationRunner.ts" enhancement="_blank" />
import { taskResultTexts } from '/_102035_/l2/newRelease/helpers/agentCommandRunner.js';

import { environment } from '/_102036_/l2/environmentContract.js';
import { msgGetMessage, msgGetTaskUpdate } from '/_102036_/l2/shared/api.js';
import type { ExecutionContext, Message, TaskData } from '/_102036_/l2/shared/interfaces.js';
import { getThreadByName } from '/_102036_/l2/collabMessagesIndexedDB.js';
import { createThread, getTemporaryContext, ensureUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { implementationCommands, implementationPhaseCommand, withL4ImplementationWriter, readInitialImplementationPlan, INITIAL_PLAN_PATHS, type InitialImplementationPlan, type L4ImplementationRecord, type L4ImplementationPhase } from '/_102035_/l2/solution/candidate/moduleImplementation.js';
import { readActiveL4Change } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { readSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { diffModuleLayers } from '/_102035_/l2/solution/candidate/moduleLayers.js';

export interface ImplementationRunnerDependencies {
  thread?: () => Promise<{ threadId: string }>;
  context?: (threadId: string, userId: string, prompt: string) => ExecutionContext;
  execute?: (agentName: string, context: ExecutionContext) => Promise<void>;
  task?: (userId: string, taskId: string, messageId: string) => Promise<TaskData>;
  message?: (userId: string, threadId: string, messageId: string) => Promise<Message | null>;
  userId?: () => string | null | Promise<string | null>;
  now?: () => string;
}

const THREAD = '_102035_/l2/newRelease/implementations';
const taskId = (value: string) => value.replace(/^task(?:\/#?|#)/u, '');

interface InitialPipeline {
  project?: number; module?: string; moduleName?: string; status: string;
  steps?: { finalize80?: { status: string; snapshotHash?: string } };
  plOrchestration?: Array<{ l1: string; l2: string; effort: string }>;
}
interface InitialDefsReport {
  project: number; module?: string; moduleName?: string; status?: string; outcome?: string; defsStatus?: string;
  snapshotHash?: string; artifactPaths?: string[];
}

function barrier(condition: unknown, path: string, reason: string): asserts condition {
  if (!condition) throw new Error(`implementation.barrier:${path}:${reason}`);
}
function initialFile(project: number, path: string, earliest?: number): Ns5FileInfo {
  const slash = path.lastIndexOf('/');
  const info: Ns5FileInfo = { project, level: Number(path[1]), folder: path.slice(3, slash), shortName: path.slice(slash + 1, -5), extension: '.json' };
  const file = mls.stor.files[mls.stor.getKeyToFile(info)];
  barrier(file && file.status !== 'deleted', path, 'missing');
  if (earliest !== undefined) barrier(Number.isFinite(Date.parse(file.updatedAt ?? '')) && Date.parse(file.updatedAt!) >= earliest, path, 'stale');
  return info;
}
async function initialJson<T>(project: number, path: string, earliest?: number): Promise<T> {
  return JSON.parse(await readSourceText(initialFile(project, path, earliest))) as T;
}
function sameInitialPlan(expected: InitialImplementationPlan, actual: InitialImplementationPlan): boolean {
  const same = (a: Record<string, string>, b: Record<string, string>) => Object.keys(a).length === Object.keys(b).length
    && Object.keys(a).every(path => a[path] === b[path]);
  return expected.project === actual.project && expected.moduleName === actual.moduleName
    && same(expected.hashes, actual.hashes) && same(expected.l4Hashes, actual.l4Hashes) && same(expected.pipelines, actual.pipelines);
}
function planForInitialPhase(record: L4ImplementationRecord): InitialImplementationPlan {
  const planner = record.phases.find(phase => phase.agent === 'agentPlannerL4' && phase.status === 'done');
  const plan = record.initial?.replan ? planner?.plan : record.initial?.plan;
  barrier(plan, 'pool', 'planning_identity_missing');
  return plan;
}

async function initialBarrier(project: number, moduleName: string, record: L4ImplementationRecord, phase: L4ImplementationPhase): Promise<InitialImplementationPlan | undefined> {
  const change = await readActiveL4Change(project, moduleName);
  barrier(change?.changeId === record.changeId && change.activeRevisionId === record.revisionId
    && change.promotedRevisionId === record.revisionId, 'revision', 'identity_changed');
  const since = Date.parse(phase.startedAt);
  const identity = (value: { project?: number; module?: string; moduleName?: string }, path: string) =>
    barrier(value && value.project === project && (value.module ?? value.moduleName) === moduleName, path, 'identity');
  const pipeline = async (level: 1 | 2, agent: string) => {
    const path = `l${level}/${moduleName}/pipeline/${agent}/pipeline.json`;
    const value = await initialJson<InitialPipeline>(project, path, since);
    identity(value, path);
    barrier(value.status === 'complete' && value.steps?.finalize80?.status === 'approved', path, 'incomplete');
    return value;
  };
  if (phase.agent === 'agentPlannerL4') {
    const afterPromotion = Math.max(since, Date.parse(record.initial!.promotedAt) + 1);
    const path = `l4/${moduleName}/pipeline/pipeline.json`;
    const root = await initialJson<InitialPipeline>(project, path, afterPromotion);
    barrier(root.moduleName === moduleName && root.status === 'complete' && Array.isArray(root.plOrchestration)
      && root.plOrchestration.some(row => row.l1 === 'done' && row.l2 === 'done' && row.effort === 'done')
      && root.plOrchestration.every(row => [row.l1, row.l2, row.effort].every(status => status === 'done' || status === 'skipped')), path, 'incomplete');
    for (const path of [...INITIAL_PLAN_PATHS, 'pool/l1/pipeline.json', 'pool/l2/pipeline.json']) initialFile(project, `l4/${moduleName}/${path}`, afterPromotion);
    const plan = await readInitialImplementationPlan(project, moduleName);
    barrier(plan.fresh, path, 'stale_plan');
    return plan;
  }
  const plan = phase.plan;
  barrier(plan && sameInitialPlan(plan, await readInitialImplementationPlan(project, moduleName)), 'pool', 'planning_changed');
  if (phase.agent === 'agentDefsL2') {
    const state = await pipeline(2, 'agentDefsL2');
    const path = `l2/${moduleName}/pipeline/agentDefsL2/finalize80/report.json`;
    const report = await initialJson<InitialDefsReport>(project, path, since);
    identity(report, path);
    barrier(report.status === 'complete', path, 'incomplete');
    const inputPath = `l2/${moduleName}/pipeline/agentDefsL2/input.json`;
    const input = await initialJson<{ project: number; module: string; snapshotHash: string; sources: Array<{ path: string; sha256: string }> }>(project, inputPath);
    identity(input, inputPath);
    barrier(input.snapshotHash && input.snapshotHash === report.snapshotHash && report.snapshotHash === state.steps?.finalize80?.snapshotHash, inputPath, 'snapshot_mismatch');
    barrier(Array.isArray(input.sources) && INITIAL_PLAN_PATHS.every(path => input.sources.some(source => source.path === `l4/${moduleName}/${path}` && source.sha256 === plan.hashes[path])), inputPath, 'planning_mismatch');
    barrier(Array.isArray(report.artifactPaths) && report.artifactPaths.length > 0, path, 'defs_missing');
    for (const artifact of report.artifactPaths) {
      barrier(artifact.startsWith(`l2/${moduleName}/web/`) && artifact.endsWith('.defs.ts'), artifact, 'defs_identity');
      const slash = artifact.lastIndexOf('/');
      const info: Ns5FileInfo = { project, level: 2, folder: artifact.slice(3, slash), shortName: artifact.slice(slash + 1, -8), extension: '.defs.ts' };
      const file = mls.stor.files[mls.stor.getKeyToFile(info)];
      barrier(file && file.status !== 'deleted' && (await readSourceText(info)).trim(), artifact, 'defs_missing');
    }
  } else if (phase.agent === 'agentDefsL1') {
    await pipeline(1, 'agentDefsL1');
    const path = `l1/${moduleName}/pipeline/agentDefsL1/report.json`;
    const report = await initialJson<InitialDefsReport>(project, path, since);
    identity(report, path);
    barrier(report.outcome === 'complete' && report.defsStatus === 'complete', path, 'incomplete');
  } else if (phase.agent === 'agentMaterializeL2') {
    const path = `l2/${moduleName}/pipeline/agentMaterializeL2/finalize70.json`;
    const report = await initialJson<{ project: number; module: string; notApproved: string[] }>(project, path, since);
    identity(report, path);
    barrier(Array.isArray(report.notApproved) && report.notApproved.length === 0, path, 'not_approved');
    barrier(Object.values(mls.stor.files).some(file => file && file.project === project && file.level === 2
      && file.status !== 'deleted' && (file.folder === moduleName || file.folder.startsWith(`${moduleName}/`))
      && !file.folder.startsWith(`${moduleName}/pipeline`) && file.extension === '.ts'
      && !file.shortName.endsWith('.test') && !file.shortName.endsWith('.defs')), `l2/${moduleName}`, 'product_source_missing');
  } else if (phase.agent === 'agentMaterializeL1') {
    const path = `l1/${moduleName}/pipeline/agentMaterializeL1/report.json`;
    const report = await initialJson<InitialDefsReport>(project, path, since);
    identity(report, path);
    barrier(report.status === 'complete', path, 'partial');
  }
  return plan;
}

export function createImplementationRunner(dependencies: ImplementationRunnerDependencies = {}) {
  const userId = dependencies.userId ?? ensureUserId;
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

  async function observed(project: number, moduleName: string, phase: L4ImplementationPhase, value: TaskData, record: L4ImplementationRecord): Promise<L4ImplementationPhase> {
    const id = taskId(value.PK);
    if (!id || (phase.taskId && phase.taskId !== id)) throw new Error('implementation.task_mismatch');
    let status: L4ImplementationPhase['status'] = value.status === 'done' ? 'done' : value.status === 'failed' || value.status === 'paused' ? 'failed' : 'running';
    let changedDefs = phase.changedDefs;
    if (status === 'done' && !record.initial) {
      const change = await readActiveL4Change(project, moduleName);
      if (!change) throw new Error('implementation.not_accepted');
      changedDefs = (await diffModuleLayers(project, moduleName, change.baseId))
        .map(({ path, status, level }) => ({ path, status, level }));
    }
    const result = status === 'done' ? await message((await userId())!, phase.threadId, value.messageid_created || phase.messageId) : null;
    let report = [taskResultTexts(value).join('\n'), result?.taskResults?.join('\n')].filter(Boolean).join('\n');
    const refusal = report.split('\n').find(line => /^(?:refused|failed):/u.test(line.trim()));
    const missingReport = status === 'done' && (phase.agent === 'agentNewReleaseL1' || phase.agent === 'agentNewReleaseL2') && !report;
    if (status === 'done' && (refusal || missingReport)) status = 'failed';
    let plan = phase.plan;
    let barrierError = '';
    if (status === 'done' && record.initial) {
      try { plan = await initialBarrier(project, moduleName, record, phase); }
      catch (error) {
        status = 'failed';
        barrierError = 'review.implementation.error.run';
        report = [report, error instanceof Error ? error.message : String(error)].filter(Boolean).join('\n');
      }
    }
    return { ...phase, ...(plan ? { plan } : {}), ...(changedDefs ? { changedDefs } : {}), taskId: id, messageId: value.messageid_created || phase.messageId, status,
      ...(status === 'running' ? {} : { endedAt: now() }),
      ...(report ? { report } : {}),
      ...(status === 'failed' ? { error: refusal || barrierError || (missingReport ? 'review.implementation.error.missingReport' : value.last_update_log ?? undefined) } : {}),
    };
  }

  async function dispatch(project: number, moduleName: string, name: L4ImplementationPhase['name'], command: { agent: string; command: string },
    attempt: 1 | 2, record: L4ImplementationRecord, save: (phase: L4ImplementationPhase) => Promise<void>,
    previousAttempts?: L4ImplementationPhase['previousAttempts']) {
    const user = await userId();
    if (!user) throw new Error('implementation.user_unavailable');
    const resolved = await thread();
    const ctx = context(resolved.threadId, user, command.command);
    const phase: L4ImplementationPhase = { name, ...command, attempt, ...(previousAttempts ? { previousAttempts } : {}), taskId: '', threadId: resolved.threadId,
      messageId: `${ctx.message.threadId}/${ctx.message.orderAt || ctx.message.createAt}`, status: 'running', startedAt: now() };
    if (record.initial) {
      try {
        const change = await readActiveL4Change(project, moduleName);
        barrier(change?.changeId === record.changeId && change.activeRevisionId === record.revisionId
          && change.promotedRevisionId === record.revisionId, 'revision', 'identity_changed');
        if (command.agent !== 'agentPlannerL4') {
          const plan = planForInitialPhase(record);
          barrier(sameInitialPlan(plan, await readInitialImplementationPlan(project, moduleName)), 'pool', 'planning_changed');
          phase.plan = plan;
        }
      } catch (error) {
        await save({ ...phase, status: 'failed', endedAt: now(), error: 'review.implementation.error.run', report: error instanceof Error ? error.message : String(error) });
        return;
      }
    }
    await save(phase);
    try {
      await execute(command.agent, ctx);
    } catch (error) {
      // The server may already have created a task: keep its identity for observation.
      if (ctx.task?.PK) await save(await observed(project, moduleName, phase, ctx.task, record));
      else await save({ ...phase, status: 'failed', endedAt: now(), error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
    if (ctx.task?.PK) await save(await observed(project, moduleName, phase, ctx.task, record));
  }

  return {
    async runNext(project: number, moduleName: string) {
      return withL4ImplementationWriter(project, moduleName, async (record, save) => {
        record.merged.runAgents.forEach(ref => implementationPhaseCommand(ref, project, moduleName));
        const commands = implementationCommands(record, project, moduleName);
        const index = commands.findIndex((_, index) => !record.phases.some(phase => phase.name === `runAgents:${index}` && phase.status === 'done'));
        if (index < 0) return record;
        const name = `runAgents:${index}`;
        const command = commands[index];
        let phase = record.phases.find(phase => phase.name === name);
        if (phase?.status === 'failed') return record;
        const user = await userId();
        if (!user) throw new Error('implementation.user_unavailable');
        if (phase) {
          if (!phase.taskId) {
            const found = await message(user, phase.threadId, phase.messageId);
            if (!found?.taskId) return record; // A persisted reservation must never dispatch twice.
            phase = { ...phase, taskId: taskId(found.taskId) };
          }
          await save(await observed(project, moduleName, phase, await task(user, phase.taskId, phase.messageId), record));
          return record;
        }
        const structural = commands.length > record.merged.runAgents.length;
        if (!record.initial && structural && (command.agent === 'agentMaterializeL1' || command.agent === 'agentAddLanguage')) {
          const producer = command.agent === 'agentMaterializeL1' ? 'runAgents:3' : 'runAgents:0';
          if (!record.phases.find(item => item.name === producer && item.status === 'done')?.report?.split('\n').includes(command.command)) {
            await save({ name, ...command, attempt: 1, taskId: '', threadId: '', messageId: '',
              status: 'failed', startedAt: now(), endedAt: now(), error: 'review.implementation.error.missingCommand' });
            return record;
          }
        }
        await dispatch(project, moduleName, name, command, 1, record, save);
        return record;
      });
    },
    async retryPhase(project: number, moduleName: string, name: L4ImplementationPhase['name']) {
      return withL4ImplementationWriter(project, moduleName, async (record, save) => {
        record.merged.runAgents.forEach(ref => implementationPhaseCommand(ref, project, moduleName));
        const commands = implementationCommands(record, project, moduleName);
        const index = Number(name.slice('runAgents:'.length));
        const ref = commands[index];
        if (!name.startsWith('runAgents:') || !Number.isSafeInteger(index) || `runAgents:${index}` !== name || !ref) throw new Error('implementation.retry_not_allowed');
        const command = ref;
        const phase = record.phases.find(item => item.name === name);
        if (!phase || phase.status !== 'failed' || phase.attempt !== 1 || phase.error === 'review.implementation.error.missingCommand') throw new Error('implementation.retry_not_allowed');
        const { previousAttempts, ...previous } = phase;
        await dispatch(project, moduleName, name, command, 2, record, save, [...(previousAttempts ?? []), previous]);
        return record;
      });
    },
  };
}
