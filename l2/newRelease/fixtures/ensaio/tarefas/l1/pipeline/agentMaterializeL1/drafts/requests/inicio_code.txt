/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/inicio.ts" enhancement="_blank"/>

import type {
  InicioContracts,
  AlertaPrazo,
  IndicadoresTarefas,
  ListaTarefasNome,
  ParticipanteNome,
  PendenciaTarefa,
  PermissoesParticipante,
} from '/_102047_/l2/tarefas/web/contracts/inicio.defs.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { listTarefa } from '/_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.js';
import { listListaTarefas } from '/_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.js';
import { listItemChecklist } from '/_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.js';
import { getParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/getParticipante.js';
import { avancarEtapaTarefa } from '/_102047_/l1/tarefas/layer_2_application/workflows/processoTarefa.js';
import type { TransicaoTarefa } from '/_102047_/l1/tarefas/layer_2_application/workflows/processoTarefa.js';

type Status = PendenciaTarefa['status'];
type Prioridade = PendenciaTarefa['prioridade'];

interface TarefaLida {
  id: string;
  version: number;
  titulo: string;
  status: string;
  prioridade: string;
  prazo?: string;
  listaId: string;
  responsavelId: string;
  criadorId: string;
  criadaEm: string;
  details: {
    motivoDevolucao?: string;
    devolvidaEm?: string;
    retomadaEm?: string;
  };
}

interface Leituras {
  listas: Map<string, ListaTarefasNome>;
  participantes: Map<string, ParticipanteNome>;
}

interface Derivados {
  aberta: boolean;
  venceHoje: boolean;
  atrasada: boolean;
  devolvidaPendente: boolean;
  quemAgeAgora: string | null;
}

const PAGE_SIZE = 200;

function pessoaDaSessao(ctx: RequestContext): string {
  const id = ctx.sessionContext.actorId;
  if (id == null || id === '') {
    throw new AppError('UNAUTHENTICATED', 'A pessoa da sessão não foi identificada.', 401);
  }
  return id;
}

function hojeDaOrganizacao(ctx: RequestContext): string {
  const agora = ctx.clock.nowIso();
  const tz = ctx.organization.timezone;
  if (tz == null || tz === '') return agora.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(agora));
}

function asStatus(valor: string): Status {
  switch (valor) {
    case 'aFazer':
    case 'emAndamento':
    case 'emRevisao':
    case 'concluida':
    case 'cancelada':
      return valor;
    default:
      throw new AppError('INVALID_DATA', `Situação de tarefa desconhecida: ${valor}`, 500);
  }
}

function asPrioridade(valor: string): Prioridade {
  switch (valor) {
    case 'baixa':
    case 'media':
    case 'alta':
      return valor;
    default:
      throw new AppError('INVALID_DATA', `Prioridade de tarefa desconhecida: ${valor}`, 500);
  }
}

/** Campos derivados da tarefa, calculados a cada leitura (nunca lidos do armazenamento). */
function derivar(t: TarefaLida, hoje: string): Derivados {
  // tarefaAbertaVencimento: aberta = nem concluída nem cancelada; vence hoje = aberta com prazo de hoje; atrasada = aberta com prazo anterior a hoje.
  const aberta = t.status !== 'concluida' && t.status !== 'cancelada';
  const prazoDia = t.prazo != null && t.prazo !== '' ? t.prazo.slice(0, 10) : null;
  const venceHoje = aberta && prazoDia != null && prazoDia === hoje;
  const atrasada = aberta && prazoDia != null && prazoDia < hoje;
  // retomarSoAposDevolucao: devolvida e ainda não retomada depois da devolução.
  const devolvidaEm = t.details.devolvidaEm;
  const retomadaEm = t.details.retomadaEm;
  const devolvidaPendente =
    t.status === 'emAndamento' &&
    devolvidaEm != null &&
    devolvidaEm !== '' &&
    (retomadaEm == null || retomadaEm === '' || retomadaEm < devolvidaEm);
  // quemAgeAgoraPorSituacao
  let quemAgeAgora: string | null = null;
  if (t.status === 'aFazer' || t.status === 'emAndamento') quemAgeAgora = t.responsavelId;
  else if (t.status === 'emRevisao') quemAgeAgora = t.criadorId;
  return { aberta, venceHoje, atrasada, devolvidaPendente, quemAgeAgora };
}

