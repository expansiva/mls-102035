/// <mls fileReference="_102035_/l2/pizzaria/orderDetails.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "order-details",
  "pageName": "orderDetails",
  "actor": "staff",
  "purpose": "Visualizar pedido e atualizar status.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "orderDetailsSummary",
          "purpose": "Exibir dados completos do pedido e cliente.",
          "rulesApplied": [
            "rule6",
            "rule10"
          ]
        },
        {
          "organismName": "orderDetailsStatusUpdate",
          "purpose": "Permitir atualização do status do pedido.",
          "rulesApplied": [
            "rule6",
            "rule10"
          ]
        },
        {
          "organismName": "orderDetailsItems",
          "purpose": "Listar itens do pedido e observações.",
          "rulesApplied": [
            "rule6",
            "rule10"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
