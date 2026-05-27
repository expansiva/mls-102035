/// <mls fileReference="_102035_/l2/pizzaria/menuList.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "menu_list",
  "pageName": "menuList",
  "actor": "admin",
  "purpose": "Gerenciar itens do cardápio.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "menuListFilters",
          "purpose": "Filtrar e buscar itens do cardápio.",
          "rulesApplied": [
            "rule_features_core"
          ]
        },
        {
          "organismName": "menuListResults",
          "purpose": "Listar itens com status ativo/inativo.",
          "rulesApplied": [
            "rule_features_core"
          ]
        },
        {
          "organismName": "menuListActions",
          "purpose": "Ações para criar, editar e ativar/desativar itens.",
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
