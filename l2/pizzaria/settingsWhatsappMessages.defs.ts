/// <mls fileReference="_102035_/l2/pizzaria/settingsWhatsappMessages.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "settings_whatsapp_messages",
  "pageName": "settingsWhatsappMessages",
  "actor": "admin",
  "purpose": "Gerenciar mensagens padrão de WhatsApp por status.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "settingsWhatsappMessagesList",
          "purpose": "Listar mensagens padrão por status.",
          "rulesApplied": [
            "rule_whatsapp_message_policy"
          ]
        },
        {
          "organismName": "settingsWhatsappMessagesEditor",
          "purpose": "Criar, editar e ativar/desativar mensagens.",
          "rulesApplied": [
            "rule_whatsapp_message_policy"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
