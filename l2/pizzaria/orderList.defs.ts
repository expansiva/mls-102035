/// <mls fileReference="_102035_/l2/pizzaria/orderList.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "order-list",
  "pageName": "orderList",
  "actor": "staff",
  "purpose": "Listar pedidos e acessar detalhes.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "orderListQueue",
          "purpose": "Exibir fila de pedidos com status e acesso ao detalhe.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10"
          ]
        },
        {
          "organismName": "orderListFilters",
          "purpose": "Filtrar pedidos por status, horário ou origem.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
