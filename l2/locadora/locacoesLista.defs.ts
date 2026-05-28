/// <mls fileReference="_102035_/l2/locadora/locacoesLista.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "locacoes-lista",
  "pageName": "locacoesLista",
  "actor": "admin",
  "purpose": "Consultar locações registradas.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "locacoesListaResults",
          "purpose": "Listar locações registradas para consulta.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "locacoesListaSearch",
          "purpose": "Permitir busca e refinamento da lista de locações.",
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
