/// <mls fileReference="_102035_/l2/pizzaria/inventoryList.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "inventory_list",
  "pageName": "inventoryList",
  "actor": "staff",
  "purpose": "Consultar e registrar movimentações básicas de estoque.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "inventoryListSummary",
          "purpose": "Exibir visão geral de estoque e alertas básicos.",
          "rulesApplied": [
            "rule_features_core"
          ]
        },
        {
          "organismName": "inventoryListMovements",
          "purpose": "Listar movimentações recentes de estoque.",
          "rulesApplied": [
            "rule_features_core"
          ]
        },
        {
          "organismName": "inventoryListActions",
          "purpose": "Acessar registro de entradas e saídas.",
          "rulesApplied": [
            "rule_features_core"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
