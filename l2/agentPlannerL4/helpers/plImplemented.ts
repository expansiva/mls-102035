/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plImplemented.ts" enhancement="_blank"/>

import { getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import {
  implementationCommands, readL4Implementation, withL4ImplementationWriter,
  type L4ImplementationPhase, type L4ImplementationRecord,
} from '/_102035_/l2/solution/candidate/moduleImplementation.js';
import { compactModuleApplication, diffModuleLayers } from '/_102035_/l2/solution/candidate/moduleLayers.js';
import { readActiveL4Change } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { retirePoolMenu } from '/_102035_/l2/solution/candidate/poolMenuRetire.js';
import { completeL4Implementation } from '/_102035_/l2/solution/candidate/tobeCompletion.js';
import { existingModuleName } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';

export interface PlImplementedDependencies {
  /** The sender of the message that brought the command, or the owner of its task: who ran the command. */
  ownerId?: string;
  /** The user id this session keeps locally. Read only when the command carries no owner. No network lookup. */
  localUserId?: () => string | null;
  project?: number;
  now?: () => string;
  read?: typeof readL4Implementation;
  write?: typeof withL4ImplementationWriter;
  active?: typeof readActiveL4Change;
  diff?: typeof diffModuleLayers;
  retireMenu?: typeof retirePoolMenu;
  compact?: typeof compactModuleApplication;
  complete?: typeof completeL4Implementation;
}

function localUser(): string | null {
  try { return getUserId(); }
  catch (error) {
    console.error('[agentPlannerL4] no local user id', error);
    return null;
  }
}

function pendingIndexes(record: L4ImplementationRecord, commandCount: number): number[] {
  return Array.from({ length: commandCount }, (_, index) => index)
    .filter(index => !record.phases.some(phase => phase.name === `runAgents:${index}` && phase.status === 'done'));
}

/**
 * `/implemented`: what the New Release screen does when the agents of an applied change have finished, with no screen.
 * Without `/confirm` it only lists the commands still pending. With `/confirm` it records each pending command as a phase
 * done by the operator (a declaration: no task is observed), retires the pool menu, compacts the application and completes
 * the change, in the order the screen does. It runs no agent: the operator runs the commands first.
 */
export async function plImplementedText(moduleToken: string, confirm: boolean, dependencies: PlImplementedDependencies = {}): Promise<string> {
  const moduleName = existingModuleName(moduleToken);
  if (!moduleName) return `refused: module "${moduleToken}" does not exist in l4/.`;
  const project = dependencies.project ?? Number(mls.actualProject || 0);
  const now = dependencies.now ?? (() => new Date().toISOString());
  try {
    const record = await (dependencies.read ?? readL4Implementation)(project, moduleName);
    if (!record) return 'refused: l4.implemented_no_applied_change';
    const commands = implementationCommands(record, project, moduleName);
    if (!commands.length) return 'refused: l4.implemented_nothing_pending';
    const unresolved = record.phases.find(phase => phase.status === 'failed' || phase.status === 'running');
    if (unresolved) return `refused: l4.implemented_phase_unresolved: ${unresolved.name} is ${unresolved.status}`;
    const pending = pendingIndexes(record, commands.length);
    if (!confirm) {
      return `pending: ${JSON.stringify({ moduleName, changeId: record.changeId, commands: pending.map(index => ({ index, agent: commands[index].agent, command: commands[index].command })) })}\n`
        + `Run them, then: @@agentPlannerL4 ${moduleName} /implemented /confirm`;
    }
    const by = (dependencies.ownerId || '').trim() || ((dependencies.localUserId ?? localUser)() || '').trim();
    if (!by) return 'refused: it was not possible to know who confirms: the command carries no owner and there is no local user id.';
    const change = await (dependencies.active ?? readActiveL4Change)(project, moduleName);
    if (!change || change.changeId !== record.changeId) return 'refused: l4.implemented_no_applied_change';
    const changedDefs = record.initial ? undefined
      : (await (dependencies.diff ?? diffModuleLayers)(project, moduleName, change.baseId)).map(({ path, status, level }) => ({ path, status, level }));
    await (dependencies.write ?? withL4ImplementationWriter)(project, moduleName, async (current, save) => {
      for (const index of pending) {
        const time = now();
        const phase: L4ImplementationPhase = {
          name: `runAgents:${index}`, agent: commands[index].agent, command: commands[index].command, attempt: 1,
          taskId: '', threadId: '', messageId: '', status: 'done', startedAt: time, endedAt: time,
          report: `recorded by command (${by}): the operator declared this command run`,
          ...(changedDefs ? { changedDefs } : {}),
        };
        await save(phase);
      }
      await (dependencies.retireMenu ?? retirePoolMenu)(project, moduleName, current, commands, save);
    });
    await (dependencies.compact ?? compactModuleApplication)(project, moduleName, record.changeId, record.revisionId);
    await (dependencies.complete ?? completeL4Implementation)(project, moduleName, record.changeId, record.revisionId, by);
    return `implemented: ${JSON.stringify({ moduleName, changeId: record.changeId, revisionId: record.revisionId, confirmedBy: by, recorded: pending, completed: true })}`;
  } catch (error) {
    console.error('[agentPlannerL4] implemented refused', error);
    return `refused: ${error instanceof Error ? error.message : String(error)}`;
  }
}
