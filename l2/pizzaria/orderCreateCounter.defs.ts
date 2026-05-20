/// <mls fileReference="_102035_/l2/pizzaria/orderCreateCounter.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "order-create-counter",
  "pageName": "orderCreateCounter",
  "actor": "staff",
  "purpose": "Registrar pedido no balcão.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "orderCreateCounterCustomerLookup",
          "purpose": "Localizar ou selecionar cliente para o pedido no balcão.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10",
            "rule12"
          ]
        },
        {
          "organismName": "orderCreateCounterForm",
          "purpose": "Montar itens e registrar dados do pedido no balcão.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10",
            "rule12"
          ]
        },
        {
          "organismName": "orderCreateCounterSummary",
          "purpose": "Exibir resumo do pedido antes da confirmação.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10",
            "rule12"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
