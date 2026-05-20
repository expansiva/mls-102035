/// <mls fileReference="_102035_/l2/pizzaria/inventoryAdjustment.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "inventory-adjustment",
  "pageName": "inventoryAdjustment",
  "actor": "staff",
  "purpose": "Ajustar quantidade em estoque.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "inventoryAdjustmentForm",
          "purpose": "Registrar ajuste de quantidade do item em estoque.",
          "rulesApplied": [
            "rule8",
            "rule14"
          ]
        },
        {
          "organismName": "inventoryAdjustmentReason",
          "purpose": "Capturar motivo e observações do ajuste.",
          "rulesApplied": [
            "rule8",
            "rule14"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
