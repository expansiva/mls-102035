/// <mls fileReference="_102035_/l2/pizzaria/settingsDelivery.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "settings_delivery",
  "pageName": "settingsDelivery",
  "actor": "admin",
  "purpose": "Configurar janelas de entrega e tempos estimados por canal.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "settingsDeliveryWindows",
          "purpose": "Configurar janelas de entrega por canal.",
          "rulesApplied": [
            "rule_delivery_windows"
          ]
        },
        {
          "organismName": "settingsDeliveryEta",
          "purpose": "Definir tempos estimados padrão por canal.",
          "rulesApplied": [
            "rule_delivery_windows"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
