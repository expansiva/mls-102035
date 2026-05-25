/// <mls fileReference="_102035_/l2/pizzaria/dashboardMonitoramentoPedidos.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "dashboard-monitoramento-pedidos",
  "pageName": "dashboardMonitoramentoPedidos",
  "actor": "staff",
  "purpose": "Painel único com visão e filtros de todos os pedidos por status e fluxo.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "dashboardMonitoramentoPedidosResumoFiltros",
          "purpose": "Exibir visão geral e filtros por status e fluxo.",
          "rulesApplied": [
            "rule-order-monitoring-dashboard",
            "rule-order-status",
            "rule-order-flow",
            "rule-real-time-tracking"
          ]
        },
        {
          "organismName": "dashboardMonitoramentoPedidosListaPedidos",
          "purpose": "Listar pedidos com atualização em tempo real.",
          "rulesApplied": [
            "rule-order-monitoring-dashboard",
            "rule-order-status",
            "rule-order-flow",
            "rule-real-time-tracking"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
