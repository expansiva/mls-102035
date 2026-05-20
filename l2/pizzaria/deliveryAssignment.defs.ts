/// <mls fileReference="_102035_/l2/pizzaria/deliveryAssignment.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "delivery-assignment",
  "pageName": "deliveryAssignment",
  "actor": "staff",
  "purpose": "Atribuir pedidos prontos a entregadores.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "deliveryAssignmentQueue",
          "purpose": "Exibir pedidos prontos aguardando atribuição.",
          "rulesApplied": [
            "rule7",
            "rule10"
          ]
        },
        {
          "organismName": "deliveryAssignmentDispatcher",
          "purpose": "Selecionar entregador e atribuir pedidos.",
          "rulesApplied": [
            "rule7",
            "rule10"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