function compararPrazoECriacao(a: TarefaLida, b: TarefaLida): number {
  const pa = a.prazo != null && a.prazo !== '' ? a.prazo : null;
  const pb = b.prazo != null && b.prazo !== '' ? b.prazo : null;
  if (pa !== pb) {
    if (pa == null) return 1;
    if (pb == null) return -1;
    return pa < pb ? -1 : 1;
  }
  if (a.criadaEm === b.criadaEm) return 0;
  return a.criadaEm < b.criadaEm ? -1 : 1;
}

async function listarTodasPor(campo: 'responsavelId' | 'criadorId', pessoaId: string, ctx: RequestContext): Promise<TarefaLida[]> {
  const todas: TarefaLida[] = [];
  let page = 1;
  for (;;) {
    const r = campo === 'responsavelId'
      ? await listTarefa({ responsavelId: pessoaId, page, pageSize: PAGE_SIZE }, ctx)
      : await listTarefa({ criadorId: pessoaId, page, pageSize: PAGE_SIZE }, ctx);
    for (const item of r.items) todas.push(item);
    if (!r.hasMore) break;
    page += 1;
  }
  return todas;
}

async function lerTarefa(id: string, ctx: RequestContext): Promise<TarefaLida> {
  const r = await listTarefa({ id, page: 1, pageSize: 1 }, ctx);
  const t = r.items[0];
  if (t == null) {
    throw new AppError('NOT_FOUND', 'Tarefa não encontrada.', 404, { id });
  }
  return t;
}

async function progressoChecklist(tarefaId: string, ctx: RequestContext): Promise<string> {
  let total = 0;
  let marcados = 0;
  let page = 1;
  for (;;) {
    const r = await listItemChecklist({ tarefaId, page, pageSize: PAGE_SIZE }, ctx);
    for (const item of r.items) {
      total += 1;
      if (item.details.concluido) marcados += 1;
    }
    if (!r.hasMore) break;
    page += 1;
  }
  return `${marcados} de ${total}`;
}

async function lerLista(id: string, ctx: RequestContext, leituras: Leituras): Promise<ListaTarefasNome> {
  const emCache = leituras.listas.get(id);
  if (emCache != null) return emCache;
  const r = await listListaTarefas({ id, page: 1, pageSize: 1 }, ctx);
  const l = r.items[0];
  if (l == null) {
    throw new AppError('NOT_FOUND', 'Lista de tarefas não encontrada.', 404, { id });
  }
  const valor: ListaTarefasNome = { id: l.id, nome: l.nome };
  leituras.listas.set(id, valor);
  return valor;
}

async function lerParticipanteNome(id: string, ctx: RequestContext, leituras: Leituras): Promise<ParticipanteNome> {
  const emCache = leituras.participantes.get(id);
  if (emCache != null) return emCache;
  const p = await getParticipante({ id }, ctx);
  const valor: ParticipanteNome = {
    id: p.id,
    details: { identification: { name: p.details.identification.name } },
  };
  leituras.participantes.set(id, valor);
  return valor;
}

async function montarPendencia(t: TarefaLida, ctx: RequestContext, leituras: Leituras, hoje: string): Promise<PendenciaTarefa> {
  const d = derivar(t, hoje);
  const listaTarefas = await lerLista(t.listaId, ctx, leituras);
  const responsavel = await lerParticipanteNome(t.responsavelId, ctx, leituras);
  const criador = await lerParticipanteNome(t.criadorId, ctx, leituras);
  const progresso = await progressoChecklist(t.id, ctx);
  const pendencia: PendenciaTarefa = {
    id: t.id,
    version: t.version,
    titulo: t.titulo,
    status: asStatus(t.status),
    prioridade: asPrioridade(t.prioridade),
    listaId: t.listaId,
    responsavelId: t.responsavelId,
    criadorId: t.criadorId,
    criadaEm: t.criadaEm,
    details: {
      devolvidaPendente: d.devolvidaPendente,
      progressoChecklist: progresso,
      venceHoje: d.venceHoje,
      atrasada: d.atrasada,
      ...(d.quemAgeAgora != null ? { quemAgeAgora: d.quemAgeAgora } : {}),
      ...(t.details.motivoDevolucao != null && t.details.motivoDevolucao !== '' ? { motivoDevolucao: t.details.motivoDevolucao } : {}),
    },
    listaTarefas,
    responsavel,
    criador,
    ...(t.prazo != null && t.prazo !== '' ? { prazo: t.prazo } : {}),
  };
  return pendencia;
}

