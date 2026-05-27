/// <mls fileReference="_102035_/l2/pizzaria/salesReports.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "sales_reports",
  "pageName": "salesReports",
  "actor": "admin",
  "purpose": "Relatórios de vendas por dia e por produto.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "salesReportsFilters",
          "purpose": "Selecionar período e tipo de relatório.",
          "rulesApplied": [
            "rule_reports_sales"
          ]
        },
        {
          "organismName": "salesReportsResults",
          "purpose": "Exibir relatório diário e por produto.",
          "rulesApplied": [
            "rule_reports_sales"
          ]
        },
        {
          "organismName": "salesReportsExport",
          "purpose": "Disponibilizar ações de emissão/compartilhamento do relatório.",
          "rulesApplied": [
            "rule_reports_sales"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
