/// <mls fileReference="_102035_/l2/pizzaria/serviceTimeTargets.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "service-time-targets",
  "pageName": "serviceTimeTargets",
  "actor": "admin",
  "purpose": "Definir e consultar metas de tempo por status do pedido.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "serviceTimeTargetsTable",
          "purpose": "Configurar metas de tempo por status do pedido.",
          "rulesApplied": [
            "rule13",
            "rule10"
          ]
        },
        {
          "organismName": "serviceTimeTargetsOverview",
          "purpose": "Visualizar metas atuais e comparação com status.",
          "rulesApplied": [
            "rule13",
            "rule10"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
