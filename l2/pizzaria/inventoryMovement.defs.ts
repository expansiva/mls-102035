/// <mls fileReference="_102035_/l2/pizzaria/inventoryMovement.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "inventory_movement",
  "pageName": "inventoryMovement",
  "actor": "staff",
  "purpose": "Registrar entrada ou saída de estoque.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "inventoryMovementForm",
          "purpose": "Registrar movimento de entrada ou saída com quantidade e motivo.",
          "rulesApplied": [
            "rule_features_core"
          ]
        },
        {
          "organismName": "inventoryMovementSummary",
          "purpose": "Exibir impacto previsto no estoque.",
          "rulesApplied": [
            "rule_features_core"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
