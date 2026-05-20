/// <mls fileReference="_102035_/l2/pizzaria/deliveryTracking.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "delivery-tracking",
  "pageName": "deliveryTracking",
  "actor": "staff",
  "purpose": "Acompanhar status de entrega por pedido.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "deliveryTrackingOrderStatus",
          "purpose": "Mostrar status de entrega do pedido selecionado.",
          "rulesApplied": [
            "rule7",
            "rule10"
          ]
        },
        {
          "organismName": "deliveryTrackingTimeline",
          "purpose": "Exibir linha do tempo da entrega e atualizações.",
          "rulesApplied": [
            "rule7",
            "rule10"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
