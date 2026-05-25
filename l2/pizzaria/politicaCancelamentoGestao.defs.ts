/// <mls fileReference="_102035_/l2/pizzaria/politicaCancelamentoGestao.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "politica-cancelamento-gestao",
  "pageName": "politicaCancelamentoGestao",
  "actor": "admin",
  "purpose": "Configurar política de cancelamento e reembolso.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "politicaCancelamentoGestaoConfiguracao",
          "purpose": "Definir regras de cancelamento e reembolso.",
          "rulesApplied": [
            "rule-cancellation-refund-policy"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
