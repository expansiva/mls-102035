/// <mls fileReference="_102035_/l2/pizzaria/settingsDeliveryFees.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "settings_delivery_fees",
  "pageName": "settingsDeliveryFees",
  "actor": "admin",
  "purpose": "Configurar taxa de entrega por região e valor mínimo.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "settingsDeliveryFeesByRegion",
          "purpose": "Definir taxas de entrega por região.",
          "rulesApplied": [
            "rule_delivery_fee_policy"
          ]
        },
        {
          "organismName": "settingsDeliveryFeesMinimumOrder",
          "purpose": "Definir valor mínimo por região.",
          "rulesApplied": [
            "rule_delivery_fee_policy"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
