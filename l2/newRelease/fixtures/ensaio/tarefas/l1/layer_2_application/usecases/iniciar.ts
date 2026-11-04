/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/iniciar.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface IniciarInput extends Record<string, unknown> {
  id: string;
  version: number;
}

export interface IniciarOutput extends Record<string, unknown> {
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

export async function iniciar(input: IniciarInput, ctx: RequestContext): Promise<IniciarOutput> {
  const tarefaRepository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const id = String(input.id ?? '');
  if (!id) {
    throw new AppError('VALIDATION_ERROR', 'id is required.', 400);
  }
  const version = Number(input.version);
  if (!Number.isFinite(version)) {
    throw new AppError('VALIDATION_ERROR', 'version is required.', 400);
  }

  const found = await tarefaRepository.list({ id });
  const tarefa = found.find((t) => t.id === id);
  if (!tarefa) {
    throw new AppError('NOT_FOUND', 'Tarefa not found.', 404);
  }
  if (tarefa.version !== version) {
    throw new AppError('CONCURRENCY_CONFLICT', 'Version does not match the stored row.', 409);
  }

  // apenasResponsavelExecuta: only the responsável of the task can start it.
  const sessionPersonId = ctx.sessionContext.person?.mdmId;
  if (!sessionPersonId) {
    throw new AppError('FORBIDDEN', 'The session has no identified person.', 403, { ruleId: 'apenasResponsavelExecuta' });
  }
  if (sessionPersonId !== tarefa.responsavelId) {
    throw new AppError('FORBIDDEN', 'Only the responsible participant can start the task.', 403, { ruleId: 'apenasResponsavelExecuta' });
  }

  if (tarefa.status !== 'aFazer') {
    throw new AppError('INVALID_STATE', 'Only a task in "aFazer" can be started.', 409);
  }

  // Derived fields are never stored.
  const {
    quemAgeAgora: _quemAgeAgora,
    aberta: _aberta,
    venceHoje: _venceHoje,
    atrasada: _atrasada,
    devolvidaPendente: _devolvidaPendente,
    quantidadeSubtarefas: _quantidadeSubtarefas,
    progressoChecklist: _progressoChecklist,
    ...storedDetails
  } = tarefa.details;
  void _quemAgeAgora;
  void _aberta;
  void _venceHoje;
  void _atrasada;
  void _devolvidaPendente;
  void _quantidadeSubtarefas;
  void _progressoChecklist;

  const next: Tarefa = {
    ...tarefa,
    status: 'emAndamento',
    details: { ...storedDetails },
  };

  const saved = await tarefaRepository.transition(next, 'iniciar');

  const out: IniciarOutput = {
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
      quemAgeAgora: saved.responsavelId,
      aberta: true,
    },
  };
  if (saved.prazo !== undefined) out.prazo = saved.prazo;
  if (saved.tarefaPaiId !== undefined) out.tarefaPaiId = saved.tarefaPaiId;
  return out;
}
