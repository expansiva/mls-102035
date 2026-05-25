/// <mls fileReference="_102035_/l2/pizzaria/areaPublicaCheckout.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "area-publica-checkout",
  "pageName": "areaPublicaCheckout",
  "actor": "customer",
  "purpose": "Finalizar pedido online com sugestões de combos e upsell.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "areaPublicaCheckoutResumoPedido",
          "purpose": "Exibir resumo do pedido e dados de entrega.",
          "rulesApplied": [
            "rule-delivery-zones-fees"
          ]
        },
        {
          "organismName": "areaPublicaCheckoutSugestoes",
          "purpose": "Sugerir combos e upsell durante o checkout.",
          "rulesApplied": []
        },
        {
          "organismName": "areaPublicaCheckoutPagamento",
          "purpose": "Registrar pagamento online do pedido.",
          "rulesApplied": [
            "rule-online-payments"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
