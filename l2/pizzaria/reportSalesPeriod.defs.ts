/// <mls fileReference="_102035_/l2/pizzaria/reportSalesPeriod.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "report-sales-period",
  "pageName": "reportSalesPeriod",
  "actor": "admin",
  "purpose": "Visualizar relatório de vendas por período.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "reportSalesPeriodFilters",
          "purpose": "Selecionar período e parâmetros do relatório.",
          "rulesApplied": [
            "rule11"
          ]
        },
        {
          "organismName": "reportSalesPeriodResults",
          "purpose": "Exibir resultados de vendas por período.",
          "rulesApplied": [
            "rule11"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
