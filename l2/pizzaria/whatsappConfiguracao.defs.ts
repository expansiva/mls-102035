/// <mls fileReference="_102035_/l2/pizzaria/whatsappConfiguracao.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "whatsapp-configuracao",
  "pageName": "whatsappConfiguracao",
  "actor": "admin",
  "purpose": "Configurar integração com WhatsApp para comunicação de pedidos.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "whatsappConfiguracaoParametros",
          "purpose": "Configurar parâmetros de integração com WhatsApp.",
          "rulesApplied": [
            "rule-whatsapp-integration"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
