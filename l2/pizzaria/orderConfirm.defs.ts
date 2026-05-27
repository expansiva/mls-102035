/// <mls fileReference="_102035_/l2/pizzaria/orderConfirm.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "order_confirm",
  "pageName": "orderConfirm",
  "actor": "staff",
  "purpose": "Confirmar pedido com resumo e ETA antes de enviar à produção.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "orderConfirmSummary",
          "purpose": "Apresentar resumo completo do pedido para conferência.",
          "rulesApplied": [
            "rule_order_confirmation"
          ]
        },
        {
          "organismName": "orderConfirmEta",
          "purpose": "Informar ETA conforme canal e janela de entrega.",
          "rulesApplied": [
            "rule_order_confirmation"
          ]
        },
        {
          "organismName": "orderConfirmActions",
          "purpose": "Permitir confirmação final do pedido.",
          "rulesApplied": [
            "rule_order_confirmation"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
