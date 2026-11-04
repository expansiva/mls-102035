/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { ItemChecklist } from '/_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.js';
import type { ItemChecklistRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/itemChecklistRepository.js';

export interface ListItemChecklistInput extends Record<string, unknown> {
  id?: string;
  tarefaId?: string;
  ordem?: number;
  details?: {
    descricao?: string;
    concluido?: boolean;
    concluidoEm?: string;
  };
  page: number;
  pageSize: number;
}

export interface ListItemChecklistOutput extends Record<string, unknown> {
  items: ItemChecklist[];
  hasMore: boolean;
}

export async function listItemChecklist(input: ListItemChecklistInput, ctx: RequestContext): Promise<ListItemChecklistOutput> {
  const repository = resolveRepository<ItemChecklistRepository>(ctx, 'ItemChecklistRepository');

  const where: Record<string, unknown> = {};
  if (input.id !== undefined && input.id !== null && String(input.id) !== '') where.id = String(input.id);
  if (input.tarefaId !== undefined && input.tarefaId !== null && String(input.tarefaId) !== '') where.tarefaId = String(input.tarefaId);
  if (input.ordem !== undefined && input.ordem !== null && String(input.ordem) !== '') {
    const ordem = Number(input.ordem);
    if (!Number.isFinite(ordem)) {
      throw new AppError('INVALID_INPUT', 'ordem must be a number.', 400);
    }
    where.ordem = ordem;
  }

  const found = await repository.list(where);

  const concluido = input.details?.concluido;
  const filtered = typeof concluido === 'boolean'
    ? found.filter((item) => item.details.concluido === concluido)
    : found;

  const sorted = [...filtered].sort((a, b) => a.ordem - b.ordem);

  const page = Math.max(1, Math.trunc(Number(input.page)) || 1);
  const size = Math.min(200, Math.max(1, Math.trunc(Number(input.pageSize)) || 20));
  const start = (page - 1) * size;
  const items = sorted.slice(start, start + size);
  return { items, hasMore: start + size < sorted.length };
}
