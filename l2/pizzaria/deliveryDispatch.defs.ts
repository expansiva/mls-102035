/// <mls fileReference="_102035_/l2/pizzaria/deliveryDispatch.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "delivery_dispatch",
  "pageName": "deliveryDispatch",
  "actor": "staff",
  "purpose": "Acompanhar pedidos prontos e em entrega, com atualização de status.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "deliveryDispatchList",
          "purpose": "Exibir pedidos prontos e em entrega por status.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_whatsapp_updates",
            "rule_whatsapp_message_policy"
          ]
        },
        {
          "organismName": "deliveryDispatchActions",
          "purpose": "Atualizar status e comunicar via WhatsApp.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_whatsapp_updates",
            "rule_whatsapp_message_policy"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
