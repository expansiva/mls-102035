/// <mls fileReference="_102035_/l2/pizzaria/orderCreatePhone.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "order-create-phone",
  "pageName": "orderCreatePhone",
  "actor": "staff",
  "purpose": "Registrar pedido por telefone com roteiro e checklist.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "orderCreatePhoneCustomerLookup",
          "purpose": "Localizar ou selecionar cliente para pedido telefônico.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10",
            "rule12",
            "rule15",
            "rule16"
          ]
        },
        {
          "organismName": "orderCreatePhoneScript",
          "purpose": "Apresentar roteiro padronizado para atendimento telefônico.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10",
            "rule12",
            "rule15",
            "rule16"
          ]
        },
        {
          "organismName": "orderCreatePhoneForm",
          "purpose": "Montar itens e registrar dados do pedido por telefone.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10",
            "rule12",
            "rule15",
            "rule16"
          ]
        },
        {
          "organismName": "orderCreatePhoneChecklist",
          "purpose": "Registrar confirmação do checklist do pedido telefônico.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10",
            "rule12",
            "rule15",
            "rule16"
          ]
        },
        {
          "organismName": "orderCreatePhoneSummary",
          "purpose": "Exibir resumo do pedido antes da confirmação.",
          "rulesApplied": [
            "rule6",
            "rule9",
            "rule10",
            "rule12",
            "rule15",
            "rule16"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
