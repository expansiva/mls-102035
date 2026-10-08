import { PL_PLANNER_PROJECTS } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import type { EffortAnswer, EffortInput, EffortMaster } from '/_102035_/l2/solution/poolPlan.js';

const MASTER_BY_PROJECT: Record<(typeof PL_PLANNER_PROJECTS)[number], Pick<EffortMaster, 'kind' | 'device'>> = {
  '102020': { kind: 'l2', device: 'web' },
  '102021': { kind: 'l1', device: 'web' },
};

/** Uma linha por master, com o import do módulo neutro, quando o How publicar o `describeEffort`. */
export const effortRegistry: EffortRegistry = {};

export type DescribeEffortFn = (input: EffortInput) => EffortAnswer | Promise<EffortAnswer>;

export type EffortRegistry = Record<string, { describeEffort: DescribeEffortFn } | undefined>;

export function effortMasters(project: { workspaceDependencies?: readonly unknown[] }): EffortMaster[] {
  const deps = Array.isArray(project.workspaceDependencies) ? project.workspaceDependencies : [];
  const declared = new Set(deps.map(entry => String(entry)));
  const masters: EffortMaster[] = [];
  for (const id of PL_PLANNER_PROJECTS) {
    if (!declared.has(id)) continue;
    const shape = MASTER_BY_PROJECT[id];
    masters.push({ project: id, kind: shape.kind, device: shape.device });
  }
  return masters;
}

function abend(master: EffortMaster, item: string, reason: string): EffortAnswer {
  return {
    master,
    item,
    status: 'abend',
    regenerateDefs: [],
    materialize: [],
    runAgents: [],
    abend: { reason },
  };
}

/** Sem entrada no registro, ou erro na chamada, devolve abend. Sem `agent`: planners não entram na manutenção. */
export async function describeItemEffort(
  master: EffortMaster,
  input: EffortInput,
  registry: EffortRegistry = effortRegistry,
): Promise<EffortAnswer> {
  const entry = registry[master.project];
  if (!entry) {
    return abend(master, input.item.changeId, `describeEffort not registered for master ${master.project}`);
  }
  try {
    return await entry.describeEffort(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return abend(master, input.item.changeId, `describeEffort failed for master ${master.project}: ${message}`);
  }
}