function calcularIndicadores(minhas: TarefaLida[], hoje: string): IndicadoresTarefas {
  let abertas = 0;
  let vencemHoje = 0;
  let atrasadas = 0;
  let devolvidasPendentes = 0;
  for (const t of minhas) {
    const d = derivar(t, hoje);
    if (d.aberta) abertas += 1;
    if (d.venceHoje) vencemHoje += 1;
    if (d.atrasada) atrasadas += 1;
    if (d.devolvidaPendente) devolvidasPendentes += 1;
  }
  return { abertas, vencemHoje, atrasadas, devolvidasPendentes };
}

interface ConfigTransicao {
  transicao: TransicaoTarefa;
  quem: 'responsavel' | 'criador';
  statusExigido: Status;
  exigeDevolvidaPendente: boolean;
  motivoDevolucao?: string;
}

async function transitar(
  ctx: RequestContext,
  input: InicioContracts['tarefas.inicio.iniciarTarefa']['input'],
  cfg: ConfigTransicao,
): Promise<{ tarefa: PendenciaTarefa; indicadores: IndicadoresTarefas }> {
  return ctx.data.moduleData.runInTransaction(async (tx) => {
    const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } };
    const pessoaId = pessoaDaSessao(bound);
    const hoje = hojeDaOrganizacao(bound);
    const atual = await lerTarefa(input.id, bound);

    // apenasResponsavelExecuta / apenasCriadorRevisa
    if (cfg.quem === 'responsavel' && atual.responsavelId !== pessoaId) {
      throw new AppError('FORBIDDEN', `Somente o responsável pode executar esta ação na tarefa "${atual.titulo}".`, 403, {
        ruleId: 'apenasResponsavelExecuta',
        id: atual.id,
      });
    }
    if (cfg.quem === 'criador' && atual.criadorId !== pessoaId) {
      throw new AppError('FORBIDDEN', `Somente quem criou a tarefa "${atual.titulo}" pode revisá-la.`, 403, {
        ruleId: 'apenasCriadorRevisa',
        id: atual.id,
      });
    }
    if (atual.status !== cfg.statusExigido) {
      throw new AppError('INVALID_STATE', `A tarefa "${atual.titulo}" não está na situação exigida para esta ação.`, 409, {
        id: atual.id,
        status: atual.status,
        statusExigido: cfg.statusExigido,
      });
    }
    if (atual.version !== Number(input.version)) {
      throw new AppError('VERSION_CONFLICT', `A tarefa "${atual.titulo}" foi alterada por outra pessoa; recarregue.`, 409, {
        id: atual.id,
        versaoLida: Number(input.version),
        versaoAtual: atual.version,
      });
    }
    if (cfg.exigeDevolvidaPendente && !derivar(atual, hoje).devolvidaPendente) {
      throw new AppError('INVALID_STATE', `A tarefa "${atual.titulo}" não está devolvida aguardando retomada.`, 409, {
        ruleId: 'retomarSoAposDevolucao',
        id: atual.id,
      });
    }

    // O processo da tarefa executa a transição e decide o aviso de quem age agora (avisarQuemAgeAgora, avisoNaoSobrepostoPorPessoa).
    const resultado = cfg.motivoDevolucao != null
      ? await avancarEtapaTarefa({ tarefaId: atual.id, transicao: cfg.transicao, motivoDevolucao: cfg.motivoDevolucao }, bound)
      : await avancarEtapaTarefa({ tarefaId: atual.id, transicao: cfg.transicao }, bound);
    if (resultado.outcome === 'conflict') {
      throw new AppError('CONFLICT', `Não foi possível aplicar a ação na tarefa "${atual.titulo}".`, 409, {
        id: atual.id,
        transicao: cfg.transicao,
      });
    }

    const nova = await lerTarefa(atual.id, bound);
    const leituras: Leituras = { listas: new Map(), participantes: new Map() };
    const tarefa = await montarPendencia(nova, bound, leituras, hoje);
    const minhas = await listarTodasPor('responsavelId', pessoaId, bound);
    // Recalcula os contadores da pessoa.
    const indicadores = calcularIndicadores(minhas, hoje);
    return { tarefa, indicadores };
  });
}

