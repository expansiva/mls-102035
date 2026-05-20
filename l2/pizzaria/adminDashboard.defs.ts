/// <mls fileReference="_102035_/l2/pizzaria/adminDashboard.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "admin-dashboard",
  "pageName": "adminDashboard",
  "actor": "admin",
  "purpose": "Visão geral administrativa com acesso às configurações e relatórios.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "adminDashboardSummary",
          "purpose": "Apresentar visão geral administrativa e indicadores-chave.",
          "rulesApplied": [
            "rule1",
            "rule2",
            "rule3",
            "rule4"
          ]
        },
        {
          "organismName": "adminDashboardAccessBlocks",
          "purpose": "Exibir blocos de acesso às áreas administrativas e relatórios.",
          "rulesApplied": [
            "rule1",
            "rule2",
            "rule3",
            "rule4"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
