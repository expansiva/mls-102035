/// <mls fileReference="_102035_/l2/pizzaria/staffDashboard.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "staff_dashboard",
  "pageName": "staffDashboard",
  "actor": "staff",
  "purpose": "Oferecer visão geral do dia e atalhos operacionais conforme perfil.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "staffDashboardSummary",
          "purpose": "Exibir indicadores e visão geral do dia.",
          "rulesApplied": [
            "rule_features_core",
            "rule_target_business",
            "rule_language_ptbr",
            "rule_tone"
          ]
        },
        {
          "organismName": "staffDashboardShortcuts",
          "purpose": "Apresentar atalhos para pedidos, produção e caixa.",
          "rulesApplied": [
            "rule_features_core",
            "rule_target_business",
            "rule_language_ptbr",
            "rule_tone"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