export const requests: { [K in keyof InicioContracts]: (input: InicioContracts[K]['input'], ctx: RequestContext) => Promise<InicioContracts[K]['output']> } = {
  'tarefas.inicio.carregarInicio': async function (input, ctx) {
    const pessoaId = pessoaDaSessao(ctx);
    const hoje = hojeDaOrganizacao(ctx);

    // membroVeResponsavelOuCriador: apenas as tarefas de que é responsável ou que criou.
    const comoResponsavel = await listarTodasPor('responsavelId', pessoaId, ctx);
    const comoCriador = await listarTodasPor('criadorId', pessoaId, ctx);
    const visiveis = new Map<string, TarefaLida>();
    for (const t of comoResponsavel) visiveis.set(t.id, t);
    for (const t of comoCriador) visiveis.set(t.id, t);

    // quemAgeAgoraPorSituacao + retomarSoAposDevolucao (as devolvidas pendentes são emAndamento do responsável).
    const pendentes = Array.from(visiveis.values())
      .filter((t) => derivar(t, hoje).quemAgeAgora === pessoaId)
      .sort(compararPrazoECriacao);

    const leituras: Leituras = { listas: new Map(), participantes: new Map() };
    const pendencias: PendenciaTarefa[] = [];
    for (const t of pendentes) {
      pendencias.push(await montarPendencia(t, ctx, leituras, hoje));
    }

    // tarefaAbertaVencimento / resumoDiarioOitoHoras: abertas do responsável que vencem hoje ou estão atrasadas.
    const paraAlerta = comoResponsavel
      .filter((t) => {
        const d = derivar(t, hoje);
        return d.venceHoje || d.atrasada;
      })
      .sort(compararPrazoECriacao);
    const alertas: AlertaPrazo[] = [];
    for (const t of paraAlerta) {
      if (t.prazo == null || t.prazo === '') continue;
      const d = derivar(t, hoje);
      alertas.push({
        id: t.id,
        titulo: t.titulo,
        prazo: t.prazo,
        status: asStatus(t.status),
        details: {
          aberta: d.aberta,
          venceHoje: d.venceHoje,
          atrasada: d.atrasada,
          progressoChecklist: await progressoChecklist(t.id, ctx),
        },
      });
    }

    const indicadores = calcularIndicadores(comoResponsavel, hoje);

    // participanteNaoConfiguradoAceitaECria: marca do gestor ou sim quando não configurado.
    const participante = await getParticipante({ id: pessoaId }, ctx);
    const marcas = participante.details.tarefas;
    const permissoes: PermissoesParticipante = {
      details: {
        identification: { name: participante.details.identification.name },
        tarefas: {
          aceitaTarefasEfetivo: marcas?.aceitaTarefas ?? true,
          podeCriarTarefasEfetivo: marcas?.podeCriarTarefas ?? true,
        },
      },
    };

    return { pendencias, alertas, indicadores, permissoes };
  },

  'tarefas.inicio.iniciarTarefa': async function (input, ctx) {
    return transitar(ctx, input, {
      transicao: 'iniciar',
      quem: 'responsavel',
      statusExigido: 'aFazer',
      exigeDevolvidaPendente: false,
    });
  },

  'tarefas.inicio.enviarRevisao': async function (input, ctx) {
    return transitar(ctx, input, {
      transicao: 'enviarParaRevisao',
      quem: 'responsavel',
      statusExigido: 'emAndamento',
      exigeDevolvidaPendente: false,
    });
  },

  'tarefas.inicio.aceitarTarefa': async function (input, ctx) {
    return transitar(ctx, input, {
      transicao: 'aceitar',
      quem: 'criador',
      statusExigido: 'emRevisao',
      exigeDevolvidaPendente: false,
    });
  },

  'tarefas.inicio.devolverTarefa': async function (input, ctx) {
    const motivo = input.details.motivoDevolucao;
    // devolucaoExigeMotivo
    if (motivo == null || motivo.trim() === '') {
      throw new AppError('VALIDATION_ERROR', 'Informe o motivo da devolução.', 422, { ruleId: 'devolucaoExigeMotivo' });
    }
    return transitar(ctx, { id: input.id, version: input.version }, {
      transicao: 'devolver',
      quem: 'criador',
      statusExigido: 'emRevisao',
      exigeDevolvidaPendente: false,
      motivoDevolucao: motivo.trim(),
    });
  },

  'tarefas.inicio.retomarTarefa': async function (input, ctx) {
    return transitar(ctx, input, {
      transicao: 'retomar',
      quem: 'responsavel',
      statusExigido: 'emAndamento',
      exigeDevolvidaPendente: true,
    });
  },
};
