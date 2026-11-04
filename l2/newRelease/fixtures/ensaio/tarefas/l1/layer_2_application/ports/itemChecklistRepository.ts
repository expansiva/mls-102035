/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/ports/itemChecklistRepository.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { createMemoryTableRepository } from '/_102034_/l1/server/layer_1_external/data/moduleDataRuntime.js';
import type { ItemChecklist } from '/_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.js';

export type ItemChecklistFilter = Record<string, unknown>;

export interface ItemChecklistRepository {
  create(itemChecklist: ItemChecklist): Promise<ItemChecklist>;
  list(itemChecklistFilter: ItemChecklistFilter): Promise<ItemChecklist[]>;
  update(itemChecklist: ItemChecklist): Promise<ItemChecklist>;
}

let rows = createMemoryTableRepository<ItemChecklist>([]);
function table() { return rows; }
export function resetMemory(seed: ItemChecklist[] = []): void {
  rows = createMemoryTableRepository(seed.map(row => ({ ...row })));
}
export async function removeMemory(id: string): Promise<boolean> {
  const where = { id } as unknown as Partial<ItemChecklist>;
  if (!await table().findOne({ where })) return false;
  await table().delete({ where });
  return true;
}

export const pendingItemChecklistRepository: ItemChecklistRepository = {
  async create(record: ItemChecklist): Promise<ItemChecklist> { await table().insert({ record }); return record; },
  async list(filter: ItemChecklistFilter): Promise<ItemChecklist[]> { return table().findMany({ where: filter as Partial<ItemChecklist> }); },
  async update(itemChecklist: ItemChecklist): Promise<ItemChecklist> {  const where = { id: itemChecklist.id } as Partial<ItemChecklist>; await table().update({ where, patch: itemChecklist }); const saved = await table().findOne({ where }); if (!saved) throw new AppError('NOT_FOUND', 'Record not found.', 404); return saved; },
};
