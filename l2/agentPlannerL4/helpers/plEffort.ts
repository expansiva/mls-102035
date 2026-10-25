import type { L5Masters } from '/_102029_/l2/runtimeConfigTypes.js';
import { moduleFile, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { changeEffortFileStatus, mergeChangeEffort, validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
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

function masterProjectId(signature: unknown): string | undefined {
  if (!signature || typeof signature !== 'object' || Array.isArray(signature)) return undefined;
  const masterProject = (signature as { masterProject?: unknown }).masterProject;
  if (typeof masterProject === 'number' && Number.isFinite(masterProject)) return String(masterProject);
  if (typeof masterProject === 'string' && masterProject.trim()) return masterProject.trim();
  return undefined;
}

/** Masters declared on the client `l5/project.json`. One side is enough. None abends with the file path. */
export function effortMasters(projectJson: unknown, projectFilePath: string): EffortMaster[] {
  const root = projectJson && typeof projectJson === 'object' && !Array.isArray(projectJson)
    ? projectJson as { masters?: L5Masters }
    : undefined;
  const declared = root?.masters;
  const masters: EffortMaster[] = [];
  const frontend = masterProjectId(declared?.frontend);
  const backend = masterProjectId(declared?.backend);
  if (frontend) masters.push({ project: frontend, kind: 'l2', device: 'web' });
  if (backend) masters.push({ project: backend, kind: 'l1', device: 'web' });
  if (masters.length === 0) {
    throw new Error(`no masters in ${projectFilePath}`);
  }
  return masters;
}

function abend(master: EffortMaster, item: string, reason: string): EffortAnswer {
  return {
    master,
    item,
    status: 'abend',
    create: [],
    regenerateDefs: [],
    materialize: [],
    remove: [],
    runAgents: [],
    contract: 'keep',
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
    const resolved = await resolveDescribeEffort(master.project);
    if (resolved) {
      entry = {
        describeEffort: resolved.describeEffort,
        ...(resolved.effortPrompt ? { effortPrompt: resolved.effortPrompt } : {}),
        ...(resolved.finishEffort ? { finishEffort: resolved.finishEffort } : {}),
      };
    }
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
  return { perItem: rows, merged, status: changeEffortFileStatus(rows) };
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
