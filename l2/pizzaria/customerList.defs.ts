/// <mls fileReference="_102035_/l2/pizzaria/customerList.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "customer-list",
  "pageName": "customerList",
  "actor": "staff",
  "purpose": "Listar clientes cadastrados.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "customerListDirectory",
          "purpose": "Listar clientes e permitir acesso ao cadastro.",
          "rulesApplied": [
            "rule12"
          ]
        },
        {
          "organismName": "customerListFilters",
          "purpose": "Filtrar e localizar clientes.",
          "rulesApplied": [
            "rule12"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
