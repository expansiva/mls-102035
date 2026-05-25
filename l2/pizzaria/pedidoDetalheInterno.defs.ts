/// <mls fileReference="_102035_/l2/pizzaria/pedidoDetalheInterno.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "pedido-detalhe-interno",
  "pageName": "pedidoDetalheInterno",
  "actor": "staff",
  "purpose": "Visualizar e atualizar detalhes do pedido interno e público.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "pedidoDetalheInternoResumoPedido",
          "purpose": "Exibir dados principais do pedido e status atual.",
          "rulesApplied": [
            "rule-order-status",
            "rule-real-time-tracking"
          ]
        },
        {
          "organismName": "pedidoDetalheInternoAcoesPedido",
          "purpose": "Permitir atualização de status, cancelamento e reembolso conforme política.",
          "rulesApplied": [
            "rule-order-status",
            "rule-cancellation-refund-policy",
            "rule-real-time-tracking"
          ]
        },
        {
          "organismName": "pedidoDetalheInternoComunicacaoWhatsApp",
          "purpose": "Apoiar comunicação do pedido via WhatsApp quando necessário.",
          "rulesApplied": [
            "rule-whatsapp-integration"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
