/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/updateListaTarefas.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { ListaTarefasRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/listaTarefasRepository.js';
import type { ListaTarefas } from '/_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.js';

export interface UpdateListaTarefasInput extends Record<string, unknown> {
  nome: string;
  details: {
    descricao?: string;
  };
  id: string;
  version: number;
}

export interface UpdateListaTarefasOutput extends Record<string, unknown> {
  id: string;
  version: number;
  nome: string;
  details: {
    descricao?: string;
    quantidadeTarefasAbertas?: number;
  };
}

function isGestor(ctx: RequestContext): boolean {
  const session = ctx.sessionContext;
  const actorId = session.actorId ?? session.actorSession?.actorId;
  if (actorId === 'gestor') return true;
  const scope = session.actorScope ?? session.actorSession?.scope ?? [];
  return scope.some((entry) => entry === 'gestor' || entry.endsWith(':gestor'));
}

export async function updateListaTarefas(input: UpdateListaTarefasInput, ctx: RequestContext): Promise<UpdateListaTarefasOutput> {
  if (!isGestor(ctx)) {
    throw new AppError('FORBIDDEN', 'Only the gestor can change task lists.', 403, { ruleId: 'somenteGestorMantemListas' });
  }

  const repository = resolveRepository<ListaTarefasRepository>(ctx, 'ListaTarefasRepository');

  const id = String(input.id ?? '').trim();
  if (!id) {
    throw new AppError('INVALID_INPUT', 'The id of the list is required.', 400);
  }

  const nome = typeof input.nome === 'string' ? input.nome.trim() : '';
  if (!nome) {
    throw new AppError('INVALID_INPUT', 'The name of the list is required.', 400, { ruleId: 'nomeListaUnico' });
  }
  if (nome.length > 120) {
    throw new AppError('INVALID_INPUT', 'The name of the list must have at most 120 characters.', 400, { ruleId: 'nomeListaUnico' });
  }

  const rawDescricao = input.details?.descricao;
  if (rawDescricao !== undefined && rawDescricao !== null && typeof rawDescricao !== 'string') {
    throw new AppError('INVALID_INPUT', 'The description must be a text.', 400);
  }
  const descricao = typeof rawDescricao === 'string' ? rawDescricao : undefined;
  if (descricao !== undefined && descricao.length > 2000) {
    throw new AppError('INVALID_INPUT', 'The description must have at most 2000 characters.', 400);
  }

  const found = await repository.list({ id });
  const current = found.find((item) => item.id === id);
  if (!current) {
    throw new AppError('NOT_FOUND', 'Task list not found.', 404);
  }

  const inputVersion = Number(input.version);
  if (!Number.isFinite(inputVersion) || inputVersion !== current.version) {
    throw new AppError('CONCURRENCY_CONFLICT', 'Version does not match the stored row.', 409);
  }

  const sameName = await repository.list({ nome });
  const normalized = nome.toLocaleLowerCase();
  const duplicate = sameName.find((item) => item.id !== id && item.nome.trim().toLocaleLowerCase() === normalized);
  if (duplicate) {
    throw new AppError('DUPLICATE_NAME', 'Another task list already has this name.', 409, { ruleId: 'nomeListaUnico' });
  }

  const details: ListaTarefas['details'] = {};
  if (descricao !== undefined) details.descricao = descricao;

  const record: ListaTarefas = {
    id: current.id,
    version: current.version,
    nome,
    details,
  };

  const saved = await repository.update(record);

  const output: UpdateListaTarefasOutput = {
    id: saved.id,
    version: saved.version,
    nome: saved.nome,
    details: {},
  };
  if (saved.details?.descricao !== undefined) output.details.descricao = saved.details.descricao;
  return output;
}
