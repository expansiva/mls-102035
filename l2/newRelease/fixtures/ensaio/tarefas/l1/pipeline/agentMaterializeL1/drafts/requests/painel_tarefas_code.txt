/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/painel_tarefas.ts" enhancement="_blank"/>
import type { Painel_tarefasContracts, ResumoLista, ResumoTarefaLista } from '/_102047_/l2/tarefas/web/contracts/painel_tarefas.defs.js';
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { listListaTarefas } from '/_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.js';
import type { ListListaTarefasOutput } from '/_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.js';
import { listTarefa } from '/_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.js';
import type { ListTarefaOutput } from '/_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.js';
import { listItemChecklist } from '/_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.js';
import type { ListItemChecklistOutput } from '/_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.js';

type ListaTarefasRec = ListListaTarefasOutput['items'][number];
type TarefaRec = ListTarefaOutput['items'][number];
type ItemChecklistRec = ListItemChecklistOutput['items'][number];

const FETCH_PAGE_SIZE = 200;

async function fetchAllListas(ctx: RequestContext): Promise<ListaTarefasRec[]> {
  const all: ListaTarefasRec[] = [];
  let page = 1;
  for (;;) {
    const res = await listListaTarefas({ page, pageSize: FETCH_PAGE_SIZE }, ctx);
    all.push(...res.items);
    if (!res.hasMore) break;
    page += 1;
  }
  return all;
}

async function fetchAllTarefas(ctx: RequestContext): Promise<TarefaRec[]> {
  const all: TarefaRec[] = [];
  let page = 1;
  for (;;) {
    const res = await listTarefa({ page, pageSize: FETCH_PAGE_SIZE }, ctx);
    all.push(...res.items);
    if (!res.hasMore) break;
    page += 1;
  }
  return all;
}

async function fetchAllItens(ctx: RequestContext): Promise<ItemChecklistRec[]> {
  const all: ItemChecklistRec[] = [];
  let page = 1;
  for (;;) {
    const res = await listItemChecklist({ page, pageSize: FETCH_PAGE_SIZE }, ctx);
    all.push(...res.items);
    if (!res.hasMore) break;
    page += 1;
  }
  return all;
}

function todayIso(ctx: RequestContext): string {
  const now = ctx.clock.nowIso();
  const tz = ctx.organization.timezone;
  if (tz) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  }
  return now.slice(0, 10);
}

// tarefaAbertaVencimento: aberta = não concluída nem cancelada
function isAberta(t: TarefaRec): boolean {
  return t.status !== 'concluida' && t.status !== 'cancelada';
}

export const requests: { [K in keyof Painel_tarefasContracts]: (input: Painel_tarefasContracts[K]['input'], ctx: RequestContext) => Promise<Painel_tarefasContracts[K]['output']> } = {
  'tarefas.painel_tarefas.carregarPainelTarefas': async function (input, ctx) {
    // gestorPorAcessoPlataforma: gestor é determinado pelo acesso da plataforma
    const scope = ctx.sessionContext.actorScope ?? [];
    const isGestor = scope.some((s) => s === 'gestor' || s.endsWith(':gestor'));
    if (!isGestor) {
      throw new AppError('FORBIDDEN', 'Somente o gestor acessa o painel de tarefas.', 403, { ruleId: 'gestorPorAcessoPlataforma' });
    }

    // membroVeResponsavelOuCriador: o gestor vê todas as tarefas, sem filtro de membro
    const [listas, tarefas, itens] = await Promise.all([fetchAllListas(ctx), fetchAllTarefas(ctx), fetchAllItens(ctx)]);

    const hoje = todayIso(ctx);

    // tarefaAbertaVencimento: contagens dos indicadores
    let tarefasAbertas = 0;
    let vencemHoje = 0;
    let atrasadas = 0;
    let devolvidasPendentes = 0;
    for (const t of tarefas) {
      if (isAberta(t)) {
        tarefasAbertas += 1;
        if (t.prazo != null && t.prazo !== '') {
          const prazo = t.prazo.slice(0, 10);
          if (prazo === hoje) vencemHoje += 1;
          else if (prazo < hoje) atrasadas += 1;
        }
      }
      if (t.status === 'emAndamento') {
        const devolvidaEm = t.details?.devolvidaEm;
        if (devolvidaEm != null && devolvidaEm !== '') {
          const retomadaEm = t.details?.retomadaEm;
          if (retomadaEm == null || retomadaEm === '' || retomadaEm <= devolvidaEm) devolvidasPendentes += 1;
        }
      }
    }

    // itens da checklist agrupados por tarefa
    const itensPorTarefa = new Map<string, { total: number; concluidos: number }>();
    for (const item of itens) {
      const acc = itensPorTarefa.get(item.tarefaId) ?? { total: 0, concluidos: 0 };
      acc.total += 1;
      if (item.details.concluido === true) acc.concluidos += 1;
      itensPorTarefa.set(item.tarefaId, acc);
    }

    const abertasPorLista = new Map<string, TarefaRec[]>();
    for (const t of tarefas) {
      if (!isAberta(t)) continue;
      const arr = abertasPorLista.get(t.listaId) ?? [];
      arr.push(t);
      abertasPorLista.set(t.listaId, arr);
    }

    const ordenadas = [...listas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

    const resumo: ResumoLista[] = ordenadas.map((lista) => {
      const abertas = abertasPorLista.get(lista.id) ?? [];
      let concluidosLista = 0;
      let totalLista = 0;
      const tarefasLista: ResumoTarefaLista[] = [];
      for (const t of abertas) {
        const cont = itensPorTarefa.get(t.id);
        if (cont == null || cont.total === 0) continue;
        concluidosLista += cont.concluidos;
        totalLista += cont.total;
        tarefasLista.push({
          id: t.id,
          titulo: t.titulo,
          listaId: t.listaId,
          details: { progressoChecklist: `${cont.concluidos} de ${cont.total}` },
        });
      }
      return {
        id: lista.id,
        nome: lista.nome,
        details: { quantidadeTarefasAbertas: abertas.length },
        itensChecklistConcluidos: concluidosLista,
        itensChecklistTotal: totalLista,
        tarefas: tarefasLista,
      };
    });

    return {
      indicadores: { tarefasAbertas, vencemHoje, atrasadas, devolvidasPendentes },
      listas: resumo,
    };
  },
};
