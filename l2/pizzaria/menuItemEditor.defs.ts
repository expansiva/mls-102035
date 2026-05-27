/// <mls fileReference="_102035_/l2/pizzaria/menuItemEditor.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "menu_item_editor",
  "pageName": "menuItemEditor",
  "actor": "admin",
  "purpose": "Criar ou editar item do cardápio.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "menuItemEditorForm",
          "purpose": "Capturar dados do item do cardápio.",
          "rulesApplied": [
            "rule_features_core"
          ]
        },
        {
          "organismName": "menuItemEditorStatus",
          "purpose": "Definir disponibilidade do item.",
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
