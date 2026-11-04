/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/updateItemChecklist.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { ItemChecklistRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/itemChecklistRepository.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { ItemChecklist } from '/_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';

export interface UpdateItemChecklistInput extends Record<string, unknown> {
  tarefaId: string;
  ordem: number;
  details: {
    descricao: string;
    concluido: boolean;
  };
  id: string;
  version: number;
}

export interface UpdateItemChecklistOutput extends Record<string, unknown> {
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
  const scope = ctx.sessionContext.actorScope ?? ctx.sessionContext.actorSession?.scope ?? [];
  if (scope.some((s) => s === 'gestor' || s.endsWith(':gestor'))) return true;
  const actorId = ctx.sessionContext.actorId ?? ctx.sessionContext.actorSession?.actorId;
  return actorId === 'gestor';
}

function seesTarefa(ctx: RequestContext, tarefa: Tarefa): boolean {
  if (isGestor(ctx)) return true;
  const person = ctx.sessionContext.person;
  if (!person) return false;
  const ids = [person.mdmId, person.email].filter((v): v is string => typeof v === 'string' && v !== '');
  return ids.includes(tarefa.responsavelId) || ids.includes(tarefa.criadorId);
}

export async function updateItemChecklist(input: UpdateItemChecklistInput, ctx: RequestContext): Promise<UpdateItemChecklistOutput> {
  const itemRepository = resolveRepository<ItemChecklistRepository>(ctx, 'ItemChecklistRepository');
  const tarefaRepository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const id = String(input.id ?? '');
  if (id === '') {
    throw new AppError('VALIDATION_ERROR', 'id is required.', 400);
  }

  const found = await itemRepository.list({ id });
  const current: ItemChecklist | undefined = found.find((i) => i.id === id);
  if (!current) {
    throw new AppError('NOT_FOUND', 'Checklist item not found.', 404);
  }

  if (input.version !== undefined && input.version !== null && Number(input.version) !== current.version) {
    throw new AppError('CONCURRENCY_CONFLICT', 'Version does not match the stored row.', 409);
  }
  if (input.tarefaId !== undefined && input.tarefaId !== null && String(input.tarefaId) !== current.tarefaId) {
    throw new AppError('VALIDATION_ERROR', 'An item cannot be moved to another task.', 400);
  }

  const tarefas = await tarefaRepository.list({ id: current.tarefaId });
  const tarefa = tarefas.find((t) => t.id === current.tarefaId);
  if (!tarefa) {
    throw new AppError('NOT_FOUND', 'Task of the checklist item not found.', 404);
  }

  if (!seesTarefa(ctx, tarefa)) {
    throw new AppError('FORBIDDEN', 'Only who sees the task can edit or check its checklist items.', 403, { ruleId: 'itemChecklistSoQuemVeTarefa' });
  }

  if (tarefa.status === 'concluida' || tarefa.status === 'cancelada') {
    throw new AppError('CONFLICT', 'Checklist items cannot be changed while the task is concluded or canceled.', 409, { ruleId: 'itemChecklistTarefaNaoEncerrada' });
  }

  const descricao = input.details?.descricao !== undefined ? String(input.details.descricao).trim() : current.details.descricao;
  if (descricao === '') {
    throw new AppError('VALIDATION_ERROR', 'descricao is required.', 400);
  }
  if (descricao.length > 300) {
    throw new AppError('VALIDATION_ERROR', 'descricao must have at most 300 characters.', 400);
  }

  let concluido = current.details.concluido;
  if (input.details?.concluido !== undefined) {
    if (typeof input.details.concluido !== 'boolean') {
      throw new AppError('VALIDATION_ERROR', 'concluido must be a boolean.', 400);
    }
    concluido = input.details.concluido;
  }

  let ordem = current.ordem;
  if (input.ordem !== undefined && input.ordem !== null) {
    const parsed = Number(input.ordem);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new AppError('VALIDATION_ERROR', 'ordem must be an integer greater than or equal to 0.', 400);
    }
    ordem = parsed;
  }

  // concluidoEm is derived: calculated here (the moment of the check), absent when unchecked.
  const concluidoEm: string | undefined = concluido ? ctx.clock.nowIso() : undefined;
  const details: ItemChecklist['details'] = { descricao, concluido };
  if (concluidoEm !== undefined) {
    details.concluidoEm = concluidoEm;
  }

  const saved = await itemRepository.update({
    id: current.id,
    version: current.version,
    tarefaId: current.tarefaId,
    ordem,
    details,
  });

  // marcarItemNaoMudaSituacao: checking or unchecking an item never changes the task status.
  const tarefasAfter = await tarefaRepository.list({ id: current.tarefaId });
  const tarefaAfter = tarefasAfter.find((t) => t.id === current.tarefaId);
  if (!tarefaAfter || tarefaAfter.status !== tarefa.status) {
    throw new AppError('CONFLICT', 'Checking or unchecking a checklist item must not change the task status.', 409, { ruleId: 'marcarItemNaoMudaSituacao' });
  }

  const outDetails: UpdateItemChecklistOutput['details'] = {
    descricao: saved.details.descricao,
    concluido: saved.details.concluido,
  };
  if (saved.details.concluido && concluidoEm !== undefined) {
    outDetails.concluidoEm = concluidoEm;
  }

  return {
    id: saved.id,
    version: saved.version,
    tarefaId: saved.tarefaId,
    ordem: saved.ordem,
    details: outDetails,
  };
}
