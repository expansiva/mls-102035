/// <mls fileReference="_102035_/l2/pizzaria/inventoryOverview.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "inventory-overview",
  "pageName": "inventoryOverview",
  "actor": "staff",
  "purpose": "Consultar estoque e alertas de reposição.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "inventoryOverviewStockList",
          "purpose": "Listar níveis de estoque por produto.",
          "rulesApplied": [
            "rule8",
            "rule14"
          ]
        },
        {
          "organismName": "inventoryOverviewAlerts",
          "purpose": "Exibir alertas de reposição e itens críticos.",
          "rulesApplied": [
            "rule8",
            "rule14"
          ]
        },
        {
          "organismName": "inventoryOverviewFilters",
          "purpose": "Filtrar e localizar itens de estoque.",
          "rulesApplied": [
            "rule8",
            "rule14"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
