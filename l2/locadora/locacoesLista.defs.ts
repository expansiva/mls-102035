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

export const definitionPage = {
  "pages": [
    {
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
                "rule_tom_profissional_conciso",
                "rule_locacao_campos_obrigatorios",
                "rule_alerta_veiculo_indisponivel"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.locacao[]",
                "sourceRoutine": "locadora.locacoesLista.listLocacoes",
                "itemFields": [
                  {
                    "entityField": "dataRetirada",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Campo obrigatório para identificar início da locação."
                  },
                  {
                    "entityField": "dataDevolucao",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Campo obrigatório para identificar término real."
                  },
                  {
                    "entityField": "devolucaoPrevista",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Campo obrigatório para previsão de retorno."
                  },
                  {
                    "entityField": "valorDiario",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Base para cálculo de valores."
                  },
                  {
                    "entityField": "seguroOpcional",
                    "entity": "locacao",
                    "priority": "optional",
                    "usage": "display",
                    "priorityReason": "Campo opcional conforme regra de locação."
                  },
                  {
                    "entityField": "formaPagamento",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Campo obrigatório da locação."
                  },
                  {
                    "entityField": "placaVeiculo",
                    "entity": "locacao",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identifica o veículo locado."
                  }
                ],
                "params": [
                  {
                    "paramName": "placaVeiculo",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.locacoesLista.filter.placaVeiculo"
                    }
                  },
                  {
                    "paramName": "dataRetiradaInicio",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.locacoesLista.filter.dataRetiradaInicio"
                    }
                  },
                  {
                    "paramName": "dataRetiradaFim",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.locacoesLista.filter.dataRetiradaFim"
                    }
                  },
                  {
                    "paramName": "devolucaoPrevistaInicio",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.locacoesLista.filter.devolucaoPrevistaInicio"
                    }
                  },
                  {
                    "paramName": "devolucaoPrevistaFim",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.locacoesLista.filter.devolucaoPrevistaFim"
                    }
                  },
                  {
                    "paramName": "formaPagamento",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.locacoesLista.filter.formaPagamento"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.locacoesLista.selectedLocacaoId",
                  "type": "string",
                  "description": "Identificador da locação selecionada na lista.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.locacoesLista.sortBy",
                  "type": "string",
                  "description": "Campo de ordenação da lista.",
                  "priority": "optional",
                  "initialValue": "'dataRetirada'"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "locacoesLista.totalDiasPrevistos",
                  "derivedFrom": [
                    "locacao.dataRetirada",
                    "locacao.devolucaoPrevista"
                  ],
                  "description": "Quantidade de dias entre retirada e devolução prevista.",
                  "priority": "recommended"
                },
                {
                  "fieldId": "locacoesLista.valorPrevisto",
                  "derivedFrom": [
                    "locacao.valorDiario",
                    "locacoesLista.totalDiasPrevistos"
                  ],
                  "description": "Valor previsto da locação (diária x dias).",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "locadora.locacoesLista.select",
                  "payload": "{locacaoId}",
                  "writesState": "ui.locacoesLista.selectedLocacaoId"
                }
              ]
            },
            {
              "organismName": "locacoesListaSearch",
              "purpose": "Permitir busca e refinamento da lista de locações.",
              "rulesApplied": [
                "rule_papel_admin_unico",
                "rule_idioma_pt_br",
                "rule_tom_profissional_conciso"
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": [
                  {
                    "entity": "locacao",
                    "entityField": "placaVeiculo",
                    "stateKey": "ui.locacoesLista.filter.placaVeiculo",
                    "priority": "recommended",
                    "usage": "filter",
                    "priorityReason": "Filtro direto por veículo."
                  },
                  {
                    "entity": "locacao",
                    "entityField": "dataRetirada",
                    "stateKey": "ui.locacoesLista.filter.dataRetiradaInicio",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Refina por período de retirada."
                  },
                  {
                    "entity": "locacao",
                    "entityField": "dataRetirada",
                    "stateKey": "ui.locacoesLista.filter.dataRetiradaFim",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Refina por período de retirada."
                  },
                  {
                    "entity": "locacao",
                    "entityField": "devolucaoPrevista",
                    "stateKey": "ui.locacoesLista.filter.devolucaoPrevistaInicio",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Refina por previsão de devolução."
                  },
                  {
                    "entity": "locacao",
                    "entityField": "devolucaoPrevista",
                    "stateKey": "ui.locacoesLista.filter.devolucaoPrevistaFim",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Refina por previsão de devolução."
                  },
                  {
                    "entity": "locacao",
                    "entityField": "formaPagamento",
                    "stateKey": "ui.locacoesLista.filter.formaPagamento",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Permite filtrar por forma de pagamento."
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.locacoesLista.filter.placaVeiculo",
                  "type": "string",
                  "description": "Filtro por placa do veículo.",
                  "priority": "recommended"
                },
                {
                  "stateKey": "ui.locacoesLista.filter.dataRetiradaInicio",
                  "type": "string",
                  "description": "Data inicial de retirada para filtro.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.locacoesLista.filter.dataRetiradaFim",
                  "type": "string",
                  "description": "Data final de retirada para filtro.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.locacoesLista.filter.devolucaoPrevistaInicio",
                  "type": "string",
                  "description": "Data inicial da devolução prevista para filtro.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.locacoesLista.filter.devolucaoPrevistaFim",
                  "type": "string",
                  "description": "Data final da devolução prevista para filtro.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.locacoesLista.filter.formaPagamento",
                  "type": "string",
                  "description": "Filtro por forma de pagamento.",
                  "priority": "optional"
                }
              ],
              "computedFields": [],
              "navigationFields": [],
              "emits": [
                {
                  "event": "locadora.locacoesLista.applyFilters",
                  "payload": "{placaVeiculo,dataRetiradaInicio,dataRetiradaFim,devolucaoPrevistaInicio,devolucaoPrevistaFim,formaPagamento}"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.locacoesLista.load",
          "description": "Carregamento da lista de locações.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.locacoesLista.filtering",
          "description": "Aplicação de filtros de busca.",
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
          "stateKey": "ui.locacoesLista.pagination.page",
          "type": "number",
          "description": "Página atual da listagem.",
          "priority": "optional",
          "initialValue": "1"
        },
        {
          "stateKey": "ui.locacoesLista.pagination.pageSize",
          "type": "number",
          "description": "Quantidade de registros por página.",
          "priority": "optional",
          "initialValue": "20"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/locacoesLista.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l2/locadora/module.defs.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/locacoesLista.defs.ts).definitionPage]]
\`\`\`

## Contracts
\`\`\`JSON
    [[(_102035_/l2/locadora/web/contracts/locacoesLista.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/locacoesLista.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/locadora/web/shared/locacoesLista.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "_102035_/l1/locadora/layer_2_controllers/locacoesLista.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-28T20:21:41Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "locacoesLista.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-28T20:21:41Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "locacoesLista.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-28T20:21:41Z"
  }
]
