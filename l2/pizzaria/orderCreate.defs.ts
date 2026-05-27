/// <mls fileReference="_102035_/l2/pizzaria/orderCreate.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "order_create",
  "pageName": "orderCreate",
  "actor": "staff",
  "purpose": "Registrar novo pedido de balcão ou delivery com itens e dados necessários.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "orderCreateCustomerAndChannel",
          "purpose": "Capturar canal, cliente e dados de entrega/retirada.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_delivery_windows",
            "rule_delivery_fee_policy"
          ]
        },
        {
          "organismName": "orderCreateItems",
          "purpose": "Selecionar itens e quantidades do pedido.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_delivery_fee_policy"
          ]
        },
        {
          "organismName": "orderCreatePricingSummary",
          "purpose": "Exibir resumo de valores, taxas e total.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_delivery_fee_policy"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
