/// <mls fileReference="_102035_/l2/pizzaria/settingsCancelRefundPolicy.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "settings_cancel_refund_policy",
  "pageName": "settingsCancelRefundPolicy",
  "actor": "admin",
  "purpose": "Definir políticas e motivos de cancelamento e reembolso.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "settingsCancelRefundPolicyDefinition",
          "purpose": "Manter políticas de cancelamento e reembolso.",
          "rulesApplied": [
            "rule_cancel_refund_policy"
          ]
        },
        {
          "organismName": "settingsCancelRefundReasons",
          "purpose": "Cadastrar motivos obrigatórios.",
          "rulesApplied": [
            "rule_cancel_refund_policy"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
