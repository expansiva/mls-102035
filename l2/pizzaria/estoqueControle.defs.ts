/// <mls fileReference="_102035_/l2/pizzaria/estoqueControle.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "estoque-controle",
  "pageName": "estoqueControle",
  "actor": "staff",
  "purpose": "Controle de estoque e indisponibilidade de produtos.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "estoqueControleListaProdutos",
          "purpose": "Exibir produtos com níveis de estoque.",
          "rulesApplied": [
            "rule-product-unavailability-by-stock"
          ]
        },
        {
          "organismName": "estoqueControleIndisponibilidade",
          "purpose": "Marcar produtos indisponíveis por falta de estoque.",
          "rulesApplied": [
            "rule-product-unavailability-by-stock"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
