/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/enviarParaRevisao.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface EnviarParaRevisaoInput extends Record<string, unknown> {
  id: string;
  version: number;
}

export interface EnviarParaRevisaoOutput extends Record<string, unknown> {
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

export async function enviarParaRevisao(input: EnviarParaRevisaoInput, ctx: RequestContext): Promise<EnviarParaRevisaoOutput> {
  const repository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const id = String(input.id ?? '');
  if (!id) {
    throw new AppError('INVALID_INPUT', 'The task id is required.', 400);
  }
  const version = Number(input.version);
  if (!Number.isFinite(version)) {
    throw new AppError('INVALID_INPUT', 'The task version is required.', 400);
  }

  const found = await repository.list({ id });
  const tarefa: Tarefa | undefined = found.find((t) => t.id === id);
  if (!tarefa) {
    throw new AppError('NOT_FOUND', 'Task not found.', 404);
  }
  if (tarefa.version !== version) {
    throw new AppError('VERSION_CONFLICT', 'The task was changed by someone else; reload it and try again.', 409);
  }

  const personId = ctx.sessionContext.person?.mdmId;
  if (!personId) {
    throw new AppError('UNAUTHORIZED', 'The session has no identified person.', 401);
  }
  if (personId !== tarefa.responsavelId) {
    throw new AppError('FORBIDDEN', 'Only the task assignee can send it for review.', 403, { ruleId: 'apenasResponsavelExecuta' });
  }

  if (tarefa.status !== 'emAndamento') {
    throw new AppError('INVALID_STATE', 'Only a task in progress can be sent for review.', 409);
  }

  const details: Tarefa['details'] = {};
  if (tarefa.details?.descricao !== undefined) details.descricao = tarefa.details.descricao;
  if (tarefa.details?.etiquetas !== undefined) details.etiquetas = tarefa.details.etiquetas;
  if (tarefa.details?.motivoDevolucao !== undefined) details.motivoDevolucao = tarefa.details.motivoDevolucao;
  if (tarefa.details?.devolvidaEm !== undefined) details.devolvidaEm = tarefa.details.devolvidaEm;
  if (tarefa.details?.retomadaEm !== undefined) details.retomadaEm = tarefa.details.retomadaEm;
  if (tarefa.details?.concluidaEm !== undefined) details.concluidaEm = tarefa.details.concluidaEm;
  if (tarefa.details?.canceladaEm !== undefined) details.canceladaEm = tarefa.details.canceladaEm;

  const next: Tarefa = {
    id: tarefa.id,
    version: tarefa.version,
    titulo: tarefa.titulo,
    status: 'emRevisao',
    prioridade: tarefa.prioridade,
    listaId: tarefa.listaId,
    responsavelId: tarefa.responsavelId,
    criadorId: tarefa.criadorId,
    criadaEm: tarefa.criadaEm,
    details,
  };
  if (tarefa.prazo !== undefined) next.prazo = tarefa.prazo;
  if (tarefa.tarefaPaiId !== undefined) next.tarefaPaiId = tarefa.tarefaPaiId;

  const saved = await repository.transition(next, 'enviarParaRevisao');

  const today = ctx.clock.nowIso().slice(0, 10);
  const prazoDay = saved.prazo ? saved.prazo.slice(0, 10) : undefined;

  const outDetails: EnviarParaRevisaoOutput['details'] = {
    quemAgeAgora: saved.criadorId,
    aberta: true,
    venceHoje: prazoDay !== undefined && prazoDay === today,
    atrasada: prazoDay !== undefined && prazoDay < today,
    devolvidaPendente: false,
  };
  if (saved.details?.descricao !== undefined) outDetails.descricao = saved.details.descricao;
  if (saved.details?.etiquetas !== undefined) outDetails.etiquetas = saved.details.etiquetas;
  if (saved.details?.motivoDevolucao !== undefined) outDetails.motivoDevolucao = saved.details.motivoDevolucao;
  if (saved.details?.devolvidaEm !== undefined) outDetails.devolvidaEm = saved.details.devolvidaEm;
  if (saved.details?.retomadaEm !== undefined) outDetails.retomadaEm = saved.details.retomadaEm;
  if (saved.details?.concluidaEm !== undefined) outDetails.concluidaEm = saved.details.concluidaEm;
  if (saved.details?.canceladaEm !== undefined) outDetails.canceladaEm = saved.details.canceladaEm;

  const output: EnviarParaRevisaoOutput = {
    id: saved.id,
    version: saved.version,
    titulo: saved.titulo,
    status: saved.status,
    prioridade: saved.prioridade,
    listaId: saved.listaId,
    responsavelId: saved.responsavelId,
    criadorId: saved.criadorId,
    criadaEm: saved.criadaEm,
    details: outDetails,
  };
  if (saved.prazo !== undefined) output.prazo = saved.prazo;
  if (saved.tarefaPaiId !== undefined) output.tarefaPaiId = saved.tarefaPaiId;
  return output;
}
