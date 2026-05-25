/// <mls fileReference="_102035_/l2/pizzaria/caixaPagamentos.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "caixa-pagamentos",
  "pageName": "caixaPagamentos",
  "actor": "staff",
  "purpose": "Registrar e conferir pagamentos online e reembolsos.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "caixaPagamentosListaTransacoes",
          "purpose": "Listar pagamentos e pendências para conferência.",
          "rulesApplied": [
            "rule-online-payments"
          ]
        },
        {
          "organismName": "caixaPagamentosReembolsos",
          "purpose": "Registrar reembolsos conforme política de cancelamento.",
          "rulesApplied": [
            "rule-cancellation-refund-policy",
            "rule-online-payments"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
