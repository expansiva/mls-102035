/// <mls fileReference="_102035_/l2/pizzaria/areaPublicaAcompanhamento.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "area-publica-acompanhamento",
  "pageName": "areaPublicaAcompanhamento",
  "actor": "customer",
  "purpose": "Acompanhar status do pedido em tempo real.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "areaPublicaAcompanhamentoStatus",
          "purpose": "Exibir status atual do pedido em tempo real.",
          "rulesApplied": [
            "rule-real-time-tracking",
            "rule-order-status"
          ]
        },
        {
          "organismName": "areaPublicaAcompanhamentoLinhaTempo",
          "purpose": "Apresentar fluxo do pedido com atualização contínua.",
          "rulesApplied": [
            "rule-real-time-tracking",
            "rule-order-status"
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
      "screenId": "102035_2",
      "pageName": "areaPublicaAcompanhamento",
      "actor": "customer",
      "purpose": "Acompanhar pedido online em tempo real com status, detalhes e contato.",
      "sections": [
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "areaPublicaAcompanhamentoStatusHeader",
              "purpose": "Exibir identificação do pedido e status atual.",
              "rulesApplied": [
                "rule-real-time-tracking",
                "rule-order-status",
                "rule-tone-professional-concise",
                "rule-language-pt"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.areaPublicaAcompanhamento.pedidoResumo",
                "sourceRoutine": "pizzaria.getPedidoResumoPublico",
                "fields": [
                  {
                    "entityField": "id",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identificar pedido do cliente."
                  },
                  {
                    "entityField": "status",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Status atual do pedido em tempo real."
                  },
                  {
                    "entityField": "tipo",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Contexto do fluxo (mesa/balcão/delivery)."
                  },
                  {
                    "entityField": "total",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Transparência do valor total."
                  },
                  {
                    "entityField": "origem",
                    "entity": "Pedido",
                    "priority": "optional",
                    "usage": "display"
                  }
                ],
                "params": [
                  {
                    "paramName": "pedidoId",
                    "type": "string",
                    "source": {
                      "from": "route",
                      "routeParam": "pedidoId"
                    }
                  }
                ]
              },
              "tempStates": [],
              "computedFields": [
                {
                  "fieldId": "statusLabel",
                  "derivedFrom": [
                    "db.areaPublicaAcompanhamento.pedidoResumo.status"
                  ],
                  "description": "Rótulo amigável do status atual.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": []
            },
            {
              "organismName": "areaPublicaAcompanhamentoTimeline",
              "purpose": "Mostrar linha do tempo do pedido com tempos-alvo e progresso.",
              "rulesApplied": [
                "rule-real-time-tracking",
                "rule-target-time-per-stage",
                "rule-order-status"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.areaPublicaAcompanhamento.etapas[]",
                "sourceRoutine": "pizzaria.listPedidoEtapasPublico",
                "itemFields": [
                  {
                    "entityField": "etapa",
                    "entity": "TempoAlvoEtapa",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "tempoAlvoMin",
                    "entity": "TempoAlvoEtapa",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "ativo",
                    "entity": "TempoAlvoEtapa",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "status",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display",
                    "isNested": true
                  }
                ],
                "params": [
                  {
                    "paramName": "pedidoId",
                    "type": "string",
                    "source": {
                      "from": "route",
                      "routeParam": "pedidoId"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [],
              "computedFields": [
                {
                  "fieldId": "atrasoMin",
                  "derivedFrom": [
                    "db.areaPublicaAcompanhamento.etapas[].tempoAlvoMin",
                    "db.areaPublicaAcompanhamento.etapas[].status"
                  ],
                  "description": "Indicador estimado de atraso por etapa.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [],
              "emits": []
            },
            {
              "organismName": "areaPublicaAcompanhamentoResumoItens",
              "purpose": "Listar itens do pedido e observações.",
              "rulesApplied": [
                "rule-product-unavailability-by-stock"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.areaPublicaAcompanhamento.itens[]",
                "sourceRoutine": "pizzaria.listItensPedidoPublico",
                "itemFields": [
                  {
                    "entityField": "produtoId",
                    "entity": "ItemPedido",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "quantidade",
                    "entity": "ItemPedido",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "precoUnitario",
                    "entity": "ItemPedido",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "observacoes",
                    "entity": "ItemPedido",
                    "priority": "optional",
                    "usage": "display"
                  }
                ],
                "params": [
                  {
                    "paramName": "pedidoId",
                    "type": "string",
                    "source": {
                      "from": "route",
                      "routeParam": "pedidoId"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [],
              "computedFields": [
                {
                  "fieldId": "subtotalItem",
                  "derivedFrom": [
                    "db.areaPublicaAcompanhamento.itens[].quantidade",
                    "db.areaPublicaAcompanhamento.itens[].precoUnitario"
                  ],
                  "description": "Subtotal por item.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": []
            },
            {
              "organismName": "areaPublicaAcompanhamentoEntrega",
              "purpose": "Exibir dados de entrega e taxa aplicada quando delivery.",
              "rulesApplied": [
                "rule-delivery-zones-fees",
                "rule-order-flow"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.areaPublicaAcompanhamento.entrega",
                "sourceRoutine": "pizzaria.getEntregaPublica",
                "fields": [
                  {
                    "entityField": "enderecoEntrega",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "zonaEntregaId",
                    "entity": "Pedido",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "taxaEntrega",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "status",
                    "entity": "Entrega",
                    "priority": "recommended",
                    "usage": "display"
                  }
                ],
                "params": [
                  {
                    "paramName": "pedidoId",
                    "type": "string",
                    "source": {
                      "from": "route",
                      "routeParam": "pedidoId"
                    }
                  }
                ]
              },
              "tempStates": [],
              "computedFields": [],
              "navigationFields": [],
              "emits": []
            },
            {
              "organismName": "areaPublicaAcompanhamentoContato",
              "purpose": "Permitir contato via WhatsApp para suporte do pedido.",
              "rulesApplied": [
                "rule-whatsapp-integration"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.areaPublicaAcompanhamento.whatsapp",
                "sourceRoutine": "pizzaria.getConfiguracaoWhatsAppPublica",
                "fields": [
                  {
                    "entityField": "numeroTelefone",
                    "entity": "ConfiguracaoWhatsApp",
                    "priority": "required",
                    "usage": "display"
                  }
                ],
                "params": []
              },
              "tempStates": [],
              "computedFields": [
                {
                  "fieldId": "whatsAppLink",
                  "derivedFrom": [
                    "db.areaPublicaAcompanhamento.whatsapp.numeroTelefone",
                    "db.areaPublicaAcompanhamento.pedidoResumo.id"
                  ],
                  "description": "Link com número e mensagem pré-preenchida.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "abrirWhatsApp",
                  "target": "whatsapp://send",
                  "params": [
                    "whatsAppLink"
                  ],
                  "priority": "recommended",
                  "navigationType": "external"
                }
              ],
              "emits": [
                {
                  "event": "contatoWhatsAppClicado",
                  "payload": "{pedidoId}"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.areaPublicaAcompanhamento.loading",
          "description": "Carregamento dos dados do pedido.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.areaPublicaAcompanhamento.refresh",
          "description": "Atualização periódica do status.",
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
          "stateKey": "ui.areaPublicaAcompanhamento.autoRefresh",
          "type": "boolean",
          "description": "Ativar atualização automática em tempo real.",
          "priority": "recommended",
          "initialValue": "true"
        },
        {
          "stateKey": "ui.areaPublicaAcompanhamento.lastUpdatedAt",
          "type": "string",
          "description": "Último horário de atualização exibido ao cliente.",
          "priority": "optional"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/areaPublicaAcompanhamento.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/areaPublicaAcompanhamento.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/areaPublicaAcompanhamento.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/areaPublicaAcompanhamento.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controllers/areaPublicaAcompanhamento.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-25T17:11:39Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "/l2/pizzaria/web/shared/areaPublicaAcompanhamento.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageShared.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-25T17:11:39Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "/l2/pizzaria/web/desktop/page11/areaPublicaAcompanhamento.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageRender.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-25T17:11:39Z"
  }
]
