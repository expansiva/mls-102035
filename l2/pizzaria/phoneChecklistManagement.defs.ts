/// <mls fileReference="_102035_/l2/pizzaria/phoneChecklistManagement.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "phone-checklist-management",
  "pageName": "phoneChecklistManagement",
  "actor": "admin",
  "purpose": "Definir e ativar checklist de confirmação para pedidos por telefone.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "phoneChecklistManagementList",
          "purpose": "Listar itens do checklist e seu estado de ativação.",
          "rulesApplied": [
            "rule16"
          ]
        },
        {
          "organismName": "phoneChecklistManagementEditor",
          "purpose": "Criar e atualizar itens do checklist telefônico.",
          "rulesApplied": [
            "rule16"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
