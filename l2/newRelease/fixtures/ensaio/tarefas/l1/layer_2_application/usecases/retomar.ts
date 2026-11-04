/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/retomar.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface RetomarInput extends Record<string, unknown> {
  id: string;
  version: number;
}

export interface RetomarOutput extends Record<string, unknown> {
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

function isDevolvidaPendente(tarefa: Tarefa): boolean {
  if (tarefa.status !== 'emAndamento') return false;
  const devolvidaEm = tarefa.details.devolvidaEm;
  if (!devolvidaEm) return false;
  const retomadaEm = tarefa.details.retomadaEm;
  if (!retomadaEm) return true;
  return Date.parse(retomadaEm) < Date.parse(devolvidaEm);
}

export async function retomar(input: RetomarInput, ctx: RequestContext): Promise<RetomarOutput> {
  const repository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');
  const id = String(input.id);
  const version = Number(input.version);

  const found = await repository.list({ id });
  const tarefa = found.find((item) => item.id === id);
  if (!tarefa) {
    throw new AppError('NOT_FOUND', 'Tarefa not found: ' + id, 404);
  }
  if (tarefa.version !== version) {
    throw new AppError('CONCURRENCY_CONFLICT', 'Version does not match the stored row', 409);
  }

  const sessionPersonId = ctx.sessionContext.person?.mdmId;
  if (!sessionPersonId || sessionPersonId !== tarefa.responsavelId) {
    throw new AppError('FORBIDDEN', 'Only the assignee can resume the task.', 403, { ruleId: 'apenasResponsavelExecuta' });
  }

  if (tarefa.status !== 'emAndamento') {
    throw new AppError('INVALID_STATE', 'Only a task in progress can be resumed.', 409, { ruleId: 'retomarSoAposDevolucao' });
  }
  if (!isDevolvidaPendente(tarefa)) {
    throw new AppError('INVALID_STATE', 'The task was not returned or was already resumed after the last return.', 409, { ruleId: 'retomarSoAposDevolucao' });
  }

  const next: Tarefa = {
    id: tarefa.id,
    version: tarefa.version,
    titulo: tarefa.titulo,
    status: 'emAndamento',
    prioridade: tarefa.prioridade,
    prazo: tarefa.prazo,
    listaId: tarefa.listaId,
    responsavelId: tarefa.responsavelId,
    criadorId: tarefa.criadorId,
    tarefaPaiId: tarefa.tarefaPaiId,
    criadaEm: tarefa.criadaEm,
    details: {
      descricao: tarefa.details.descricao,
      etiquetas: tarefa.details.etiquetas,
      motivoDevolucao: tarefa.details.motivoDevolucao,
      devolvidaEm: tarefa.details.devolvidaEm,
      retomadaEm: ctx.clock.nowIso(),
      concluidaEm: tarefa.details.concluidaEm,
      canceladaEm: tarefa.details.canceladaEm,
    },
  };

  const saved = await repository.transition(next, 'retomar');

  const today = ctx.clock.nowIso().slice(0, 10);
  const prazoDay = saved.prazo ? saved.prazo.slice(0, 10) : undefined;
  const aberta = saved.status !== 'concluida' && saved.status !== 'cancelada';

  const output: RetomarOutput = {
    id: saved.id,
    version: saved.version,
    titulo: saved.titulo,
    status: saved.status,
    prioridade: saved.prioridade,
    prazo: saved.prazo,
    listaId: saved.listaId,
    responsavelId: saved.responsavelId,
    criadorId: saved.criadorId,
    tarefaPaiId: saved.tarefaPaiId,
    criadaEm: saved.criadaEm,
    details: {
      descricao: saved.details.descricao,
      etiquetas: saved.details.etiquetas,
      motivoDevolucao: saved.details.motivoDevolucao,
      devolvidaEm: saved.details.devolvidaEm,
      retomadaEm: saved.details.retomadaEm,
      concluidaEm: saved.details.concluidaEm,
      canceladaEm: saved.details.canceladaEm,
      quemAgeAgora: saved.responsavelId,
      aberta,
      venceHoje: aberta && prazoDay !== undefined && prazoDay === today,
      atrasada: aberta && prazoDay !== undefined && prazoDay < today,
      devolvidaPendente: isDevolvidaPendente(saved),
    },
  };
  return output;
}
