/// <mls fileReference="_102035_/l2/pizzaria/caixaPagamentos.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "caixa-pagamentos",
  "pageName": "caixaPagamentos",
  "actor": "staff",
  "purpose": "Registrar e conferir pagamentos online e reembolsos.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "caixaPagamentosListaTransacoes",
          "purpose": "Listar pagamentos e pendências para conferência.",
          "rulesApplied": [
            "rule-online-payments"
          ]
        },
        {
          "organismName": "caixaPagamentosReembolsos",
          "purpose": "Registrar reembolsos conforme política de cancelamento.",
          "rulesApplied": [
            "rule-cancellation-refund-policy",
            "rule-online-payments"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}

export const definitionPage = {
  "pages": [
    {
      "screenId": "caixa-pagamentos",
      "pageName": "caixaPagamentos",
      "actor": "staff",
      "purpose": "Registrar e conferir pagamentos online e reembolsos.",
      "sections": [
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "caixaPagamentosListaTransacoes",
              "purpose": "Listar pagamentos e pendências para conferência.",
              "rulesApplied": [
                "rule-online-payments",
                "rule-cancellation-refund-policy"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.Pagamento[]",
                "sourceRoutine": "pizzaria.listPagamentos",
                "itemFields": [
                  {
                    "entity": "Pagamento",
                    "entityField": "id",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identificação da transação."
                  },
                  {
                    "entity": "Pagamento",
                    "entityField": "pedidoId",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Vínculo com pedido para conferência."
                  },
                  {
                    "entity": "Pagamento",
                    "entityField": "metodo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Somente online conforme regra."
                  },
                  {
                    "entity": "Pagamento",
                    "entityField": "status",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Base para conferência e filtros."
                  },
                  {
                    "entity": "Pagamento",
                    "entityField": "valor",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Valor do pagamento."
                  }
                ],
                "params": [
                  {
                    "paramName": "status",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.caixaPagamentos.filter.status"
                    }
                  },
                  {
                    "paramName": "pedidoId",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.caixaPagamentos.filter.pedidoId"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.caixaPagamentos.filter.status",
                  "type": "string",
                  "description": "Filtro de status de pagamento.",
                  "priority": "recommended",
                  "initialValue": "'todos'"
                },
                {
                  "stateKey": "ui.caixaPagamentos.filter.pedidoId",
                  "type": "string",
                  "description": "Filtro por pedido específico.",
                  "priority": "optional",
                  "initialValue": "''"
                },
                {
                  "stateKey": "ui.caixaPagamentos.selection.pagamentoId",
                  "type": "string",
                  "description": "Pagamento selecionado para detalhes.",
                  "priority": "recommended"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "pagamentosPendentesCount",
                  "derivedFrom": [
                    "db.Pagamento[]"
                  ],
                  "description": "Total de pagamentos pendentes para conferência.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "verPedidoRelacionado",
                  "target": "/pedidos/:pedidoId",
                  "params": [
                    "pedidoId"
                  ],
                  "priority": "recommended",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "pagamentoSelecionado",
                  "payload": "{pagamentoId}",
                  "writesState": "ui.caixaPagamentos.selection.pagamentoId"
                }
              ]
            },
            {
              "organismName": "caixaPagamentosReembolsos",
              "purpose": "Registrar reembolsos conforme política de cancelamento.",
              "rulesApplied": [
                "rule-cancellation-refund-policy",
                "rule-online-payments"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.caixaPagamentos.reembolso",
                "sourceRoutine": "pizzaria.getPoliticaCancelamentoReembolso",
                "fields": [
                  {
                    "entity": "PoliticaCancelamentoReembolso",
                    "entityField": "id",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identificação da política ativa."
                  },
                  {
                    "entity": "PoliticaCancelamentoReembolso",
                    "entityField": "condicoes",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Condições para permitir reembolso."
                  },
                  {
                    "entity": "PoliticaCancelamentoReembolso",
                    "entityField": "prazoMaximoMin",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Prazo limite para reembolso."
                  },
                  {
                    "entity": "PoliticaCancelamentoReembolso",
                    "entityField": "permiteReembolso",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Validação da ação."
                  },
                  {
                    "entity": "PoliticaCancelamentoReembolso",
                    "entityField": "ativo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Somente política ativa."
                  }
                ],
                "params": [
                  {
                    "paramName": "ativo",
                    "type": "boolean",
                    "source": {
                      "from": "fixed",
                      "value": true
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.caixaPagamentos.reembolso.pagamentoId",
                  "type": "string",
                  "description": "Pagamento alvo do reembolso.",
                  "priority": "required"
                },
                {
                  "stateKey": "ui.caixaPagamentos.reembolso.motivo",
                  "type": "string",
                  "description": "Motivo do reembolso registrado pelo caixa.",
                  "priority": "recommended",
                  "initialValue": "''"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "reembolsoPermitido",
                  "derivedFrom": [
                    "db.caixaPagamentos.reembolso.permiteReembolso",
                    "ui.caixaPagamentos.reembolso.pagamentoId"
                  ],
                  "description": "Indica se o reembolso pode ser processado conforme política ativa.",
                  "priority": "required"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "abrirComprovante",
                  "target": "/pagamentos/:pagamentoId/comprovante",
                  "params": [
                    "pagamentoId"
                  ],
                  "priority": "optional",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "reembolsoSolicitado",
                  "payload": "{pagamentoId,motivo}"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.caixaPagamentos.loadPagamentos",
          "description": "Carregamento da lista de pagamentos.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.caixaPagamentos.processarReembolso",
          "description": "Processamento de reembolso online.",
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
          "stateKey": "ui.caixaPagamentos.view.tab",
          "type": "string",
          "description": "Alternar entre pagamentos e reembolsos.",
          "priority": "optional",
          "initialValue": "'pagamentos'"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/caixaPagamentos.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/caixaPagamentos.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/caixaPagamentos.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/caixaPagamentos.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controllers/caixaPagamentos.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-26T19:04:30Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "caixaPagamentos.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-26T19:04:30Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "caixaPagamentos.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-26T19:04:30Z"
  }
]
