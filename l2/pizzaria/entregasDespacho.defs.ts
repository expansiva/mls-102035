/// <mls fileReference="_102035_/l2/pizzaria/entregasDespacho.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "entregas-despacho",
  "pageName": "entregasDespacho",
  "actor": "staff",
  "purpose": "Atribuir entregador e acompanhar entregas em andamento.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "entregasDespachoFilaEntregas",
          "purpose": "Listar entregas pendentes e em andamento.",
          "rulesApplied": [
            "rule-order-flow",
            "rule-order-status",
            "rule-target-time-per-stage"
          ]
        },
        {
          "organismName": "entregasDespachoAtribuicaoEntregador",
          "purpose": "Atribuir entregador a pedidos de delivery.",
          "rulesApplied": [
            "rule-order-flow",
            "rule-order-status"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
