/// <mls fileReference="_102035_/l2/pizzaria/ordersList.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "orders_list",
  "pageName": "ordersList",
  "actor": "staff",
  "purpose": "Listar e acompanhar pedidos por canal e status.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "ordersListFilters",
          "purpose": "Filtrar pedidos por canal, status e janela de entrega.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_delivery_windows",
            "rule_delivery_fee_policy"
          ]
        },
        {
          "organismName": "ordersListResults",
          "purpose": "Exibir lista de pedidos e seus estados atuais.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_delivery_windows",
            "rule_delivery_fee_policy"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
