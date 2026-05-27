/// <mls fileReference="_102035_/l2/pizzaria/orderCancelRefund.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "order_cancel_refund",
  "pageName": "orderCancelRefund",
  "actor": "staff",
  "purpose": "Cancelar pedido e registrar reembolso com motivo obrigatório conforme política.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "orderCancelRefundForm",
          "purpose": "Capturar motivo obrigatório e dados de reembolso.",
          "rulesApplied": [
            "rule_cancel_refund_policy"
          ]
        },
        {
          "organismName": "orderCancelRefundSummary",
          "purpose": "Exibir resumo do pedido a ser cancelado.",
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
