/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/createItemChecklist.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { ItemChecklistRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/itemChecklistRepository.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { ItemChecklist } from '/_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface CreateItemChecklistInput extends Record<string, unknown> {
  tarefaId: string;
  ordem: number;
  details: {
    descricao: string;
    concluido: boolean;
  };
}

export interface CreateItemChecklistOutput extends Record<string, unknown> {
  id: string;
  version: number;
  tarefaId: string;
  ordem: number;
  details: {
    descricao: string;
    concluido: boolean;
    concluidoEm?: string;
  };
}

function isGestor(ctx: RequestContext): boolean {
  const scopes: string[] = [];
  if (Array.isArray(ctx.sessionContext.actorScope)) scopes.push(...ctx.sessionContext.actorScope);
  if (Array.isArray(ctx.sessionContext.actorSession?.scope)) scopes.push(...(ctx.sessionContext.actorSession.scope as string[]));
  if (ctx.sessionContext.actorId) scopes.push(ctx.sessionContext.actorId);
  return scopes.some((s) => s === 'gestor' || s.endsWith(':gestor'));
}

export async function createItemChecklist(input: CreateItemChecklistInput, ctx: RequestContext): Promise<CreateItemChecklistOutput> {
  const itemRepository = resolveRepository<ItemChecklistRepository>(ctx, 'ItemChecklistRepository');
  const tarefaRepository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const tarefaId = typeof input.tarefaId === 'string' ? input.tarefaId.trim() : '';
  if (!tarefaId) {
    throw new AppError('INVALID_INPUT', 'tarefaId is required.', 400);
  }
  const ordem = Number(input.ordem);
  if (input.ordem === undefined || input.ordem === null || !Number.isInteger(ordem) || ordem < 0) {
    throw new AppError('INVALID_INPUT', 'ordem must be an integer greater than or equal to 0.', 400);
  }
  const descricaoRaw = input.details?.descricao;
  const descricao = typeof descricaoRaw === 'string' ? descricaoRaw.trim() : '';
  if (!descricao) {
    throw new AppError('INVALID_INPUT', 'details.descricao is required.', 400);
  }
  if (descricao.length > 300) {
    throw new AppError('INVALID_INPUT', 'details.descricao must have at most 300 characters.', 400);
  }
  const concluido = input.details?.concluido;
  if (typeof concluido !== 'boolean') {
    throw new AppError('INVALID_INPUT', 'details.concluido must be a boolean.', 400);
  }

  const tarefas: Tarefa[] = await tarefaRepository.list({ id: tarefaId });
  const tarefa = tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) {
    throw new AppError('NOT_FOUND', 'Tarefa not found.', 404);
  }

  // itemChecklistSoQuemVeTarefa: only who sees the task (gestor sees all; member sees responsável or criador).
  if (!isGestor(ctx)) {
    const personId = ctx.sessionContext.person?.mdmId;
    if (!personId || (tarefa.responsavelId !== personId && tarefa.criadorId !== personId)) {
      throw new AppError('FORBIDDEN', 'Only who sees the task can add items to its checklist.', 403, { ruleId: 'itemChecklistSoQuemVeTarefa' });
    }
  }

  // itemChecklistTarefaNaoEncerrada
  if (tarefa.status === 'concluida' || tarefa.status === 'cancelada') {
    throw new AppError('CONFLICT', 'Checklist items cannot be added to a completed or cancelled task.', 409, { ruleId: 'itemChecklistTarefaNaoEncerrada' });
  }

  const details: ItemChecklist['details'] = { descricao, concluido };
  if (concluido) {
    details.concluidoEm = ctx.clock.nowIso();
  }

  const record: ItemChecklist = {
    id: ctx.idGenerator.newId(),
    version: 1,
    tarefaId,
    ordem,
    details,
  };
  const created = await itemRepository.create(record);

  const outDetails: CreateItemChecklistOutput['details'] = {
    descricao: created.details.descricao,
    concluido: created.details.concluido,
  };
  if (created.details.concluidoEm !== undefined) {
    outDetails.concluidoEm = created.details.concluidoEm;
  }
  return {
    id: created.id,
    version: created.version,
    tarefaId: created.tarefaId,
    ordem: created.ordem,
    details: outDetails,
  };
}
