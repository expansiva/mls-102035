/// <mls fileReference="_102035_/l2/pizzaria/kitchenQueue.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "kitchen_queue",
  "pageName": "kitchenQueue",
  "actor": "staff",
  "purpose": "Fila de produção com pedidos em produção e prontos.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "kitchenQueueBoard",
          "purpose": "Mostrar pedidos por etapa da produção.",
          "rulesApplied": [
            "rule_order_flow"
          ]
        },
        {
          "organismName": "kitchenQueueActions",
          "purpose": "Permitir marcar pedidos como prontos.",
          "rulesApplied": [
            "rule_order_flow"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
