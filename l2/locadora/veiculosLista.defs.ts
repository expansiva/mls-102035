/// <mls fileReference="_102035_/l2/locadora/veiculosLista.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "veiculos-lista",
  "pageName": "veiculosLista",
  "actor": "admin",
  "purpose": "Consultar e filtrar veículos cadastrados.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "veiculosListaFilters",
          "purpose": "Permitir filtro de veículos por status.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_status_veiculo_valores",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "veiculosListaResults",
          "purpose": "Listar veículos cadastrados para consulta.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_status_veiculo_valores",
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
