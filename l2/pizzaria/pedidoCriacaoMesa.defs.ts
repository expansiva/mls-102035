/// <mls fileReference="_102035_/l2/pizzaria/pedidoCriacaoMesa.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "pedido-criacao-mesa",
  "pageName": "pedidoCriacaoMesa",
  "actor": "staff",
  "purpose": "Criar pedido para mesa.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "pedidoCriacaoMesaDadosMesa",
          "purpose": "Registrar identificação da mesa e dados iniciais do pedido.",
          "rulesApplied": [
            "rule-order-flow"
          ]
        },
        {
          "organismName": "pedidoCriacaoMesaSelecaoItens",
          "purpose": "Selecionar itens do cardápio respeitando indisponibilidade por estoque.",
          "rulesApplied": [
            "rule-order-flow",
            "rule-product-unavailability-by-stock"
          ]
        },
        {
          "organismName": "pedidoCriacaoMesaSugestoesCombos",
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
