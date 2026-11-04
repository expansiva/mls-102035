/// <mls fileReference="_102047_/l1/tarefas/layer_3_domain/entities/participante.ts" enhancement="_blank"/>
export type Participante = {
  id: string;
  version: number;
  details: {
    identification: {
      subtype: 'Person';
      name: string;
      status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      tags: string[];
    };
    base?: Record<string, unknown>;
    person?: Record<string, unknown>;
    general?: Record<string, unknown>;
    tarefas?: {
      aceitaTarefas?: boolean;
      podeCriarTarefas?: boolean;
      aceitaTarefasEfetivo?: boolean;
      podeCriarTarefasEfetivo?: boolean;
    };
  };
};
