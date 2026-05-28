/// <mls fileReference="_102035_/l2/locadora/locacoesCadastro.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "locacoes-cadastro",
  "pageName": "locacoesCadastro",
  "actor": "admin",
  "purpose": "Registrar nova locação com validações de cliente e disponibilidade do veículo.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "locacoesCadastroForm",
          "purpose": "Coletar campos obrigatórios para registrar locação com seguro opcional.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_locacao_campos_obrigatorios",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "locacoesCadastroClienteValidation",
          "purpose": "Indicar validações de CPF e CNH do cliente.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_bloqueio_cliente_cpf_cnh_invalidos",
            "rule_cpf_cnh_formato_mascara",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "locacoesCadastroVeiculoAvailability",
          "purpose": "Alertar indisponibilidade e status válidos do veículo.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_alerta_veiculo_indisponivel",
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
