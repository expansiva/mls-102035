/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { createMemoryTableRepository } from '/_102034_/l1/server/layer_1_external/data/moduleDataRuntime.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export type TarefaFilter = Record<string, unknown>;

export interface TarefaRepository {
  create(tarefa: Tarefa): Promise<Tarefa>;
  list(tarefaFilter: TarefaFilter): Promise<Tarefa[]>;
  update(tarefa: Tarefa): Promise<Tarefa>;
  transition(tarefa: Tarefa, transitionId: string): Promise<Tarefa>;
}

let rows = createMemoryTableRepository<Tarefa>([]);
function table() { return rows; }
export function resetMemory(seed: Tarefa[] = []): void {
  rows = createMemoryTableRepository(seed.map(row => ({ ...row })));
}
export async function removeMemory(id: string): Promise<boolean> {
  const where = { id } as unknown as Partial<Tarefa>;
  if (!await table().findOne({ where })) return false;
  await table().delete({ where });
  return true;
}

export const pendingTarefaRepository: TarefaRepository = {
  async create(record: Tarefa): Promise<Tarefa> { await table().insert({ record }); return record; },
  async list(filter: TarefaFilter): Promise<Tarefa[]> { return table().findMany({ where: filter as Partial<Tarefa> }); },
  async update(tarefa: Tarefa): Promise<Tarefa> {  const where = { id: tarefa.id } as Partial<Tarefa>; await table().update({ where, patch: tarefa }); const saved = await table().findOne({ where }); if (!saved) throw new AppError('NOT_FOUND', 'Record not found.', 404); return saved; },
  async transition(tarefa: Tarefa, transitionId: string): Promise<Tarefa> { void transitionId; const where = { id: tarefa.id } as Partial<Tarefa>; await table().update({ where, patch: tarefa }); const saved = await table().findOne({ where }); if (!saved) throw new AppError('NOT_FOUND', 'Record not found.', 404); return saved; },
};
