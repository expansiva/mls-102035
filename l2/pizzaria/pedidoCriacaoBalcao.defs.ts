/// <mls fileReference="_102035_/l2/pizzaria/pedidoCriacaoBalcao.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "pedido-criacao-balcao",
  "pageName": "pedidoCriacaoBalcao",
  "actor": "staff",
  "purpose": "Criar pedido para balcão.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "pedidoCriacaoBalcaoDadosCliente",
          "purpose": "Registrar dados iniciais do pedido de balcão.",
          "rulesApplied": [
            "rule-order-flow"
          ]
        },
        {
          "organismName": "pedidoCriacaoBalcaoSelecaoItens",
          "purpose": "Selecionar itens do cardápio respeitando indisponibilidade por estoque.",
          "rulesApplied": [
            "rule-order-flow",
            "rule-product-unavailability-by-stock"
          ]
        },
        {
          "organismName": "pedidoCriacaoBalcaoSugestoesCombos",
          "purpose": "Apresentar sugestões de combos e upsell durante a criação.",
          "rulesApplied": [
            "rule-order-flow"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
