/// <mls fileReference="_102035_/l2/pizzaria/financialSummary.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "financial_summary",
  "pageName": "financialSummary",
  "actor": "admin",
  "purpose": "Resumo simples de vendas e totais.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "financialSummaryTotals",
          "purpose": "Exibir totais de vendas e indicadores básicos.",
          "rulesApplied": [
            "rule_features_core",
            "rule_reports_sales"
          ]
        },
        {
          "organismName": "financialSummaryByChannel",
          "purpose": "Apresentar distribuição por canal de venda.",
          "rulesApplied": [
            "rule_features_core",
            "rule_reports_sales"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
