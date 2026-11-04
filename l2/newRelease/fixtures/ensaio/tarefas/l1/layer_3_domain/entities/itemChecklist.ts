/// <mls fileReference="_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.ts" enhancement="_blank"/>
export type ItemChecklist = {
  id: string;
  version: number;
  tarefaId: string;
  ordem: number;
  details: {
    descricao: string;
    concluido: boolean;
    concluidoEm?: string;
  };
};
