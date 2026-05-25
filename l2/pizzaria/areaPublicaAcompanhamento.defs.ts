/// <mls fileReference="_102035_/l2/pizzaria/areaPublicaAcompanhamento.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "area-publica-acompanhamento",
  "pageName": "areaPublicaAcompanhamento",
  "actor": "customer",
  "purpose": "Acompanhar status do pedido em tempo real.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "areaPublicaAcompanhamentoStatus",
          "purpose": "Exibir status atual do pedido em tempo real.",
          "rulesApplied": [
            "rule-real-time-tracking",
            "rule-order-status"
          ]
        },
        {
          "organismName": "areaPublicaAcompanhamentoLinhaTempo",
          "purpose": "Apresentar fluxo do pedido com atualização contínua.",
          "rulesApplied": [
            "rule-real-time-tracking",
            "rule-order-status"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
