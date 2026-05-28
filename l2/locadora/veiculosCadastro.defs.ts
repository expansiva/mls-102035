/// <mls fileReference="_102035_/l2/locadora/veiculosCadastro.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "veiculos-cadastro",
  "pageName": "veiculosCadastro",
  "actor": "admin",
  "purpose": "Cadastrar veículo da frota com dados obrigatórios.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "veiculosCadastroForm",
          "purpose": "Coletar dados obrigatórios do veículo para cadastro.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_frota_campos_obrigatorios",
            "rule_status_veiculo_valores",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "veiculosCadastroStatusInfo",
          "purpose": "Informar valores válidos de status do veículo.",
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
