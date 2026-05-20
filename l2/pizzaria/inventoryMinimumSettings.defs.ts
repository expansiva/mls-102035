/// <mls fileReference="_102035_/l2/pizzaria/inventoryMinimumSettings.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "inventory-minimum-settings",
  "pageName": "inventoryMinimumSettings",
  "actor": "admin",
  "purpose": "Definir estoque mínimo e alertas de reposição.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "inventoryMinimumSettingsTable",
          "purpose": "Definir estoques mínimos por produto.",
          "rulesApplied": [
            "rule8",
            "rule14"
          ]
        },
        {
          "organismName": "inventoryMinimumSettingsAlerts",
          "purpose": "Configurar parâmetros de alertas de reposição.",
          "rulesApplied": [
            "rule8",
            "rule14"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
