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

export const definitionPage = {
  "pages": [
    {
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
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.locacoesCadastro.novaLocacao",
                "sourceRoutine": "locadora.locacoesCadastro.createLocacao",
                "fields": [
                  {
                    "entityField": "dataRetirada",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Campo obrigatório conforme rule_locacao_campos_obrigatorios"
                  },
                  {
                    "entityField": "dataDevolucao",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Campo obrigatório conforme rule_locacao_campos_obrigatorios"
                  },
                  {
                    "entityField": "valorDiario",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Campo obrigatório conforme rule_locacao_campos_obrigatorios"
                  },
                  {
                    "entityField": "seguroOpcional",
                    "entity": "locacao",
                    "priority": "optional",
                    "usage": "edit",
                    "priorityReason": "Campo opcional conforme rule_locacao_campos_obrigatorios"
                  },
                  {
                    "entityField": "formaPagamento",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Campo obrigatório conforme rule_locacao_campos_obrigatorios"
                  },
                  {
                    "entityField": "devolucaoPrevista",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Campo obrigatório conforme rule_locacao_campos_obrigatorios"
                  },
                  {
                    "entityField": "placaVeiculo",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Vincula locação ao veículo da frota"
                  },
                  {
                    "entityField": "cpf",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Identifica o cliente que realizou a locação e é necessário para validação de CPF/CNH"
                  }
                ],
                "params": []
              },
              "tempStates": [
                {
                  "stateKey": "ui.locacoesCadastro.form.dataRetirada",
                  "type": "string",
                  "description": "Data de retirada selecionada pelo admin",
                  "priority": "required",
                  "initialValue": ""
                },
                {
                  "stateKey": "ui.locacoesCadastro.form.dataDevolucao",
                  "type": "string",
                  "description": "Data de devolução selecionada pelo admin",
                  "priority": "required",
                  "initialValue": ""
                },
                {
                  "stateKey": "ui.locacoesCadastro.form.valorDiario",
                  "type": "number",
                  "description": "Valor diário informado",
                  "priority": "required",
                  "initialValue": "0"
                },
                {
                  "stateKey": "ui.locacoesCadastro.form.seguroOpcional",
                  "type": "boolean",
                  "description": "Indica se seguro opcional foi selecionado",
                  "priority": "optional",
                  "initialValue": "false"
                },
                {
                  "stateKey": "ui.locacoesCadastro.form.formaPagamento",
                  "type": "string",
                  "description": "Forma de pagamento selecionada",
                  "priority": "required",
                  "initialValue": ""
                },
                {
                  "stateKey": "ui.locacoesCadastro.form.devolucaoPrevista",
                  "type": "string",
                  "description": "Data/hora prevista para devolução",
                  "priority": "required",
                  "initialValue": ""
                },
                {
                  "stateKey": "ui.locacoesCadastro.form.clienteSelecionado",
                  "type": "string",
                  "description": "ID ou CPF do cliente selecionado para locação",
                  "priority": "required",
                  "initialValue": ""
                },
                {
                  "stateKey": "ui.locacoesCadastro.form.veiculoSelecionado",
                  "type": "string",
                  "description": "Placa do veículo selecionado para locação",
                  "priority": "required",
                  "initialValue": ""
                },
                {
                  "stateKey": "ui.locacoesCadastro.form.erroValidacao",
                  "type": "string",
                  "description": "Mensagem de validação geral do formulário",
                  "priority": "optional",
                  "initialValue": ""
                }
              ],
              "computedFields": [
                {
                  "fieldId": "valorTotalEstimado",
                  "derivedFrom": [
                    "ui.locacoesCadastro.form.valorDiario",
                    "ui.locacoesCadastro.form.dataRetirada",
                    "ui.locacoesCadastro.form.dataDevolucao",
                    "ui.locacoesCadastro.form.seguroOpcional"
                  ],
                  "description": "Calcula valor total estimado baseado em dias e seguro opcional",
                  "priority": "recommended"
                },
                {
                  "fieldId": "diasLocacao",
                  "derivedFrom": [
                    "ui.locacoesCadastro.form.dataRetirada",
                    "ui.locacoesCadastro.form.dataDevolucao"
                  ],
                  "description": "Quantidade de dias entre retirada e devolução",
                  "priority": "recommended"
                },
                {
                  "fieldId": "periodoValido",
                  "derivedFrom": [
                    "ui.locacoesCadastro.form.dataRetirada",
                    "ui.locacoesCadastro.form.dataDevolucao"
                  ],
                  "description": "Indica se a data de devolução é posterior à retirada",
                  "priority": "recommended"
                },
                {
                  "fieldId": "devolucaoPrevistaValida",
                  "derivedFrom": [
                    "ui.locacoesCadastro.form.dataRetirada",
                    "ui.locacoesCadastro.form.devolucaoPrevista"
                  ],
                  "description": "Indica se a devolução prevista é compatível com a data de retirada",
                  "priority": "optional"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "voltarListaLocacoes",
                  "target": "/locacoes",
                  "params": [],
                  "priority": "recommended",
                  "navigationType": "internal"
                },
                {
                  "fieldId": "consultarCliente",
                  "target": "/clientes",
                  "params": [],
                  "priority": "optional",
                  "navigationType": "internal"
                },
                {
                  "fieldId": "consultarVeiculo",
                  "target": "/veiculos",
                  "params": [],
                  "priority": "optional",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "locadora.locacoesCadastro.save",
                  "payload": "{dataRetirada,dataDevolucao,valorDiario,seguroOpcional,formaPagamento,devolucaoPrevista,placaVeiculo,clienteId}",
                  "writesState": "db.locacao"
                }
              ]
            },
            {
              "organismName": "locacoesCadastroClienteValidation",
              "purpose": "Indicar validações de CPF e CNH do cliente selecionado antes de confirmar locação.",
              "rulesApplied": [
                "rule_papel_admin_unico",
                "rule_bloqueio_cliente_cpf_cnh_invalidos",
                "rule_cpf_cnh_formato_mascara",
                "rule_idioma_pt_br",
                "rule_tom_profissional_conciso"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.locacoesCadastro.clienteValidacao",
                "sourceRoutine": "locadora.locacoesCadastro.validateCliente",
                "fields": [
                  {
                    "entityField": "nome",
                    "entity": "cliente",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Exibe nome do cliente para confirmação"
                  },
                  {
                    "entityField": "cpf",
                    "entity": "cliente",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "CPF validado conforme rule_cpf_cnh_formato_mascara"
                  },
                  {
                    "entityField": "cnh",
                    "entity": "cliente",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "CNH validada conforme rule_cpf_cnh_formato_mascara"
                  },
                  {
                    "entityField": "telefone",
                    "entity": "cliente",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Contato para emergências"
                  },
                  {
                    "entityField": "email",
                    "entity": "cliente",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Contato alternativo"
                  }
                ],
                "params": [
                  {
                    "paramName": "clienteId",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.locacoesCadastro.form.clienteSelecionado"
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.locacoesCadastro.clienteValidation.cpfValido",
                  "type": "boolean",
                  "description": "Indica se CPF do cliente é válido",
                  "priority": "required",
                  "initialValue": "false"
                },
                {
                  "stateKey": "ui.locacoesCadastro.clienteValidation.cnhValida",
                  "type": "boolean",
                  "description": "Indica se CNH do cliente é válida e não vencida",
                  "priority": "required",
                  "initialValue": "false"
                },
                {
                  "stateKey": "ui.locacoesCadastro.clienteValidation.mensagemErro",
                  "type": "string",
                  "description": "Mensagem de erro de validação do cliente",
                  "priority": "optional",
                  "initialValue": ""
                }
              ],
              "computedFields": [
                {
                  "fieldId": "clienteAptoLocacao",
                  "derivedFrom": [
                    "ui.locacoesCadastro.clienteValidation.cpfValido",
                    "ui.locacoesCadastro.clienteValidation.cnhValida"
                  ],
                  "description": "Indica se cliente está apto para realizar locação (CPF e CNH válidos)",
                  "priority": "required"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "locadora.locacoesCadastro.clienteValidated",
                  "payload": "{clienteId,cpfValido,cnhValida,aptoLocacao}"
                }
              ]
            },
            {
              "organismName": "locacoesCadastroVeiculoAvailability",
              "purpose": "Alertar indisponibilidade e exibir status válidos do veículo selecionado.",
              "rulesApplied": [
                "rule_papel_admin_unico",
                "rule_alerta_veiculo_indisponivel",
                "rule_status_veiculo_valores",
                "rule_idioma_pt_br",
                "rule_tom_profissional_conciso"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.locacoesCadastro.veiculoDisponibilidade",
                "sourceRoutine": "locadora.locacoesCadastro.checkVeiculoAvailability",
                "fields": [
                  {
                    "entityField": "placa",
                    "entity": "veiculo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identificação única do veículo"
                  },
                  {
                    "entityField": "modelo",
                    "entity": "veiculo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Informação relevante para confirmação"
                  },
                  {
                    "entityField": "ano",
                    "entity": "veiculo",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Complementa informação do veículo"
                  },
                  {
                    "entityField": "categoria",
                    "entity": "veiculo",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Categoria para precificação"
                  },
                  {
                    "entityField": "status",
                    "entity": "veiculo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Status determina disponibilidade conforme rule_status_veiculo_valores"
                  },
                  {
                    "entityField": "quilometragem",
                    "entity": "veiculo",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Registro de quilometragem atual"
                  }
                ],
                "params": [
                  {
                    "paramName": "placa",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.locacoesCadastro.form.veiculoSelecionado"
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.locacoesCadastro.veiculoAvailability.disponivel",
                  "type": "boolean",
                  "description": "Indica se veículo está disponível para locação",
                  "priority": "required",
                  "initialValue": "false"
                },
                {
                  "stateKey": "ui.locacoesCadastro.veiculoAvailability.alertaExibido",
                  "type": "boolean",
                  "description": "Indica se alerta de indisponibilidade foi exibido",
                  "priority": "optional",
                  "initialValue": "false"
                },
                {
                  "stateKey": "ui.locacoesCadastro.veiculoAvailability.mensagemAlerta",
                  "type": "string",
                  "description": "Mensagem de alerta sobre status do veículo",
                  "priority": "optional",
                  "initialValue": ""
                }
              ],
              "computedFields": [
                {
                  "fieldId": "veiculoAptoLocacao",
                  "derivedFrom": [
                    "db.locacoesCadastro.veiculoDisponibilidade.status"
                  ],
                  "description": "Verifica se status é disponível conforme rule_status_veiculo_valores",
                  "priority": "required"
                },
                {
                  "fieldId": "motivoIndisponibilidade",
                  "derivedFrom": [
                    "db.locacoesCadastro.veiculoDisponibilidade.status"
                  ],
                  "description": "Descreve motivo da indisponibilidade (locado ou manutenção)",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "consultarOutroVeiculo",
                  "target": "/veiculos",
                  "params": [],
                  "priority": "optional",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "locadora.locacoesCadastro.veiculoChecked",
                  "payload": "{placa,status,disponivel}"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.locacoesCadastro.save",
          "description": "Estado da ação de salvar nova locação",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.locacoesCadastro.validateCliente",
          "description": "Estado da validação do cliente selecionado",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.locacoesCadastro.checkVeiculo",
          "description": "Estado da verificação de disponibilidade do veículo",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.locacoesCadastro.cancel",
          "description": "Estado da ação de cancelar cadastro",
          "values": [
            "idle",
            "confirming",
            "cancelled"
          ]
        }
      ],
      "tempStates": [
        {
          "stateKey": "ui.locacoesCadastro.formDirty",
          "type": "boolean",
          "description": "Indica se formulário possui alterações não salvas",
          "priority": "recommended",
          "initialValue": "false"
        },
        {
          "stateKey": "ui.locacoesCadastro.confirmacaoAberta",
          "type": "boolean",
          "description": "Indica se modal de confirmação está aberto",
          "priority": "optional",
          "initialValue": "false"
        },
        {
          "stateKey": "ui.locacoesCadastro.erroGeral",
          "type": "string",
          "description": "Mensagem de erro geral da página",
          "priority": "optional",
          "initialValue": ""
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/locacoesCadastro.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l2/locadora/module.defs.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/locacoesCadastro.defs.ts).definitionPage]]
\`\`\`

## Contracts
\`\`\`JSON
    [[(_102035_/l2/locadora/web/contracts/locacoesCadastro.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/locacoesCadastro.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/locadora/web/shared/locacoesCadastro.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "_102035_/l1/locadora/layer_2_controllers/locacoesCadastro.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-28T21:00:32Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "locacoesCadastro.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-28T21:00:32Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "locacoesCadastro.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-28T21:00:32Z"
  }
]
