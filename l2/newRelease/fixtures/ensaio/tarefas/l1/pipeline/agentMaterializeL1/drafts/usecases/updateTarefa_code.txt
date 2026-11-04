/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/updateTarefa.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { ItemChecklistRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/itemChecklistRepository.js';
import type { ListaTarefasRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/listaTarefasRepository.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface UpdateTarefaInput extends Record<string, unknown> {
  id: string;
  version: number;
  titulo?: string;
  status?: string;
  prioridade?: string;
  prazo?: string;
  listaId?: string;
  responsavelId?: string;
  criadorId?: string;
  tarefaPaiId?: string;
  details?: {
    descricao?: string;
    etiquetas?: string[];
    motivoDevolucao?: string;
    devolvidaEm?: string;
    retomadaEm?: string;
    concluidaEm?: string;
    canceladaEm?: string;
  };
}

export interface UpdateTarefaOutput extends Record<string, unknown> {
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
  const scope = ctx.sessionContext.actorScope ?? ctx.sessionContext.actorSession.scope ?? [];
  const actorId = ctx.sessionContext.actorId ?? ctx.sessionContext.actorSession.actorId;
  if (actorId === 'gestor') return true;
  return scope.some((s) => s === 'gestor' || s.endsWith(':gestor'));
}

async function findTarefa(repo: TarefaRepository, id: string): Promise<Tarefa | undefined> {
  const rows = await repo.list({ id });
  return rows.find((r) => r.id === id);
}

// quemAgeAgoraPorSituacao: the responsible acts when aFazer/emAndamento, the creator when emRevisao, nobody when closed
function quemAgeAgora(tarefa: Tarefa): string | undefined {
  switch (tarefa.status) {
    case 'aFazer':
    case 'emAndamento':
      return tarefa.responsavelId;
    case 'emRevisao':
      return tarefa.criadorId;
    case 'concluida':
    case 'cancelada':
      return undefined;
    default:
      throw new AppError('INVALID_STATE', 'The task status is unknown, so who acts now cannot be determined.', 409, { ruleId: 'quemAgeAgoraPorSituacao' });
  }
}

export async function updateTarefa(input: UpdateTarefaInput, ctx: RequestContext): Promise<UpdateTarefaOutput> {
  const repo = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');
  const itemRepo = resolveRepository<ItemChecklistRepository>(ctx, 'ItemChecklistRepository');
  const listaRepo = resolveRepository<ListaTarefasRepository>(ctx, 'ListaTarefasRepository');

  const id = String(input.id ?? '');
  if (!id) throw new AppError('VALIDATION_ERROR', 'The task id is required.', 400);
  if (input.version === undefined || input.version === null) {
    throw new AppError('VALIDATION_ERROR', 'The task version is required.', 400);
  }

  const current = await findTarefa(repo, id);
  if (!current) throw new AppError('NOT_FOUND', 'Task not found.', 404);
  if (Number(input.version) !== current.version) {
    throw new AppError('CONCURRENCY_CONFLICT', 'Version does not match the stored row.', 409);
  }

  // edicaoNaoMudaSituacao: editing never changes the status
  if (input.status !== undefined && String(input.status) !== current.status) {
    throw new AppError('STATUS_CHANGE_NOT_ALLOWED', 'Editing a task never changes its status.', 409, { ruleId: 'edicaoNaoMudaSituacao' });
  }

  // membroVeResponsavelOuCriador: only who sees the task (responsible, creator) or the manager edits it
  const gestor = isGestor(ctx);
  const actorId = ctx.sessionContext.person?.mdmId;
  if (!gestor) {
    if (!actorId) {
      throw new AppError('FORBIDDEN', 'The session person is required to edit a task.', 403, { ruleId: 'membroVeResponsavelOuCriador' });
    }
    if (actorId !== current.responsavelId && actorId !== current.criadorId) {
      throw new AppError('FORBIDDEN', 'Only the responsible, the creator or the manager can see and edit this task.', 403, { ruleId: 'membroVeResponsavelOuCriador' });
    }
  }

  // reatribuirApenasCriadorOuGestor + quemAgeAgoraPorSituacao
  let responsavelId = current.responsavelId;
  if (input.responsavelId !== undefined && String(input.responsavelId) !== current.responsavelId) {
    if (!gestor && actorId !== current.criadorId) {
      throw new AppError('FORBIDDEN', 'Only the creator or the manager can change the responsible.', 403, { ruleId: 'reatribuirApenasCriadorOuGestor' });
    }
    if (current.status === 'concluida' || current.status === 'cancelada') {
      throw new AppError('INVALID_STATE', 'A finished or cancelled task has nobody acting now, so its responsible cannot be changed.', 409, { ruleId: 'quemAgeAgoraPorSituacao' });
    }
    responsavelId = String(input.responsavelId);
  }

  // lista must exist when changed
  let listaId = current.listaId;
  if (input.listaId !== undefined && String(input.listaId) !== current.listaId) {
    listaId = String(input.listaId);
    const listas = await listaRepo.list({ id: listaId });
    if (!listas.some((l) => l.id === listaId)) {
      throw new AppError('NOT_FOUND', 'Task list not found.', 404);
    }
  }

  // tarefaPaiDiferenteDaPropria
  let tarefaPaiId = current.tarefaPaiId;
  if (input.tarefaPaiId !== undefined && String(input.tarefaPaiId) !== (current.tarefaPaiId ?? '')) {
    const novoPai = String(input.tarefaPaiId);
    if (novoPai === id) {
      throw new AppError('INVALID_PARENT', 'The parent task cannot be the task itself.', 400, { ruleId: 'tarefaPaiDiferenteDaPropria' });
    }
    const visited = new Set<string>();
    let cursor: string | undefined = novoPai;
    while (cursor) {
      if (cursor === id) {
        throw new AppError('INVALID_PARENT', 'The parent task cannot be one of the task subtasks.', 400, { ruleId: 'tarefaPaiDiferenteDaPropria' });
      }
      if (visited.has(cursor)) break;
      visited.add(cursor);
      const ancestor = await findTarefa(repo, cursor);
      if (!ancestor) throw new AppError('NOT_FOUND', 'Parent task not found.', 404);
      cursor = ancestor.tarefaPaiId;
    }
    tarefaPaiId = novoPai;
  }

  const titulo = input.titulo !== undefined ? String(input.titulo) : current.titulo;
  if (!titulo.trim()) throw new AppError('VALIDATION_ERROR', 'The task title is required.', 400);
  if (titulo.length > 200) throw new AppError('VALIDATION_ERROR', 'The task title has at most 200 characters.', 400);

  let prioridade = current.prioridade;
  if (input.prioridade !== undefined) {
    const p = String(input.prioridade);
    if (p !== 'baixa' && p !== 'media' && p !== 'alta') {
      throw new AppError('VALIDATION_ERROR', 'Invalid priority.', 400);
    }
    prioridade = p;
  }

  const prazo = input.prazo !== undefined ? String(input.prazo) : current.prazo;

  // Stored details: never the derived members
  const stored = current.details;
  const details: Tarefa['details'] = {};
  if (stored.descricao !== undefined) details.descricao = stored.descricao;
  if (stored.etiquetas !== undefined) details.etiquetas = stored.etiquetas;
  if (stored.motivoDevolucao !== undefined) details.motivoDevolucao = stored.motivoDevolucao;
  if (stored.devolvidaEm !== undefined) details.devolvidaEm = stored.devolvidaEm;
  if (stored.retomadaEm !== undefined) details.retomadaEm = stored.retomadaEm;
  if (stored.concluidaEm !== undefined) details.concluidaEm = stored.concluidaEm;
  if (stored.canceladaEm !== undefined) details.canceladaEm = stored.canceladaEm;
  if (input.details?.descricao !== undefined) details.descricao = String(input.details.descricao);
  if (input.details?.etiquetas !== undefined) {
    if (!Array.isArray(input.details.etiquetas)) {
      throw new AppError('VALIDATION_ERROR', 'Tags must be a list of texts.', 400);
    }
    const etiquetas = input.details.etiquetas.map((e) => String(e));
    if (etiquetas.some((e) => e.length > 40)) {
      throw new AppError('VALIDATION_ERROR', 'A tag has at most 40 characters.', 400);
    }
    details.etiquetas = etiquetas;
  }

  const record: Tarefa = {
    id: current.id,
    version: current.version,
    titulo,
    status: current.status,
    prioridade,
    listaId,
    responsavelId,
    criadorId: current.criadorId,
    criadaEm: current.criadaEm,
    details,
  };
  if (prazo !== undefined) record.prazo = prazo;
  if (tarefaPaiId !== undefined) record.tarefaPaiId = tarefaPaiId;

  const saved = await repo.update(record);

  // Derived values, calculated every time and never stored
  const aberta = saved.status !== 'concluida' && saved.status !== 'cancelada';
  const today = ctx.clock.nowIso().slice(0, 10);
  const prazoDay = saved.prazo ? saved.prazo.slice(0, 10) : undefined;
  const sd = saved.details;
  const out: UpdateTarefaOutput['details'] = {};
  if (sd.descricao !== undefined) out.descricao = sd.descricao;
  if (sd.etiquetas !== undefined) out.etiquetas = sd.etiquetas;
  if (sd.motivoDevolucao !== undefined) out.motivoDevolucao = sd.motivoDevolucao;
  if (sd.devolvidaEm !== undefined) out.devolvidaEm = sd.devolvidaEm;
  if (sd.retomadaEm !== undefined) out.retomadaEm = sd.retomadaEm;
  if (sd.concluidaEm !== undefined) out.concluidaEm = sd.concluidaEm;
  if (sd.canceladaEm !== undefined) out.canceladaEm = sd.canceladaEm;
  const acting = quemAgeAgora(saved);
  if (acting !== undefined) out.quemAgeAgora = acting;
  out.aberta = aberta;
  out.venceHoje = aberta && prazoDay !== undefined && prazoDay === today;
  out.atrasada = aberta && prazoDay !== undefined && prazoDay < today;
  out.devolvidaPendente =
    saved.status === 'emAndamento' &&
    sd.devolvidaEm !== undefined &&
    (sd.retomadaEm === undefined || sd.retomadaEm < sd.devolvidaEm);
  const subtarefas = await repo.list({ tarefaPaiId: saved.id });
  out.quantidadeSubtarefas = subtarefas.filter((t) => t.tarefaPaiId === saved.id).length;
  const itens = (await itemRepo.list({ tarefaId: saved.id })).filter((i) => i.tarefaId === saved.id);
  out.progressoChecklist = `${itens.filter((i) => i.details.concluido).length} de ${itens.length}`;

  const result: UpdateTarefaOutput = {
    id: saved.id,
    version: saved.version,
    titulo: saved.titulo,
    status: saved.status,
    prioridade: saved.prioridade,
    listaId: saved.listaId,
    responsavelId: saved.responsavelId,
    criadorId: saved.criadorId,
    criadaEm: saved.criadaEm,
    details: out,
  };
  if (saved.prazo !== undefined) result.prazo = saved.prazo;
  if (saved.tarefaPaiId !== undefined) result.tarefaPaiId = saved.tarefaPaiId;
  return result;
}
