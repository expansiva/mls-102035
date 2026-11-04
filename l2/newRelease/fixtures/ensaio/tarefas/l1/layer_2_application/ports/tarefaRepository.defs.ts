/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryPort",
  "artifactId": "TarefaRepository",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/tarefa.defs.ts"
  ],
  "data": {
    "entityId": "Tarefa",
    "interfaceName": "TarefaRepository",
    "methods": [
      {
        "name": "create",
        "params": [
          "Tarefa"
        ],
        "returns": "Tarefa"
      },
      {
        "name": "list",
        "params": [
          "TarefaFilter"
        ],
        "returns": "Tarefa[]"
      },
      {
        "name": "update",
        "params": [
          "Tarefa"
        ],
        "returns": "Tarefa"
      },
      {
        "name": "transition",
        "params": [
          "Tarefa",
          "transitionId"
        ],
        "returns": "Tarefa"
      }
    ]
  }
} as const;

export default definition;
