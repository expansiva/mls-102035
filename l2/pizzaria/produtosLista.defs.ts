/// <mls fileReference="_102035_/l2/pizzaria/produtosLista.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "produtos-lista",
  "pageName": "produtosLista",
  "actor": "admin",
  "purpose": "Gerenciar catálogo de produtos do cardápio.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "produtosListaCatalogo",
          "purpose": "Exibir catálogo de produtos com ações de gestão.",
          "rulesApplied": [
            "rule-required-functionalities",
            "rule-product-unavailability-by-stock"
          ]
        },
        {
          "organismName": "produtosListaIndisponibilidade",
          "purpose": "Sinalizar indisponibilidade por estoque no catálogo.",
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
