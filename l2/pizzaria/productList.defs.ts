/// <mls fileReference="_102035_/l2/pizzaria/productList.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "product-list",
  "pageName": "productList",
  "actor": "admin",
  "purpose": "Listar e acessar produtos cadastrados.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "productListCatalog",
          "purpose": "Listar produtos com opções de acesso para edição.",
          "rulesApplied": [
            "rule5"
          ]
        },
        {
          "organismName": "productListFilters",
          "purpose": "Permitir filtrar e localizar produtos no catálogo.",
          "rulesApplied": [
            "rule5"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
