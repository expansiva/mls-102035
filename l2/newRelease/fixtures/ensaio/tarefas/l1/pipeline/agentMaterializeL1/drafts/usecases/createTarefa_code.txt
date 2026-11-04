/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/createTarefa.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { ListaTarefasRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/listaTarefasRepository.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface CreateTarefaInput extends Record<string, unknown> {
  titulo: string;
  prioridade: string;
  prazo?: string;
  listaId: string;
  responsavelId: string;
  tarefaPaiId?: string;
  details?: {
    descricao?: string;
    etiquetas?: string[];
  };
}

export interface CreateTarefaOutput extends Record<string, unknown> {
  id: string;
  version: number;
  titulo: string;
  status: string;
  prioridade: string;
  prazo?: string;
  listaId: string;
  responsavelId: string;
  criadorId: string;
  tarefaPaiId?: string;
  criadaEm: string;
  details: {
    descricao?: string;
    etiquetas?: string[];
    motivoDevolucao?: string;
    devolvidaEm?: string;
    retomadaEm?: string;
    concluidaEm?: string;
    canceladaEm?: string;
    quemAgeAgora?: string;
    aberta?: boolean;
    venceHoje?: boolean;
    atrasada?: boolean;
    devolvidaPendente?: boolean;
    quantidadeSubtarefas?: number;
    progressoChecklist?: string;
  };
}

const PRIORIDADES: ReadonlyArray<Tarefa['prioridade']> = ['baixa', 'media', 'alta'];

function requiredText(value: unknown, field: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new AppError('VALIDATION_ERROR', `${field} is required.`, 400);
  }
  return text;
}

export async function createTarefa(input: CreateTarefaInput, ctx: RequestContext): Promise<CreateTarefaOutput> {
  const tarefaRepository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');
  const listaRepository = resolveRepository<ListaTarefasRepository>(ctx, 'ListaTarefasRepository');

  const titulo = requiredText(input.titulo, 'titulo');
  if (titulo.length > 200) {
    throw new AppError('VALIDATION_ERROR', 'titulo must have at most 200 characters.', 400);
  }

  const prioridadeRaw = requiredText(input.prioridade, 'prioridade');
  const prioridade = PRIORIDADES.find((p) => p === prioridadeRaw);
  if (!prioridade) {
    throw new AppError('VALIDATION_ERROR', 'prioridade must be baixa, media or alta.', 400);
  }

  const listaId = requiredText(input.listaId, 'listaId');
  const responsavelId = requiredText(input.responsavelId, 'responsavelId');

  const prazo = typeof input.prazo === 'string' && input.prazo.trim() ? input.prazo.trim() : undefined;
  const tarefaPaiId = typeof input.tarefaPaiId === 'string' && input.tarefaPaiId.trim() ? input.tarefaPaiId.trim() : undefined;

  // quem criou é sempre a pessoa da sessão
  const criadorId = ctx.sessionContext.person?.mdmId;
  if (!criadorId) {
    throw new AppError('UNAUTHENTICATED', 'The creator must be the person of the session, and there is none.', 401);
  }

  const descricao = typeof input.details?.descricao === 'string' ? input.details.descricao : undefined;
  const etiquetasRaw: unknown = input.details?.etiquetas;
  let etiquetas: string[] | undefined;
  if (etiquetasRaw !== undefined) {
    if (!Array.isArray(etiquetasRaw)) {
      throw new AppError('VALIDATION_ERROR', 'etiquetas must be a list of texts.', 400);
    }
    etiquetas = etiquetasRaw.map((e) => {
      const tag = typeof e === 'string' ? e.trim() : '';
      if (!tag || tag.length > 40) {
        throw new AppError('VALIDATION_ERROR', 'each etiqueta must have between 1 and 40 characters.', 400);
      }
      return tag;
    });
  }

  const listas = await listaRepository.list({ id: listaId });
  if (!listas.some((l) => l.id === listaId)) {
    throw new AppError('NOT_FOUND', 'The task list was not found.', 404);
  }

  if (tarefaPaiId) {
    const pais = await tarefaRepository.list({ id: tarefaPaiId });
    if (!pais.some((p) => p.id === tarefaPaiId)) {
      throw new AppError('NOT_FOUND', 'The parent task was not found.', 404);
    }
  }

  const storedDetails: Tarefa['details'] = {};
  if (descricao !== undefined) storedDetails.descricao = descricao;
  if (etiquetas !== undefined) storedDetails.etiquetas = etiquetas;

  const novo: Tarefa = {
    id: ctx.idGenerator.newId(),
    version: 1,
    titulo,
    status: 'aFazer',
    prioridade,
    listaId,
    responsavelId,
    criadorId,
    criadaEm: ctx.clock.nowIso(),
    details: storedDetails
  };
  if (prazo !== undefined) novo.prazo = prazo;
  if (tarefaPaiId !== undefined) novo.tarefaPaiId = tarefaPaiId;

  const saved = await tarefaRepository.create(novo);

  // derived values: calculated, never stored
  const hoje = ctx.clock.nowIso().slice(0, 10);
  const aberta = saved.status !== 'concluida' && saved.status !== 'cancelada';
  const quemAgeAgora =
    saved.status === 'aFazer' || saved.status === 'emAndamento'
      ? saved.responsavelId
      : saved.status === 'emRevisao'
        ? saved.criadorId
        : undefined;
  const prazoDia = saved.prazo ? saved.prazo.slice(0, 10) : undefined;

  const details: CreateTarefaOutput['details'] = { ...saved.details };
  if (quemAgeAgora !== undefined) details.quemAgeAgora = quemAgeAgora;
  details.aberta = aberta;
  details.venceHoje = aberta && prazoDia !== undefined && prazoDia === hoje;
  details.atrasada = aberta && prazoDia !== undefined && prazoDia < hoje;
  details.devolvidaPendente = false;

  const output: CreateTarefaOutput = {
    id: saved.id,
    version: saved.version,
    titulo: saved.titulo,
    status: saved.status,
    prioridade: saved.prioridade,
    listaId: saved.listaId,
    responsavelId: saved.responsavelId,
    criadorId: saved.criadorId,
    criadaEm: saved.criadaEm,
    details
  };
  if (saved.prazo !== undefined) output.prazo = saved.prazo;
  if (saved.tarefaPaiId !== undefined) output.tarefaPaiId = saved.tarefaPaiId;
  return output;
}
