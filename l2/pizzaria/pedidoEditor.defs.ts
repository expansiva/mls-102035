/// <mls fileReference="_102035_/l2/pizzaria/pedidoEditor.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "pedido-editor",
  "pageName": "pedidoEditor",
  "actor": "staff",
  "purpose": "Criar ou atualizar pedido e itens.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "pedidoEditorCustomerAndInfo",
          "purpose": "Registrar dados essenciais do pedido e cliente.",
          "rulesApplied": [
            "ruleProcessosPrincipais",
            "ruleIdiomaPt"
          ]
        },
        {
          "organismName": "pedidoEditorItemsBuilder",
          "purpose": "Adicionar, remover e ajustar itens do pedido.",
          "rulesApplied": [
            "ruleProcessosPrincipais",
            "ruleIdiomaPt"
          ]
        },
        {
          "organismName": "pedidoEditorStatusAndNotes",
          "purpose": "Definir status permitido e observações críticas do pedido.",
          "rulesApplied": [
            "rulePedidoStatusPermitidos",
            "ruleComunicacaoObservacaoCritica",
            "ruleIdiomaPt"
          ]
        },
        {
          "organismName": "pedidoEditorPaymentInfo",
          "purpose": "Registrar forma e status de pagamento quando aplicável.",
          "rulesApplied": [
            "ruleRegistroPagamentoPedido",
            "ruleIdiomaPt"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
