/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/cancelar.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface CancelarInput extends Record<string, unknown> {
  id: string;
  version: number;
}

export interface CancelarOutput extends Record<string, unknown> {
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

function isGestor(ctx: RequestContext): boolean {
  const session = ctx.sessionContext;
  if (session.actorId === 'gestor') return true;
  const scope = session.actorScope ?? session.actorSession.scope ?? [];
  return scope.some((entry) => entry === 'gestor' || entry.endsWith(':gestor'));
}

export async function cancelar(input: CancelarInput, ctx: RequestContext): Promise<CancelarOutput> {
  const repository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const id = String(input.id ?? '');
  if (id === '') {
    throw new AppError('VALIDATION_ERROR', 'id is required to cancel a task.', 400);
  }

  const found = await repository.list({ id });
  const current: Tarefa | undefined = found.find((item) => item.id === id);
  if (!current) {
    throw new AppError('NOT_FOUND', 'Task not found.', 404);
  }

  if (input.version !== undefined && input.version !== null && Number(input.version) !== current.version) {
    throw new AppError('CONCURRENCY_CONFLICT', 'Version does not match the stored row.', 409);
  }

  // cancelarApenasCriadorOuGestor: only the creator or the manager, and only while a fazer / em andamento / em revisão.
  const personId = ctx.sessionContext.person?.mdmId;
  const isCreator = personId !== undefined && personId === current.criadorId;
  if (!isCreator && !isGestor(ctx)) {
    throw new AppError('FORBIDDEN', 'Only the creator of the task or the manager can cancel it.', 403, {
      ruleId: 'cancelarApenasCriadorOuGestor',
    });
  }
  if (current.status !== 'aFazer' && current.status !== 'emAndamento' && current.status !== 'emRevisao') {
    throw new AppError('CONFLICT', 'A task can only be cancelled while to do, in progress or in review.', 409, {
      ruleId: 'cancelarApenasCriadorOuGestor',
    });
  }

  // Derived fields are never stored: strip them from the details before writing.
  const {
    quemAgeAgora: _quemAgeAgora,
    aberta: _aberta,
    venceHoje: _venceHoje,
    atrasada: _atrasada,
    devolvidaPendente: _devolvidaPendente,
    quantidadeSubtarefas: _quantidadeSubtarefas,
    progressoChecklist: _progressoChecklist,
    ...storedDetails
  } = current.details;
  void _quemAgeAgora;
  void _aberta;
  void _venceHoje;
  void _atrasada;
  void _devolvidaPendente;
  void _quantidadeSubtarefas;
  void _progressoChecklist;

  const next: Tarefa = {
    ...current,
    status: 'cancelada',
    details: {
      ...storedDetails,
      canceladaEm: ctx.clock.nowIso(),
    },
  };

  const saved = await repository.transition(next, 'cancelar');

  const output: CancelarOutput = {
    id: saved.id,
    version: saved.version,
    titulo: saved.titulo,
    status: saved.status,
    prioridade: saved.prioridade,
    listaId: saved.listaId,
    responsavelId: saved.responsavelId,
    criadorId: saved.criadorId,
    criadaEm: saved.criadaEm,
    details: {
      ...saved.details,
      // derived: a cancelled task is not open and nobody acts on it
      aberta: false,
      quemAgeAgora: undefined,
    },
  };
  if (saved.prazo !== undefined) output.prazo = saved.prazo;
  if (saved.tarefaPaiId !== undefined) output.tarefaPaiId = saved.tarefaPaiId;
  return output;
}
