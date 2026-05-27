/// <mls fileReference="_102035_/l2/pizzaria/orderDetails.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "order_details",
  "pageName": "orderDetails",
  "actor": "staff",
  "purpose": "Visualizar detalhes do pedido e ações de status, impressão, WhatsApp e cancelamento.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "orderDetailsSummary",
          "purpose": "Exibir dados completos do pedido, itens e valores.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_print_ticket",
            "rule_whatsapp_updates",
            "rule_cancel_refund_policy",
            "rule_whatsapp_message_policy"
          ]
        },
        {
          "organismName": "orderDetailsStatusActions",
          "purpose": "Disponibilizar ações de atualização de status e produção/entrega.",
          "rulesApplied": [
            "rule_order_flow"
          ]
        },
        {
          "organismName": "orderDetailsCommunicationActions",
          "purpose": "Oferecer impressão e envio de atualização por WhatsApp.",
          "rulesApplied": [
            "rule_print_ticket",
            "rule_whatsapp_updates",
            "rule_whatsapp_message_policy"
          ]
        },
        {
          "organismName": "orderDetailsCancellationActions",
          "purpose": "Acesso ao cancelamento e reembolso conforme política.",
          "rulesApplied": [
            "rule_cancel_refund_policy"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
