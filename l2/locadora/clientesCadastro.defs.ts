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

export const definitionPage = {
  "pages": [
    {
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
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": [
                  {
                    "entity": "cliente",
                    "entityField": "nome",
                    "stateKey": "db.cliente.nome",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Campo obrigatório para cadastro do cliente."
                  },
                  {
                    "entity": "cliente",
                    "entityField": "cpf",
                    "stateKey": "db.cliente.cpf",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Obrigatório e sujeito a validação e máscara."
                  },
                  {
                    "entity": "cliente",
                    "entityField": "cnh",
                    "stateKey": "db.cliente.cnh",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Obrigatório, precisa ser válido e não vencido."
                  },
                  {
                    "entity": "cliente",
                    "entityField": "telefone",
                    "stateKey": "db.cliente.telefone",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Obrigatório para contato."
                  },
                  {
                    "entity": "cliente",
                    "entityField": "email",
                    "stateKey": "db.cliente.email",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Obrigatório para contato e confirmação."
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.clientesCadastro.cpfMask",
                  "type": "string",
                  "description": "Máscara aplicada ao CPF durante digitação.",
                  "priority": "recommended",
                  "initialValue": "000.000.000-00"
                },
                {
                  "stateKey": "ui.clientesCadastro.cnhMask",
                  "type": "string",
                  "description": "Máscara aplicada à CNH durante digitação.",
                  "priority": "recommended",
                  "initialValue": "00000000000"
                },
                {
                  "stateKey": "ui.clientesCadastro.formDirty",
                  "type": "boolean",
                  "description": "Indica se o formulário possui alterações não salvas.",
                  "priority": "optional",
                  "initialValue": "false"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "cpfValido",
                  "derivedFrom": [
                    "db.cliente.cpf"
                  ],
                  "description": "Resultado da validação de formato e dígito verificador do CPF.",
                  "priority": "required"
                },
                {
                  "fieldId": "cnhValida",
                  "derivedFrom": [
                    "db.cliente.cnh"
                  ],
                  "description": "Resultado da validação de formato e vencimento da CNH.",
                  "priority": "required"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "locadora.clientesCadastro.save",
                  "payload": "{cliente:{nome,cpf,cnh,telefone,email}}",
                  "writesState": "ui.clientesCadastro.save"
                },
                {
                  "event": "locadora.clientesCadastro.cancel",
                  "payload": "{}",
                  "writesState": "ui.clientesCadastro.cancel"
                }
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
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": [
                  {
                    "entity": "cliente",
                    "entityField": "cpf",
                    "stateKey": "db.cliente.cpf",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Exibir estado de validação do CPF."
                  },
                  {
                    "entity": "cliente",
                    "entityField": "cnh",
                    "stateKey": "db.cliente.cnh",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Exibir estado de validação da CNH."
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.clientesCadastro.showValidationHint",
                  "type": "boolean",
                  "description": "Controla a exibição das mensagens de validação.",
                  "priority": "optional",
                  "initialValue": "true"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "mensagemCPF",
                  "derivedFrom": [
                    "db.cliente.cpf"
                  ],
                  "description": "Mensagem de validação contextual do CPF.",
                  "priority": "recommended"
                },
                {
                  "fieldId": "mensagemCNH",
                  "derivedFrom": [
                    "db.cliente.cnh"
                  ],
                  "description": "Mensagem de validação contextual da CNH.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": []
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.clientesCadastro.save",
          "description": "Estado da ação de salvar cliente.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.clientesCadastro.cancel",
          "description": "Estado da ação de cancelamento do cadastro.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.clientesCadastro.validate",
          "description": "Estado da validação de CPF e CNH.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        }
      ],
      "tempStates": [
        {
          "stateKey": "ui.clientesCadastro.activeTab",
          "type": "string",
          "description": "Aba ativa no cadastro, se aplicável.",
          "priority": "future",
          "initialValue": "dados"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/clientesCadastro.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l2/locadora/module.defs.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/clientesCadastro.defs.ts).definitionPage]]
\`\`\`

## Contracts
\`\`\`JSON
    [[(_102035_/l2/locadora/web/contracts/clientesCadastro.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/clientesCadastro.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/locadora/web/shared/clientesCadastro.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "_102035_/l1/locadora/layer_2_controllers/clientesCadastro.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-28T19:54:53Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "clientesCadastro.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-28T19:54:53Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "clientesCadastro.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-28T19:54:53Z"
  }
]
