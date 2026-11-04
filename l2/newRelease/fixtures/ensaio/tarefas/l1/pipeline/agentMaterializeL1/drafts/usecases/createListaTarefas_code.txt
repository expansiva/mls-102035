/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/createListaTarefas.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { ListaTarefasRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/listaTarefasRepository.js';
import type { ListaTarefas } from '/_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.js';

export interface CreateListaTarefasInput extends Record<string, unknown> {
  nome: string;
  details: {
    descricao?: string;
  };
}

export interface CreateListaTarefasOutput extends Record<string, unknown> {
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
  const scope: string[] = [
    ...(session.actorScope ?? []),
    ...(session.actorSession?.scope ?? []),
  ];
  if (session.actorId === 'gestor' || session.actorSession?.actorId === 'gestor') return true;
  return scope.some((s) => s === 'gestor' || s.endsWith(':gestor'));
}

export async function createListaTarefas(input: CreateListaTarefasInput, ctx: RequestContext): Promise<CreateListaTarefasOutput> {
  if (!isGestor(ctx)) {
    throw new AppError('FORBIDDEN', 'Only the gestor can create task lists.', 403, { ruleId: 'somenteGestorMantemListas' });
  }

  const nome = typeof input.nome === 'string' ? input.nome.trim() : '';
  if (nome === '') {
    throw new AppError('INVALID_VALUE', 'The name of the task list is required.', 400, { ruleId: 'nomeListaUnico' });
  }
  if (nome.length > 120) {
    throw new AppError('INVALID_VALUE', 'The name of the task list must have at most 120 characters.', 400, { ruleId: 'nomeListaUnico' });
  }

  const rawDescricao = input.details?.descricao;
  let descricao: string | undefined;
  if (rawDescricao !== undefined && rawDescricao !== null) {
    descricao = String(rawDescricao);
    if (descricao.length > 2000) {
      throw new AppError('INVALID_VALUE', 'The description must have at most 2000 characters.', 400);
    }
  }

  const repository = resolveRepository<ListaTarefasRepository>(ctx, 'ListaTarefasRepository');

  const existing = await repository.list({});
  const wanted = nome.toLocaleLowerCase();
  const duplicate = existing.some((l) => String(l.nome).trim().toLocaleLowerCase() === wanted);
  if (duplicate) {
    throw new AppError('CONFLICT', 'Another task list already has this name.', 409, { ruleId: 'nomeListaUnico' });
  }

  const record: ListaTarefas = {
    id: ctx.idGenerator.newId(),
    version: 1,
    nome,
    details: descricao !== undefined ? { descricao } : {},
  };

  const created = await repository.create(record);

  const details: CreateListaTarefasOutput['details'] = {};
  if (created.details?.descricao !== undefined) details.descricao = created.details.descricao;
  details.quantidadeTarefasAbertas = 0;

  return {
    id: created.id,
    version: created.version,
    nome: created.nome,
    details,
  };
}
