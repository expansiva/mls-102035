/// <mls fileReference="_102035_/l2/locadora/clientesCadastro.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "clientes-cadastro",
  "pageName": "clientesCadastro",
  "actor": "admin",
  "purpose": "Cadastrar cliente com validação de CPF e CNH.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "clientesCadastroForm",
          "purpose": "Coletar dados obrigatórios do cliente com máscaras de CPF e CNH.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_cliente_campos_obrigatorios",
            "rule_bloqueio_cliente_cpf_cnh_invalidos",
            "rule_cpf_cnh_formato_mascara",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "clientesCadastroValidationHint",
          "purpose": "Orientar validações obrigatórias de CPF e CNH.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_bloqueio_cliente_cpf_cnh_invalidos",
            "rule_cpf_cnh_formato_mascara",
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
