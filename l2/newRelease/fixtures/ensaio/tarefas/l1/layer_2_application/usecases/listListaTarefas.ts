/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.ts" enhancement="_blank"/>
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { ListaTarefas } from '/_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.js';
import type { ListaTarefasRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/listaTarefasRepository.js';

export interface ListListaTarefasInput extends Record<string, unknown> {
  id?: string;
  nome?: string;
  page: number;
  pageSize: number;
}

export interface ListListaTarefasOutput extends Record<string, unknown> {
  items: ListaTarefas[];
  hasMore: boolean;
}

const normalizeText = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export async function listListaTarefas(input: ListListaTarefasInput, ctx: RequestContext): Promise<ListListaTarefasOutput> {
  const repository = resolveRepository<ListaTarefasRepository>(ctx, 'ListaTarefasRepository');

  const where: Record<string, unknown> = {};
  if (input.id !== undefined && input.id !== null && String(input.id) !== '') {
    where.id = String(input.id);
  }

  const found = await repository.list(where);

  // nome is a text search (contains, ignoring case and accents), not an exact filter.
  const term = input.nome !== undefined && input.nome !== null ? normalizeText(String(input.nome).trim()) : '';
  const kept = term === ''
    ? found.slice()
    : found.filter((lista) => normalizeText(String(lista.nome ?? '')).includes(term));

  kept.sort((a, b) => normalizeText(String(a.nome ?? '')).localeCompare(normalizeText(String(b.nome ?? ''))));

  const pageNumber = Math.max(1, Math.trunc(Number(input.page)) || 1);
  const size = Math.min(200, Math.max(1, Math.trunc(Number(input.pageSize)) || 20));
  const start = (pageNumber - 1) * size;
  const items = kept.slice(start, start + size);
  return { items, hasMore: start + size < kept.length };
}
