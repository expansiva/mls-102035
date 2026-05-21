/// <mls fileReference="_102035_/l2/pizzaria/pedidoDetalhe.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "pedido-detalhe",
  "pageName": "pedidoDetalhe",
  "actor": "staff",
  "purpose": "Visualizar detalhes do pedido, status, pagamento e observações críticas.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "pedidoDetalheHeaderSummary",
          "purpose": "Apresentar resumo do pedido e status atual.",
          "rulesApplied": [
            "rulePedidoStatusPermitidos",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        },
        {
          "organismName": "pedidoDetalheItems",
          "purpose": "Exibir itens e quantidades do pedido.",
          "rulesApplied": [
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        },
        {
          "organismName": "pedidoDetalhePaymentStatus",
          "purpose": "Exibir situação e forma de pagamento registrada.",
          "rulesApplied": [
            "ruleRegistroPagamentoPedido",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        },
        {
          "organismName": "pedidoDetalheCriticalNotes",
          "purpose": "Destacar observações críticas do pedido.",
          "rulesApplied": [
            "ruleComunicacaoObservacaoCritica",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
