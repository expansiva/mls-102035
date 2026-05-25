/// <mls fileReference="_102035_/l2/pizzaria/areaPublicaCardapio.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "area-publica-cardapio",
  "pageName": "areaPublicaCardapio",
  "actor": "customer",
  "purpose": "Explorar cardápio público e iniciar pedido online.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "areaPublicaCardapioCatalogo",
          "purpose": "Exibir cardápio público com disponibilidade de produtos.",
          "rulesApplied": [
            "rule-internal-with-public-area",
            "rule-product-unavailability-by-stock"
          ]
        },
        {
          "organismName": "areaPublicaCardapioCarrinho",
          "purpose": "Permitir iniciar e revisar pedido online.",
          "rulesApplied": [
            "rule-internal-with-public-area"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
