import { PL_PLANNER_PROJECTS } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { moduleFile, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { mergeChangeEffort, validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import {
  describeEffortFailure,
  describeEffortModulePath,
  effortRegistry,
  resolveDescribeEffort,
  type DescribeEffortFn,
  type EffortRegistry,
} from '/_102035_/l2/solution/effortRegistry.js';
import type {
  ChangeEffortFile,
  ChangeEffortMerged,
  EffortAnswer,
  EffortInput,
  EffortMaster,
  L4DiffItem,
} from '/_102035_/l2/solution/poolPlan.js';

export { effortRegistry, type DescribeEffortFn, type EffortRegistry };

const MASTER_BY_PROJECT: Record<(typeof PL_PLANNER_PROJECTS)[number], Pick<EffortMaster, 'kind' | 'device'>> = {
  '102020': { kind: 'l2', device: 'web' },
  '102021': { kind: 'l1', device: 'web' },
};

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
  let entry = registry[master.project];
  if (!entry && registry === effortRegistry) {
    const describeEffort = await resolveDescribeEffort(master.project);
    if (describeEffort) entry = { describeEffort };
  }
  if (!entry) {
    const path = registry === effortRegistry ? describeEffortModulePath(master.project) : undefined;
    const failure = registry === effortRegistry ? describeEffortFailure(master.project) : undefined;
    if (path && failure) {
      return abend(
        master,
        input.item.changeId,
        `describeEffort unavailable for master ${master.project} at ${path}: ${failure}`,
      );
    }
    const where = path ? ` at ${path}` : '';
    return abend(master, input.item.changeId, `describeEffort not registered for master ${master.project}${where}`);
  }
  try {
    return await entry.describeEffort(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return abend(master, input.item.changeId, `describeEffort failed for master ${master.project}: ${message}`);
  }
}

export type EffortPerItem = { item: L4DiffItem; answers: EffortAnswer[] };

export type MergedEffort = {
  perItem: ChangeEffortFile['perItem'];
  merged: ChangeEffortMerged;
  status: ChangeEffortFile['status'];
};

function opRank(op: L4DiffItem['op']): number {
  if (op === 'added') return 0;
  if (op === 'changed') return 1;
  return 2;
}

/** Criação antes de uso na mesma entidade; a união é a do gate. */
export function mergeEffort(perItem: readonly EffortPerItem[]): MergedEffort {
  const byEntity = new Map<string, EffortPerItem[]>();
  const entityOrder: string[] = [];
  for (const row of perItem) {
    const entity = row.item.entity;
    const group = byEntity.get(entity);
    if (group) group.push(row);
    else {
      byEntity.set(entity, [row]);
      entityOrder.push(entity);
    }
  }
  const ordered: EffortPerItem[] = [];
  for (const entity of entityOrder) {
    const group = byEntity.get(entity)!;
    ordered.push(...[...group].sort((a, b) => opRank(a.item.op) - opRank(b.item.op)));
  }
  const rows = ordered.map(row => ({ item: row.item.changeId, answers: row.answers }));
  const merged = mergeChangeEffort(rows);
  return { perItem: rows, merged, status: merged.abend.length > 0 ? 'blocked' : 'simple' };
}

/** `pool/l4/changeEffort.json` na mesma raiz que o `moduleFile` (candidato, quando há override). */
export function changeEffortFile(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: base.level,
    folder: `${base.folder}/pool/l4`,
    shortName: 'changeEffort',
    extension: '.json',
  };
}

/** Grava `pool/l4/changeEffort.json` na raiz do candidato, só se o gate aceitar. */
export async function writeChangeEffort(moduleName: string, file: ChangeEffortFile): Promise<string> {
  if (file.module !== moduleName) {
    throw new Error(`changeEffort module ${file.module} does not match ${moduleName}`);
  }
  const result = validateChangeEffort(file);
  if (!result.ok) {
    const detail = result.issues.map(issue => `${issue.code}:${issue.path}`).join(', ');
    throw new Error(`changeEffort rejected by gate: ${detail}`);
  }
  return writeJson(changeEffortFile(moduleName), result.file);
}
