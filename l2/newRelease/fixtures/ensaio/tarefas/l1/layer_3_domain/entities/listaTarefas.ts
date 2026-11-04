/// <mls fileReference="_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.ts" enhancement="_blank"/>
export type ListaTarefas = {
  id: string;
  version: number;
  nome: string;
  details: {
    descricao?: string;
    quantidadeTarefasAbertas?: number;
  };
};
