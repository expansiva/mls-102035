/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/ports/itemChecklistRepository.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryPort",
  "artifactId": "ItemChecklistRepository",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.defs.ts"
  ],
  "data": {
    "entityId": "ItemChecklist",
    "interfaceName": "ItemChecklistRepository",
    "methods": [
      {
        "name": "create",
        "params": [
          "ItemChecklist"
        ],
        "returns": "ItemChecklist"
      },
      {
        "name": "list",
        "params": [
          "ItemChecklistFilter"
        ],
        "returns": "ItemChecklist[]"
      },
      {
        "name": "update",
        "params": [
          "ItemChecklist"
        ],
        "returns": "ItemChecklist"
      }
    ]
  }
} as const;

export default definition;
