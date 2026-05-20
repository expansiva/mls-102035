/// <mls fileReference="_102035_/l2/pizzaria/staffDashboard.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "staff-dashboard",
  "pageName": "staffDashboard",
  "actor": "staff",
  "purpose": "Visão geral operacional para atendente, pizzaiolo e entregador.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "staffDashboardOperationalSummary",
          "purpose": "Apresentar indicadores e acessos operacionais de pedidos, entregas e estoque.",
          "rulesApplied": [
            "rule1",
            "rule2",
            "rule3",
            "rule4"
          ]
        },
        {
          "organismName": "staffDashboardQuickActions",
          "purpose": "Exibir ações rápidas para fluxos operacionais principais.",
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
