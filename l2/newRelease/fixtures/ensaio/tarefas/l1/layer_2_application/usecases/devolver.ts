/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/devolver.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface DevolverInput extends Record<string, unknown> {
  id: string;
  version: number;
  details: {
    motivoDevolucao?: string;
  };
}

export interface DevolverOutput extends Record<string, unknown> {
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

export async function devolver(input: DevolverInput, ctx: RequestContext): Promise<DevolverOutput> {
  const repository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const id = String(input.id ?? '');
  if (!id) {
    throw new AppError('INVALID_INPUT', 'The task id is required.', 400);
  }

  const motivoRaw = input.details?.motivoDevolucao;
  const motivo = typeof motivoRaw === 'string' ? motivoRaw.trim() : '';
  if (!motivo) {
    throw new AppError('MOTIVO_DEVOLUCAO_REQUIRED', 'The reason for the return is required to send a task back.', 400, { ruleId: 'devolucaoExigeMotivo' });
  }

  const found = await repository.list({ id });
  const tarefa: Tarefa | undefined = found.find((t) => t.id === id);
  if (!tarefa) {
    throw new AppError('NOT_FOUND', 'Task not found.', 404);
  }

  if (input.version !== undefined && input.version !== null && Number(input.version) !== tarefa.version) {
    throw new AppError('CONCURRENCY_CONFLICT', 'Version does not match the stored row.', 409);
  }

  if (tarefa.status !== 'emRevisao') {
    throw new AppError('INVALID_STATE', 'Only a task under review can be returned.', 409, { ruleId: 'devolucaoExigeMotivo' });
  }

  const actorId = ctx.sessionContext.person?.mdmId;
  if (!actorId) {
    throw new AppError('FORBIDDEN', 'The session person could not be identified.', 403, { ruleId: 'apenasCriadorRevisa' });
  }
  if (actorId !== tarefa.criadorId) {
    throw new AppError('FORBIDDEN', 'Only the person who created the task can return it.', 403, { ruleId: 'apenasCriadorRevisa' });
  }

  const storedDetails: Tarefa['details'] = { ...tarefa.details };
  delete storedDetails.quemAgeAgora;
  delete storedDetails.aberta;
  delete storedDetails.venceHoje;
  delete storedDetails.atrasada;
  delete storedDetails.devolvidaPendente;
  delete storedDetails.quantidadeSubtarefas;
  delete storedDetails.progressoChecklist;
  delete storedDetails.retomadaEm;

  const devolvidaEm = ctx.clock.nowIso();
  const next: Tarefa = {
    ...tarefa,
    status: 'emAndamento',
    details: {
      ...storedDetails,
      motivoDevolucao: motivo,
      devolvidaEm,
    },
  };

  const saved = await repository.transition(next, 'devolver');

  const today = ctx.clock.nowIso().slice(0, 10);
  const aberta = saved.status !== 'concluida' && saved.status !== 'cancelada';
  const prazoDay = saved.prazo ? saved.prazo.slice(0, 10) : undefined;
  const venceHoje = aberta && prazoDay !== undefined && prazoDay === today;
  const atrasada = aberta && prazoDay !== undefined && prazoDay < today;
  const quemAgeAgora =
    saved.status === 'aFazer' || saved.status === 'emAndamento'
      ? saved.responsavelId
      : saved.status === 'emRevisao'
        ? saved.criadorId
        : undefined;
  const devolvidaPendente =
    saved.status === 'emAndamento' &&
    saved.details.devolvidaEm !== undefined &&
    (saved.details.retomadaEm === undefined || saved.details.retomadaEm < saved.details.devolvidaEm);

  const out: DevolverOutput = {
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
      aberta,
      venceHoje,
      atrasada,
      devolvidaPendente,
    },
  };
  if (saved.prazo !== undefined) out.prazo = saved.prazo;
  if (saved.tarefaPaiId !== undefined) out.tarefaPaiId = saved.tarefaPaiId;
  if (saved.details.descricao !== undefined) out.details.descricao = saved.details.descricao;
  if (saved.details.etiquetas !== undefined) out.details.etiquetas = saved.details.etiquetas;
  if (saved.details.motivoDevolucao !== undefined) out.details.motivoDevolucao = saved.details.motivoDevolucao;
  if (saved.details.devolvidaEm !== undefined) out.details.devolvidaEm = saved.details.devolvidaEm;
  if (saved.details.retomadaEm !== undefined) out.details.retomadaEm = saved.details.retomadaEm;
  if (saved.details.concluidaEm !== undefined) out.details.concluidaEm = saved.details.concluidaEm;
  if (saved.details.canceladaEm !== undefined) out.details.canceladaEm = saved.details.canceladaEm;
  if (quemAgeAgora !== undefined) out.details.quemAgeAgora = quemAgeAgora;
  return out;
}
