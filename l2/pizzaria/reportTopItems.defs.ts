/// <mls fileReference="_102035_/l2/pizzaria/reportTopItems.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "report-top-items",
  "pageName": "reportTopItems",
  "actor": "admin",
  "purpose": "Visualizar relatório de itens mais vendidos.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "reportTopItemsFilters",
          "purpose": "Selecionar período e critérios do relatório de itens.",
          "rulesApplied": [
            "rule11"
          ]
        },
        {
          "organismName": "reportTopItemsResults",
          "purpose": "Exibir ranking de itens mais vendidos.",
          "rulesApplied": [
            "rule11"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
