/// <mls fileReference="_102035_/l2/pizzaria/pedidoPagamento.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "pedido-pagamento",
  "pageName": "pedidoPagamento",
  "actor": "staff",
  "purpose": "Registrar forma e status de pagamento do pedido.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "pedidoPagamentoSummary",
          "purpose": "Mostrar resumo do pedido para referência do pagamento.",
          "rulesApplied": [
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        },
        {
          "organismName": "pedidoPagamentoForm",
          "purpose": "Registrar forma e status de pagamento do pedido.",
          "rulesApplied": [
            "ruleRegistroPagamentoPedido",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
