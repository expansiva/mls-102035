/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/aceitar.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface AceitarInput extends Record<string, unknown> {
  id: string;
  version: number;
}

export interface AceitarOutput extends Record<string, unknown> {
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

function toOutput(tarefa: Tarefa): AceitarOutput {
  const src = tarefa.details;
  const details: AceitarOutput['details'] = {
    aberta: tarefa.status !== 'concluida' && tarefa.status !== 'cancelada',
    venceHoje: false,
    atrasada: false,
    devolvidaPendente: false,
  };
  if (src.descricao !== undefined) details.descricao = src.descricao;
  if (src.etiquetas !== undefined) details.etiquetas = src.etiquetas;
  if (src.motivoDevolucao !== undefined) details.motivoDevolucao = src.motivoDevolucao;
  if (src.devolvidaEm !== undefined) details.devolvidaEm = src.devolvidaEm;
  if (src.retomadaEm !== undefined) details.retomadaEm = src.retomadaEm;
  if (src.concluidaEm !== undefined) details.concluidaEm = src.concluidaEm;
  if (src.canceladaEm !== undefined) details.canceladaEm = src.canceladaEm;
  const out: AceitarOutput = {
    id: tarefa.id,
    version: tarefa.version,
    titulo: tarefa.titulo,
    status: tarefa.status,
    prioridade: tarefa.prioridade,
    listaId: tarefa.listaId,
    responsavelId: tarefa.responsavelId,
    criadorId: tarefa.criadorId,
    criadaEm: tarefa.criadaEm,
    details,
  };
  if (tarefa.prazo !== undefined) out.prazo = tarefa.prazo;
  if (tarefa.tarefaPaiId !== undefined) out.tarefaPaiId = tarefa.tarefaPaiId;
  return out;
}

export async function aceitar(input: AceitarInput, ctx: RequestContext): Promise<AceitarOutput> {
  const repository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');
  const id = String(input.id ?? '');
  if (!id) {
    throw new AppError('INVALID_INPUT', 'id is required.', 400);
  }
  const version = Number(input.version);
  if (!Number.isFinite(version)) {
    throw new AppError('INVALID_INPUT', 'version is required.', 400);
  }

  const found = await repository.list({ id });
  const current = found.find((t) => t.id === id);
  if (!current) {
    throw new AppError('NOT_FOUND', 'Tarefa not found.', 404);
  }
  if (current.version !== version) {
    throw new AppError('VERSION_CONFLICT', 'Tarefa version does not match the stored version.', 409);
  }

  const sessionPersonId = ctx.sessionContext.person?.mdmId;
  if (!sessionPersonId || sessionPersonId !== current.criadorId) {
    throw new AppError('FORBIDDEN', 'Only the creator of the tarefa can accept it.', 403, { ruleId: 'apenasCriadorRevisa' });
  }

  if (current.status !== 'emRevisao') {
    throw new AppError('INVALID_STATE', 'Only a tarefa in review can be accepted.', 409);
  }

  const src = current.details;
  const details: Tarefa['details'] = {};
  if (src.descricao !== undefined) details.descricao = src.descricao;
  if (src.etiquetas !== undefined) details.etiquetas = src.etiquetas;
  if (src.motivoDevolucao !== undefined) details.motivoDevolucao = src.motivoDevolucao;
  if (src.devolvidaEm !== undefined) details.devolvidaEm = src.devolvidaEm;
  if (src.retomadaEm !== undefined) details.retomadaEm = src.retomadaEm;
  if (src.canceladaEm !== undefined) details.canceladaEm = src.canceladaEm;
  details.concluidaEm = ctx.clock.nowIso();

  const next: Tarefa = {
    id: current.id,
    version: current.version,
    titulo: current.titulo,
    status: 'concluida',
    prioridade: current.prioridade,
    listaId: current.listaId,
    responsavelId: current.responsavelId,
    criadorId: current.criadorId,
    criadaEm: current.criadaEm,
    details,
  };
  if (current.prazo !== undefined) next.prazo = current.prazo;
  if (current.tarefaPaiId !== undefined) next.tarefaPaiId = current.tarefaPaiId;

  const saved = await repository.transition(next, 'aceitar');
  return toOutput(saved);
}
