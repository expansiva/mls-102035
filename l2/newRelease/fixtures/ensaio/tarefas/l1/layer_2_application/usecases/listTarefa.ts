/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.ts" enhancement="_blank"/>
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';

export interface ListTarefaInput extends Record<string, unknown> {
  id?: string;
  titulo?: string;
  status?: string;
  prioridade?: string;
  prazo?: string;
  listaId?: string;
  responsavelId?: string;
  criadorId?: string;
  tarefaPaiId?: string;
  page: number;
  pageSize: number;
}

export interface ListTarefaOutput extends Record<string, unknown> {
  items: Tarefa[];
  hasMore: boolean;
}

function filled(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export async function listTarefa(input: ListTarefaInput, ctx: RequestContext): Promise<ListTarefaOutput> {
  const repository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const where: Record<string, unknown> = {};
  if (filled(input.id)) where.id = String(input.id);
  if (filled(input.status)) where.status = String(input.status);
  if (filled(input.prioridade)) where.prioridade = String(input.prioridade);
  if (filled(input.prazo)) where.prazo = String(input.prazo);
  if (filled(input.listaId)) where.listaId = String(input.listaId);
  if (filled(input.responsavelId)) where.responsavelId = String(input.responsavelId);
  if (filled(input.criadorId)) where.criadorId = String(input.criadorId);
  if (filled(input.tarefaPaiId)) where.tarefaPaiId = String(input.tarefaPaiId);

  const found = await repository.list(where);

  let kept: Tarefa[] = found;
  if (filled(input.titulo)) {
    const term = normalizeText(String(input.titulo));
    kept = found.filter((tarefa) => normalizeText(String(tarefa.titulo ?? '')).includes(term));
  }

  const page = Math.max(1, Math.trunc(Number(input.page)) || 1);
  const size = Math.min(200, Math.max(1, Math.trunc(Number(input.pageSize)) || 20));
  const start = (page - 1) * size;
  const pageRows = kept.slice(start, start + size);

  const today = ctx.clock.nowIso().slice(0, 10);
  const all = await repository.list({});
  const subtaskCount = new Map<string, number>();
  for (const row of all) {
    if (row.tarefaPaiId) subtaskCount.set(row.tarefaPaiId, (subtaskCount.get(row.tarefaPaiId) ?? 0) + 1);
  }

  const items: Tarefa[] = pageRows.map((tarefa) => {
    const details = tarefa.details ?? {};
    const aberta = tarefa.status !== 'concluida' && tarefa.status !== 'cancelada';
    const prazoDia = tarefa.prazo ? String(tarefa.prazo).slice(0, 10) : undefined;
    const venceHoje = aberta && prazoDia !== undefined && prazoDia === today;
    const atrasada = aberta && prazoDia !== undefined && prazoDia < today;
    const devolvidaPendente =
      tarefa.status === 'emAndamento' &&
      filled(details.devolvidaEm) &&
      (!filled(details.retomadaEm) || String(details.retomadaEm) < String(details.devolvidaEm));
    let quemAgeAgora: string | undefined;
    if (tarefa.status === 'aFazer' || tarefa.status === 'emAndamento') quemAgeAgora = tarefa.responsavelId;
    else if (tarefa.status === 'emRevisao') quemAgeAgora = tarefa.criadorId;
    const nextDetails: Tarefa['details'] = {
      ...details,
      aberta,
      venceHoje,
      atrasada,
      devolvidaPendente,
      quantidadeSubtarefas: subtaskCount.get(tarefa.id) ?? 0,
    };
    if (quemAgeAgora !== undefined) nextDetails.quemAgeAgora = quemAgeAgora;
    else delete nextDetails.quemAgeAgora;
    return { ...tarefa, details: nextDetails };
  });

  return { items, hasMore: start + size < kept.length };
}
