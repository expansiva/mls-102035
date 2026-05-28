/// <mls fileReference="_102035_/l2/locadora/clientesLista.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "clientes-lista",
  "pageName": "clientesLista",
  "actor": "admin",
  "purpose": "Consultar clientes cadastrados.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "clientesListaResults",
          "purpose": "Listar clientes cadastrados para consulta.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "clientesListaSearch",
          "purpose": "Permitir busca e refinamento da lista de clientes.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Corporate & professional"
}
