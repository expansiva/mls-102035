/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/ports/listaTarefasRepository.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryPort",
  "artifactId": "ListaTarefasRepository",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.defs.ts"
  ],
  "data": {
    "entityId": "ListaTarefas",
    "interfaceName": "ListaTarefasRepository",
    "methods": [
      {
        "name": "create",
        "params": [
          "ListaTarefas"
        ],
        "returns": "ListaTarefas"
      },
      {
        "name": "list",
        "params": [
          "ListaTarefasFilter"
        ],
        "returns": "ListaTarefas[]"
      },
      {
        "name": "update",
        "params": [
          "ListaTarefas"
        ],
        "returns": "ListaTarefas"
      }
    ]
  }
} as const;

export default definition;
