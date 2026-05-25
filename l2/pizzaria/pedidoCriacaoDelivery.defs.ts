/// <mls fileReference="_102035_/l2/pizzaria/pedidoCriacaoDelivery.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "pedido-criacao-delivery",
  "pageName": "pedidoCriacaoDelivery",
  "actor": "staff",
  "purpose": "Criar pedido delivery com zona e taxa configuráveis.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "pedidoCriacaoDeliveryDadosEntrega",
          "purpose": "Registrar dados do cliente e endereço de entrega com zona e taxa.",
          "rulesApplied": [
            "rule-order-flow",
            "rule-delivery-zones-fees"
          ]
        },
        {
          "organismName": "pedidoCriacaoDeliverySelecaoItens",
          "purpose": "Selecionar itens do cardápio respeitando indisponibilidade por estoque.",
          "rulesApplied": [
            "rule-order-flow",
            "rule-product-unavailability-by-stock"
          ]
        },
        {
          "organismName": "pedidoCriacaoDeliverySugestoesCombos",
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
