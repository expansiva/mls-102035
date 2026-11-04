/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/registerRepositories.ts" enhancement="_blank"/>
import { registerRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import { createItemChecklistRepository } from '/_102047_/l1/tarefas/layer_1_external/adapters/persistence/itemChecklistRepositoryAdapter.js';
import { createListaTarefasRepository } from '/_102047_/l1/tarefas/layer_1_external/adapters/persistence/listaTarefasRepositoryAdapter.js';
import { createTarefaRepository } from '/_102047_/l1/tarefas/layer_1_external/adapters/persistence/tarefaRepositoryAdapter.js';

export function registerRepositories(): void {
  registerRepository("ItemChecklistRepository", ctx => createItemChecklistRepository(ctx));
  registerRepository("ListaTarefasRepository", ctx => createListaTarefasRepository(ctx));
  registerRepository("TarefaRepository", ctx => createTarefaRepository(ctx));
}

registerRepositories();
