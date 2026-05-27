/// <mls fileReference="_102035_/l2/pizzaria/cashRegister.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "cash_register",
  "pageName": "cashRegister",
  "actor": "staff",
  "purpose": "Gerenciar abertura, sangria e fechamento do caixa diário.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "cashRegisterStatus",
          "purpose": "Exibir status atual do caixa e valores do dia.",
          "rulesApplied": [
            "rule_cash_control"
          ]
        },
        {
          "organismName": "cashRegisterOperations",
          "purpose": "Registrar abertura, sangria e fechamento.",
          "rulesApplied": [
            "rule_cash_control"
          ]
        },
        {
          "organismName": "cashRegisterHistory",
          "purpose": "Listar operações do caixa no dia.",
          "rulesApplied": [
            "rule_cash_control"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}

export const definitionPage = {
  "pages": [
    {
      "screenId": "cash_register",
      "pageName": "cashRegister",
      "actor": "staff",
      "purpose": "Gerenciar abertura, sangria e fechamento do caixa diário.",
      "sections": [
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "cashRegisterStatus",
              "purpose": "Exibir status atual do caixa e valores do dia.",
              "rulesApplied": [
                "rule_cash_control"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.caixaDia",
                "sourceRoutine": "pizzaria.getCaixaDia",
                "fields": [
                  {
                    "entityField": "data",
                    "entity": "Caixa",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identifica o dia do caixa atual."
                  },
                  {
                    "entityField": "status",
                    "entity": "Caixa",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Indica se o caixa está aberto ou fechado."
                  },
                  {
                    "entityField": "valorAbertura",
                    "entity": "Caixa",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Valor de abertura do caixa do dia."
                  },
                  {
                    "entityField": "valorFechamento",
                    "entity": "Caixa",
                    "priority": "optional",
                    "usage": "display",
                    "priorityReason": "Disponível após fechamento."
                  }
                ],
                "params": [
                  {
                    "paramName": "data",
                    "type": "date",
                    "source": {
                      "from": "context",
                      "contextKey": "actualDate"
                    }
                  }
                ]
              },
              "tempStates": [],
              "computedFields": [
                {
                  "fieldId": "saldoAtual",
                  "derivedFrom": [
                    "db.caixaDia.valorAbertura",
                    "db.movimentosCaixaDia[].tipo",
                    "db.movimentosCaixaDia[].valor"
                  ],
                  "description": "Calcula o saldo atual somando entradas e subtraindo sangrias a partir da abertura.",
                  "priority": "recommended"
                },
                {
                  "fieldId": "totalSangrias",
                  "derivedFrom": [
                    "db.movimentosCaixaDia[].tipo",
                    "db.movimentosCaixaDia[].valor"
                  ],
                  "description": "Totaliza o valor de sangrias realizadas no dia.",
                  "priority": "optional"
                },
                {
                  "fieldId": "totalEntradas",
                  "derivedFrom": [
                    "db.movimentosCaixaDia[].tipo",
                    "db.movimentosCaixaDia[].valor"
                  ],
                  "description": "Totaliza entradas manuais registradas no dia.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "refreshCaixaStatus",
                  "payload": "{data: context.actualDate}",
                  "writesState": "db.caixaDia"
                }
              ]
            },
            {
              "organismName": "cashRegisterOperations",
              "purpose": "Registrar abertura, sangria e fechamento.",
              "rulesApplied": [
                "rule_cash_control"
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": [
                  {
                    "entity": "Caixa",
                    "entityField": "valorAbertura",
                    "stateKey": "db.caixa.valorAbertura",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Necessário para abrir o caixa."
                  },
                  {
                    "entity": "Caixa",
                    "entityField": "valorFechamento",
                    "stateKey": "db.caixa.valorFechamento",
                    "priority": "optional",
                    "usage": "edit",
                    "priorityReason": "Informado no fechamento."
                  },
                  {
                    "entity": "MovimentoCaixa",
                    "entityField": "valor",
                    "stateKey": "db.movimentoCaixa.valor",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Valor de sangria ou entrada."
                  },
                  {
                    "entity": "MovimentoCaixa",
                    "entityField": "tipo",
                    "stateKey": "db.movimentoCaixa.tipo",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Define se é entrada ou sangria."
                  },
                  {
                    "entity": "MovimentoCaixa",
                    "entityField": "observacao",
                    "stateKey": "db.movimentoCaixa.observacao",
                    "priority": "optional",
                    "usage": "edit"
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.cashRegister.operationMode",
                  "type": "string",
                  "description": "Modo selecionado: abrir, sangria ou fechar.",
                  "priority": "required",
                  "initialValue": "'abrir'"
                },
                {
                  "stateKey": "ui.cashRegister.confirmationOpen",
                  "type": "boolean",
                  "description": "Confirmação de abertura do caixa.",
                  "priority": "recommended",
                  "initialValue": "false"
                },
                {
                  "stateKey": "ui.cashRegister.confirmationClose",
                  "type": "boolean",
                  "description": "Confirmação de fechamento do caixa.",
                  "priority": "recommended",
                  "initialValue": "false"
                },
                {
                  "stateKey": "ui.cashRegister.observacaoSangria",
                  "type": "string",
                  "description": "Observação opcional para sangria.",
                  "priority": "optional",
                  "initialValue": "''"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "podeAbrir",
                  "derivedFrom": [
                    "db.caixaDia.status"
                  ],
                  "description": "Permite abertura apenas se o caixa estiver fechado ou inexistente no dia.",
                  "priority": "required"
                },
                {
                  "fieldId": "podeSangria",
                  "derivedFrom": [
                    "db.caixaDia.status"
                  ],
                  "description": "Permite sangria somente com caixa aberto.",
                  "priority": "required"
                },
                {
                  "fieldId": "podeFechar",
                  "derivedFrom": [
                    "db.caixaDia.status"
                  ],
                  "description": "Permite fechamento somente com caixa aberto.",
                  "priority": "required"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "abrirCaixa",
                  "payload": "{data: context.actualDate, valorAbertura: db.caixa.valorAbertura}",
                  "writesState": "ui.cashRegister.openState"
                },
                {
                  "event": "registrarSangria",
                  "payload": "{caixaId: db.caixaDia.id, tipo: db.movimentoCaixa.tipo, valor: db.movimentoCaixa.valor, observacao: ui.cashRegister.observacaoSangria}",
                  "writesState": "ui.cashRegister.sangriaState"
                },
                {
                  "event": "fecharCaixa",
                  "payload": "{caixaId: db.caixaDia.id, valorFechamento: db.caixa.valorFechamento}",
                  "writesState": "ui.cashRegister.closeState"
                }
              ]
            },
            {
              "organismName": "cashRegisterHistory",
              "purpose": "Listar operações do caixa no dia.",
              "rulesApplied": [
                "rule_cash_control"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.movimentosCaixaDia[]",
                "sourceRoutine": "pizzaria.listMovimentosCaixaDia",
                "itemFields": [
                  {
                    "entityField": "dataHora",
                    "entity": "MovimentoCaixa",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identifica o momento da operação."
                  },
                  {
                    "entityField": "tipo",
                    "entity": "MovimentoCaixa",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Distingue entrada e sangria."
                  },
                  {
                    "entityField": "valor",
                    "entity": "MovimentoCaixa",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Valor movimentado."
                  },
                  {
                    "entityField": "observacao",
                    "entity": "MovimentoCaixa",
                    "priority": "optional",
                    "usage": "display"
                  }
                ],
                "params": [
                  {
                    "paramName": "data",
                    "type": "date",
                    "source": {
                      "from": "context",
                      "contextKey": "actualDate"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.cashRegisterHistory.filterTipo",
                  "type": "string",
                  "description": "Filtrar operações por tipo.",
                  "priority": "optional",
                  "initialValue": "'todos'"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "quantidadeOperacoes",
                  "derivedFrom": [
                    "db.movimentosCaixaDia[]"
                  ],
                  "description": "Quantidade total de operações no dia.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "refreshMovimentos",
                  "payload": "{data: context.actualDate}",
                  "writesState": "db.movimentosCaixaDia[]"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.cashRegister.openState",
          "description": "Estado da abertura do caixa.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.cashRegister.sangriaState",
          "description": "Estado do registro de sangria/entrada.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.cashRegister.closeState",
          "description": "Estado do fechamento do caixa.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.cashRegister.loadState",
          "description": "Estado de carregamento do caixa e movimentos do dia.",
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
          "stateKey": "ui.cashRegister.day",
          "type": "date",
          "description": "Dia selecionado para visualização do caixa.",
          "priority": "recommended",
          "initialValue": "context.actualDate"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/cashRegister.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/cashRegister.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/cashRegister.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/cashRegister.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controllers/cashRegister.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-27T18:48:53Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "cashRegister.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-27T18:48:53Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "cashRegister.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-27T18:48:53Z"
  }
]
