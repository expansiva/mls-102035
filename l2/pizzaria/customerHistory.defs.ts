/// <mls fileReference="_102035_/l2/pizzaria/customerHistory.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "customer-history",
  "pageName": "customerHistory",
  "actor": "staff",
  "purpose": "Consultar histórico de pedidos do cliente.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "customerHistoryProfile",
          "purpose": "Exibir dados do cliente e informações de contexto.",
          "rulesApplied": [
            "rule12"
          ]
        },
        {
          "organismName": "customerHistoryOrders",
          "purpose": "Listar histórico de pedidos do cliente.",
          "rulesApplied": [
            "rule12"
          ]
        },
        {
          "organismName": "customerHistoryFilters",
          "purpose": "Filtrar histórico por período ou status.",
          "rulesApplied": [
            "rule12"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
