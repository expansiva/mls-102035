/// <mls fileReference="_102035_/l2/pizzaria/productEditor.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "product-editor",
  "pageName": "productEditor",
  "actor": "admin",
  "purpose": "Criar ou atualizar produto.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "productEditorForm",
          "purpose": "Cadastrar ou atualizar dados do produto.",
          "rulesApplied": [
            "rule5"
          ]
        },
        {
          "organismName": "productEditorPricingAndAvailability",
          "purpose": "Registrar informações de preço e disponibilidade do produto.",
          "rulesApplied": [
            "rule5"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
