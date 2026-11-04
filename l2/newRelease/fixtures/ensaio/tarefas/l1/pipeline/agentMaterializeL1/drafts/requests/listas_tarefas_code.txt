/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/listas_tarefas.ts" enhancement="_blank"/>

import type { Listas_tarefasContracts, ListaTarefas } from '/_102047_/l2/tarefas/web/contracts/listas_tarefas.defs.js';
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { listListaTarefas } from '/_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.js';
import type { ListListaTarefasOutput } from '/_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.js';
import { createListaTarefas } from '/_102047_/l1/tarefas/layer_2_application/usecases/createListaTarefas.js';
import { updateListaTarefas } from '/_102047_/l1/tarefas/layer_2_application/usecases/updateListaTarefas.js';
import { listTarefa } from '/_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.js';

type ListaRecord = ListListaTarefasOutput['items'][number];

const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 10000;

function assertGestor(ctx: RequestContext): void {
  const scope = ctx.sessionContext.actorScope ?? [];
  const isGestor = scope.some((item) => item === 'gestor' || item.endsWith(':gestor'));
  if (!isGestor) {
    throw new AppError('FORBIDDEN', 'Somente o gestor cria e altera listas de tarefas.', 403, {
      ruleId: 'somenteGestorMantemListas',
    });
  }
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function fetchAllListas(ctx: RequestContext): Promise<ListaRecord[]> {
  const all: ListaRecord[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await listListaTarefas({ page, pageSize: MAX_PAGE_SIZE }, ctx);
    for (const item of res.items) all.push(item);
    if (!res.hasMore) break;
  }
  return all;
}

// tarefaAbertaVencimento: aberta = nem concluída nem cancelada; valor derivado, nunca gravado.
async function countTarefasAbertas(listaId: string, ctx: RequestContext): Promise<number> {
  let count = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await listTarefa({ listaId, page, pageSize: MAX_PAGE_SIZE }, ctx);
    for (const t of res.items) {
      if (t.status !== 'concluida' && t.status !== 'cancelada') count++;
    }
    if (!res.hasMore) break;
  }
  return count;
}

function toLista(
  rec: { id: string; version: number; nome: string; details: { descricao?: string | null } },
  quantidadeTarefasAbertas: number,
): ListaTarefas {
  const details: ListaTarefas['details'] = { quantidadeTarefasAbertas };
  if (rec.details != null && rec.details.descricao != null) details.descricao = rec.details.descricao;
  return { id: rec.id, version: rec.version, nome: rec.nome, details };
}

function requireNome(nome: string): string {
  const trimmed = typeof nome === 'string' ? nome.trim() : '';
  if (trimmed === '') {
    throw new AppError('VALIDATION_ERROR', 'O nome da lista é obrigatório.', 400, { ruleId: 'nomeListaUnico' });
  }
  return trimmed;
}

async function assertNomeUnico(nome: string, exceptId: string | undefined, ctx: RequestContext): Promise<void> {
  const all = await fetchAllListas(ctx);
  const dup = all.find((l) => l.id !== exceptId && String(l.nome).trim() === nome);
  if (dup) {
    throw new AppError('CONFLICT', `Já existe uma lista com o nome "${nome}".`, 409, {
      ruleId: 'nomeListaUnico',
      id: dup.id,
    });
  }
}

export const requests: { [K in keyof Listas_tarefasContracts]: (input: Listas_tarefasContracts[K]['input'], ctx: RequestContext) => Promise<Listas_tarefasContracts[K]['output']> } = {
  "tarefas.listas_tarefas.qryListasTarefas": async function (input, ctx) {
    assertGestor(ctx); // somenteGestorMantemListas
    const page = input.page != null && input.page >= 1 ? Math.floor(input.page) : 1;
    const pageSize = input.pageSize != null && input.pageSize >= 1 ? Math.min(MAX_PAGE_SIZE, Math.floor(input.pageSize)) : 20;
    const termo = input.texto != null ? normalizeText(input.texto.trim()) : '';

    const all = await fetchAllListas(ctx);
    const kept = all
      .filter((l) => termo === '' || normalizeText(String(l.nome)).includes(termo))
      .sort((a, b) => normalizeText(String(a.nome)).localeCompare(normalizeText(String(b.nome))));

    const start = (page - 1) * pageSize;
    const slice = kept.slice(start, start + pageSize);
    const hasMore = kept.length > start + pageSize;

    const items: ListaTarefas[] = [];
    for (const rec of slice) {
      const abertas = await countTarefasAbertas(rec.id, ctx);
      items.push(toLista(rec, abertas));
    }
    return { listas: { items, page, pageSize, hasMore } };
  },

  "tarefas.listas_tarefas.cmdCriarLista": async function (input, ctx) {
    return ctx.data.moduleData.runInTransaction(async (tx) => {
      const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } };
      assertGestor(bound); // somenteGestorMantemListas
      const nome = requireNome(input.nome); // nomeListaUnico
      await assertNomeUnico(nome, undefined, bound); // nomeListaUnico
      const details: { descricao?: string } = {};
      if (input.details != null && input.details.descricao != null) details.descricao = input.details.descricao;
      const created = await createListaTarefas({ nome, details }, bound);
      // quantidadeTarefasAbertas: derivada, zero para lista nova (tarefaAbertaVencimento)
      return { lista: toLista(created, 0) };
    });
  },

  "tarefas.listas_tarefas.cmdSalvarLista": async function (input, ctx) {
    return ctx.data.moduleData.runInTransaction(async (tx) => {
      const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } };
      assertGestor(bound); // somenteGestorMantemListas
      const id = String(input.id);
      const current = await listListaTarefas({ id, page: 1, pageSize: 1 }, bound);
      const existing = current.items.find((l) => l.id === id);
      if (!existing) {
        throw new AppError('NOT_FOUND', 'Lista de tarefas não encontrada.', 404, { id });
      }
      if (Number(existing.version) !== Number(input.version)) {
        throw new AppError('VERSION_CONFLICT', `A lista "${existing.nome}" foi alterada por outra pessoa; recarregue e tente de novo.`, 409, {
          id,
          expected: Number(input.version),
          actual: Number(existing.version),
        });
      }
      const nome = requireNome(input.nome); // nomeListaUnico
      await assertNomeUnico(nome, id, bound); // nomeListaUnico
      const details: { descricao?: string } = {};
      if (input.details != null && input.details.descricao != null) details.descricao = input.details.descricao;
      const updated = await updateListaTarefas({ id, version: Number(input.version), nome, details }, bound);
      const abertas = await countTarefasAbertas(updated.id, bound); // tarefaAbertaVencimento
      return { lista: toLista(updated, abertas) };
    });
  },
};
