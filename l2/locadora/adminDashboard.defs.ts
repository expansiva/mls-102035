/// <mls fileReference="_102035_/l2/locadora/adminDashboard.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "admin-dashboard",
  "pageName": "adminDashboard",
  "actor": "admin",
  "purpose": "Acesso às áreas de frota, clientes e locações para cadastro e consulta.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "adminDashboardQuickAccessCards",
          "purpose": "Exibir atalhos para gestão de frota, clientes e locações.",
          "rulesApplied": [
            "rule_publico_interno",
            "rule_papel_admin_unico",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "adminDashboardSummaryPanel",
          "purpose": "Apresentar visão geral das áreas principais para consulta rápida.",
          "rulesApplied": [
            "rule_publico_interno",
            "rule_papel_admin_unico",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Corporate & professional"
}
