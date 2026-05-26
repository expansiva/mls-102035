/// <mls fileReference="_102035_/l2/pizzaria/areaPublicaCheckout.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "area-publica-checkout",
  "pageName": "areaPublicaCheckout",
  "actor": "customer",
  "purpose": "Finalizar pedido online com sugestões de combos e upsell.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "areaPublicaCheckoutResumoPedido",
          "purpose": "Exibir resumo do pedido e dados de entrega.",
          "rulesApplied": [
            "rule-delivery-zones-fees"
          ]
        },
        {
          "organismName": "areaPublicaCheckoutSugestoes",
          "purpose": "Sugerir combos e upsell durante o checkout.",
          "rulesApplied": []
        },
        {
          "organismName": "areaPublicaCheckoutPagamento",
          "purpose": "Registrar pagamento online do pedido.",
          "rulesApplied": [
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
      "screenId": "areaPublicaCheckout",
      "pageName": "areaPublicaCheckout",
      "actor": "customer",
      "purpose": "Finalizar pedido público online com dados do cliente, entrega, pagamento e confirmação.",
      "sections": [
        {
          "sectionName": "header",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "areaPublicaCheckoutHeaderResumo",
              "purpose": "Exibir resumo rápido do pedido e total.",
              "rulesApplied": [
                "rule-internal-with-public-area",
                "rule-tone-professional-concise"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.areaPublicaCheckout.resumoPedido",
                "sourceRoutine": "pizzaria.getResumoCheckoutPublico",
                "fields": [
                  {
                    "entityField": "id",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "tipo",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "status",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "total",
                    "entity": "Pedido",
                    "priority": "required",
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
                  "fieldId": "statusLegivel",
                  "derivedFrom": [
                    "db.areaPublicaCheckout.resumoPedido.status"
                  ],
                  "description": "Converter status para rótulo amigável ao cliente.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "voltarCardapio",
                  "target": "/publico/cardapio",
                  "params": [],
                  "priority": "optional",
                  "navigationType": "internal"
                }
              ],
              "emits": []
            }
          ]
        },
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "areaPublicaCheckoutItensCarrinho",
              "purpose": "Listar itens do pedido com quantidades e observações.",
              "rulesApplied": [
                "rule-product-unavailability-by-stock",
                "rule-tone-professional-concise"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.areaPublicaCheckout.itensPedido[]",
                "sourceRoutine": "pizzaria.listarItensPedido",
                "itemFields": [
                  {
                    "entityField": "id",
                    "entity": "ItemPedido",
                    "priority": "required",
                    "usage": "display"
                  },
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
                    "priority": "required",
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
                    "db.areaPublicaCheckout.itensPedido[].quantidade",
                    "db.areaPublicaCheckout.itensPedido[].precoUnitario"
                  ],
                  "description": "Calcular subtotal por item.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": []
            },
            {
              "organismName": "areaPublicaCheckoutDadosClienteEntrega",
              "purpose": "Capturar cliente e endereço para delivery e zona de entrega com taxa.",
              "rulesApplied": [
                "rule-order-flow",
                "rule-delivery-zones-fees",
                "rule-tone-professional-concise"
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": [
                  {
                    "entity": "Pedido",
                    "entityField": "cliente",
                    "stateKey": "db.Pedido.cliente",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "enderecoEntrega",
                    "stateKey": "db.Pedido.enderecoEntrega",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "zonaEntregaId",
                    "stateKey": "db.Pedido.zonaEntregaId",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "taxaEntrega",
                    "stateKey": "db.Pedido.taxaEntrega",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "tipo",
                    "stateKey": "db.Pedido.tipo",
                    "priority": "required",
                    "usage": "display"
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.areaPublicaCheckout.entrega.zonaSelecionada",
                  "type": "string",
                  "description": "Zona de entrega selecionada pelo cliente.",
                  "priority": "recommended"
                },
                {
                  "stateKey": "ui.areaPublicaCheckout.entrega.calculoTaxa",
                  "type": "string",
                  "description": "Estado do cálculo de taxa de entrega.",
                  "priority": "optional",
                  "initialValue": "'idle'"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "aplicarTaxaEntrega",
                  "derivedFrom": [
                    "ui.areaPublicaCheckout.entrega.zonaSelecionada"
                  ],
                  "description": "Atualizar taxa conforme zona selecionada.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "entregaZonaSelecionada",
                  "payload": "{zonaEntregaId}",
                  "writesState": "db.Pedido.zonaEntregaId"
                }
              ]
            },
            {
              "organismName": "areaPublicaCheckoutCombosUpsell",
              "purpose": "Sugerir combos e upsell no checkout.",
              "rulesApplied": [
                "rule-tone-professional-concise"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.areaPublicaCheckout.combosSugestoes[]",
                "sourceRoutine": "pizzaria.listarCombosAtivos",
                "itemFields": [
                  {
                    "entityField": "id",
                    "entity": "Combo",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "nome",
                    "entity": "Combo",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "descricao",
                    "entity": "Combo",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "preco",
                    "entity": "Combo",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "itens",
                    "entity": "Combo",
                    "priority": "recommended",
                    "usage": "display"
                  }
                ],
                "params": [],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.areaPublicaCheckout.upsell.comboSelecionadoId",
                  "type": "string",
                  "description": "Combo selecionado pelo cliente.",
                  "priority": "optional"
                }
              ],
              "computedFields": [],
              "navigationFields": [],
              "emits": [
                {
                  "event": "adicionarComboAoPedido",
                  "payload": "{comboId}"
                }
              ]
            },
            {
              "organismName": "areaPublicaCheckoutPagamentoOnline",
              "purpose": "Selecionar e processar pagamento online.",
              "rulesApplied": [
                "rule-online-payments",
                "rule-cancellation-refund-policy",
                "rule-tone-professional-concise"
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": [
                  {
                    "entity": "Pagamento",
                    "entityField": "metodo",
                    "stateKey": "db.Pagamento.metodo",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entity": "Pagamento",
                    "entityField": "valor",
                    "stateKey": "db.Pagamento.valor",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entity": "Pagamento",
                    "entityField": "status",
                    "stateKey": "db.Pagamento.status",
                    "priority": "recommended",
                    "usage": "display"
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.areaPublicaCheckout.pagamento.processando",
                  "type": "boolean",
                  "description": "Indica processamento do pagamento online.",
                  "priority": "required",
                  "initialValue": "false"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "valorFinalComTaxa",
                  "derivedFrom": [
                    "db.Pedido.total",
                    "db.Pedido.taxaEntrega"
                  ],
                  "description": "Total final incluindo taxa de entrega.",
                  "priority": "required"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "iniciarPagamentoOnline",
                  "payload": "{pedidoId,valorFinal}",
                  "writesState": "ui.areaPublicaCheckout.pagamento.processando"
                }
              ]
            },
            {
              "organismName": "areaPublicaCheckoutPoliticaCancelamento",
              "purpose": "Exibir política de cancelamento e reembolso antes da confirmação.",
              "rulesApplied": [
                "rule-cancellation-refund-policy",
                "rule-tone-professional-concise"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.areaPublicaCheckout.politicaCancelamento[]",
                "sourceRoutine": "pizzaria.listarPoliticasCancelamentoAtivas",
                "itemFields": [
                  {
                    "entityField": "id",
                    "entity": "PoliticaCancelamentoReembolso",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "condicoes",
                    "entity": "PoliticaCancelamentoReembolso",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "prazoMaximoMin",
                    "entity": "PoliticaCancelamentoReembolso",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "permiteReembolso",
                    "entity": "PoliticaCancelamentoReembolso",
                    "priority": "recommended",
                    "usage": "display"
                  }
                ],
                "params": [],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.areaPublicaCheckout.politicaAceite",
                  "type": "boolean",
                  "description": "Confirmação de leitura da política pelo cliente.",
                  "priority": "required",
                  "initialValue": "false"
                }
              ],
              "computedFields": [],
              "navigationFields": [],
              "emits": [
                {
                  "event": "aceitePolitica",
                  "payload": "{aceite}",
                  "writesState": "ui.areaPublicaCheckout.politicaAceite"
                }
              ]
            },
            {
              "organismName": "areaPublicaCheckoutConfirmacao",
              "purpose": "Confirmar pedido e enviar atualizações via WhatsApp.",
              "rulesApplied": [
                "rule-whatsapp-integration",
                "rule-real-time-tracking",
                "rule-tone-professional-concise"
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": [
                  {
                    "entity": "Pedido",
                    "entityField": "id",
                    "stateKey": "db.Pedido.id",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "status",
                    "stateKey": "db.Pedido.status",
                    "priority": "recommended",
                    "usage": "display"
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.areaPublicaCheckout.whatsappOptIn",
                  "type": "boolean",
                  "description": "Consentimento para receber atualizações via WhatsApp.",
                  "priority": "optional",
                  "initialValue": "true"
                }
              ],
              "computedFields": [],
              "navigationFields": [
                {
                  "fieldId": "acompanharPedido",
                  "target": "/publico/pedido/:pedidoId",
                  "params": [
                    "db.Pedido.id"
                  ],
                  "priority": "required",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "confirmarPedidoPublico",
                  "payload": "{pedidoId,whatsappOptIn}"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.areaPublicaCheckout.carregar",
          "description": "Carregamento do checkout público.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.areaPublicaCheckout.salvarPagamento",
          "description": "Estado do processamento de pagamento online.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.areaPublicaCheckout.confirmarPedido",
          "description": "Confirmação do pedido público.",
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
          "stateKey": "ui.areaPublicaCheckout.filtroZonasAtivas",
          "type": "boolean",
          "description": "Filtro de zonas ativas para seleção de entrega.",
          "priority": "optional",
          "initialValue": "true"
        },
        {
          "stateKey": "ui.areaPublicaCheckout.atualizacaoTempoReal",
          "type": "boolean",
          "description": "Controle de atualização em tempo real do status do pedido.",
          "priority": "recommended",
          "initialValue": "true"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/areaPublicaCheckout.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/areaPublicaCheckout.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/areaPublicaCheckout.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/areaPublicaCheckout.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controllers/areaPublicaCheckout.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-26T17:19:11Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "areaPublicaCheckout.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-26T17:19:11Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "areaPublicaCheckout.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-26T17:19:11Z"
  }
]
