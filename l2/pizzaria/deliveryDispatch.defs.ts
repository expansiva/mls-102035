/// <mls fileReference="_102035_/l2/pizzaria/deliveryDispatch.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "delivery_dispatch",
  "pageName": "deliveryDispatch",
  "actor": "staff",
  "purpose": "Acompanhar pedidos prontos e em entrega, com atualização de status.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "deliveryDispatchList",
          "purpose": "Exibir pedidos prontos e em entrega por status.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_whatsapp_updates",
            "rule_whatsapp_message_policy"
          ]
        },
        {
          "organismName": "deliveryDispatchActions",
          "purpose": "Atualizar status e comunicar via WhatsApp.",
          "rulesApplied": [
            "rule_order_flow",
            "rule_whatsapp_updates",
            "rule_whatsapp_message_policy"
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
      "screenId": "delivery_dispatch",
      "pageName": "deliveryDispatch",
      "actor": "staff",
      "purpose": "Acompanhar pedidos prontos e em entrega, com atualização de status.",
      "sections": [
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "deliveryDispatchList",
              "purpose": "Exibir pedidos prontos e em entrega por status com seleção rápida.",
              "rulesApplied": [
                "rule_order_flow",
                "rule_whatsapp_updates",
                "rule_whatsapp_message_policy"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.pedido[]",
                "sourceRoutine": "pizzaria.listPedidosPorStatus",
                "itemFields": [
                  {
                    "entityField": "status",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "filter",
                    "priorityReason": "Status define fila de despacho e ações disponíveis."
                  },
                  {
                    "entityField": "canal",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identifica se é balcão ou delivery para despacho."
                  },
                  {
                    "entityField": "dataHora",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "sort",
                    "priorityReason": "Ordenação por chegada/horário."
                  },
                  {
                    "entityField": "total",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Resumo financeiro do pedido."
                  },
                  {
                    "entityField": "clienteContato",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Necessário para contato e WhatsApp."
                  },
                  {
                    "entityField": "tempoEstimadoMin",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "ETA informado na confirmação."
                  },
                  {
                    "entityField": "itens",
                    "entity": "Pedido",
                    "priority": "optional",
                    "usage": "display",
                    "priorityReason": "Resumo dos itens ajuda na conferência."
                  }
                ],
                "params": [
                  {
                    "paramName": "statuses",
                    "type": "string[]",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.deliveryDispatch.filter.status"
                    }
                  },
                  {
                    "paramName": "canal",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.deliveryDispatch.filter.canal"
                    }
                  },
                  {
                    "paramName": "search",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.deliveryDispatch.filter.search"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.deliveryDispatch.list.selectedPedidoId",
                  "type": "string",
                  "description": "Pedido selecionado na lista para ações.",
                  "priority": "recommended"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "pedidoAtrasado",
                  "derivedFrom": [
                    "db.pedido[].dataHora",
                    "db.pedido[].tempoEstimadoMin"
                  ],
                  "description": "Indica atraso com base em data/hora e ETA.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "deliveryDispatch.selectPedido",
                  "payload": "{pedidoId}",
                  "writesState": "ui.deliveryDispatch.selectedPedidoId"
                }
              ]
            },
            {
              "organismName": "deliveryDispatchActions",
              "purpose": "Atualizar status e comunicar via WhatsApp.",
              "rulesApplied": [
                "rule_order_flow",
                "rule_whatsapp_updates",
                "rule_whatsapp_message_policy"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.deliveryDispatch.actionsData",
                "sourceRoutine": "pizzaria.getDispatchActionsData",
                "fields": [
                  {
                    "entityField": "status",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Define transições e mensagens."
                  },
                  {
                    "entityField": "canal",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Canal impacta ETA e mensagens."
                  },
                  {
                    "entityField": "clienteContato",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Necessário para envio de WhatsApp."
                  },
                  {
                    "entityField": "tempoEstimadoMin",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Usado no texto de confirmação/atualização."
                  },
                  {
                    "entityField": "dataHora",
                    "entity": "Pedido",
                    "priority": "optional",
                    "usage": "display",
                    "priorityReason": "Contexto do pedido."
                  },
                  {
                    "entityField": "total",
                    "entity": "Pedido",
                    "priority": "optional",
                    "usage": "display",
                    "priorityReason": "Resumo financeiro para conferência."
                  },
                  {
                    "entityField": "statusPedido",
                    "entity": "MensagemWhatsAppPadrao",
                    "priority": "required",
                    "usage": "display",
                    "isNested": true,
                    "nestedCollection": {
                      "stateKeySuffix": ".mensagensWhatsApp[]",
                      "itemFields": [
                        {
                          "entityField": "statusPedido",
                          "entity": "MensagemWhatsAppPadrao",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entityField": "mensagem",
                          "entity": "MensagemWhatsAppPadrao",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entityField": "ativa",
                          "entity": "MensagemWhatsAppPadrao",
                          "priority": "recommended",
                          "usage": "filter"
                        }
                      ]
                    }
                  }
                ],
                "params": [
                  {
                    "paramName": "pedidoId",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.deliveryDispatch.selectedPedidoId"
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.deliveryDispatch.action.newStatus",
                  "type": "string",
                  "description": "Novo status selecionado para o pedido.",
                  "priority": "required"
                },
                {
                  "stateKey": "ui.deliveryDispatch.action.sendWhatsApp",
                  "type": "boolean",
                  "description": "Indica se deve enviar mensagem após atualizar status.",
                  "priority": "recommended",
                  "initialValue": "true"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "whatsappMessageFinal",
                  "derivedFrom": [
                    "db.deliveryDispatch.actionsData.mensagensWhatsApp[].mensagem",
                    "db.deliveryDispatch.actionsData.status",
                    "db.deliveryDispatch.actionsData.tempoEstimadoMin"
                  ],
                  "description": "Mensagem final baseada no status e ETA, usando padrão ativo.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "openWhatsAppChat",
                  "target": "https://wa.me/{clienteContato}?text={whatsappMessageFinal}",
                  "params": [
                    "clienteContato",
                    "whatsappMessageFinal"
                  ],
                  "priority": "recommended",
                  "navigationType": "external"
                }
              ],
              "emits": [
                {
                  "event": "deliveryDispatch.updateStatus",
                  "payload": "{pedidoId,newStatus}",
                  "writesState": "ui.deliveryDispatch.updateStatus"
                },
                {
                  "event": "deliveryDispatch.sendWhatsApp",
                  "payload": "{pedidoId,clienteContato,whatsappMessageFinal}",
                  "writesState": "ui.deliveryDispatch.sendWhatsApp"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.deliveryDispatch.loadList",
          "description": "Carregamento da lista de pedidos de despacho.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.deliveryDispatch.updateStatus",
          "description": "Atualização de status do pedido.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.deliveryDispatch.sendWhatsApp",
          "description": "Envio de mensagem WhatsApp.",
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
          "stateKey": "ui.deliveryDispatch.filter.status",
          "type": "string[]",
          "description": "Filtro de status (pronto, emEntrega).",
          "priority": "required",
          "initialValue": "[\"pronto\",\"emEntrega\"]"
        },
        {
          "stateKey": "ui.deliveryDispatch.filter.canal",
          "type": "string",
          "description": "Filtro por canal (balcao/delivery).",
          "priority": "optional"
        },
        {
          "stateKey": "ui.deliveryDispatch.filter.search",
          "type": "string",
          "description": "Busca por cliente/telefone.",
          "priority": "optional"
        },
        {
          "stateKey": "ui.deliveryDispatch.selectedPedidoId",
          "type": "string",
          "description": "Pedido selecionado para ações.",
          "priority": "recommended"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/deliveryDispatch.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l2/pizzaria/module.defs.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/deliveryDispatch.defs.ts).definitionPage]]
\`\`\`

## Contracts
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/contracts/deliveryDispatch.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/deliveryDispatch.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/deliveryDispatch.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "_102035_/l1/pizzaria/layer_2_controllers/deliveryDispatch.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-27T20:43:34Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "deliveryDispatch.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-27T20:43:34Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "deliveryDispatch.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-27T20:43:34Z"
  }
]
