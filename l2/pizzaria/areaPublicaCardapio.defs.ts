/// <mls fileReference="_102035_/l2/pizzaria/areaPublicaCardapio.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "area-publica-cardapio",
  "pageName": "areaPublicaCardapio",
  "actor": "customer",
  "purpose": "Explorar cardápio público e iniciar pedido online.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "areaPublicaCardapioCatalogo",
          "purpose": "Exibir cardápio público com disponibilidade de produtos.",
          "rulesApplied": [
            "rule-internal-with-public-area",
            "rule-product-unavailability-by-stock"
          ]
        },
        {
          "organismName": "areaPublicaCardapioCarrinho",
          "purpose": "Permitir iniciar e revisar pedido online.",
          "rulesApplied": [
            "rule-internal-with-public-area"
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
      "screenId": "102035_2_pizzaria_areaPublicaCardapio",
      "pageName": "areaPublicaCardapio",
      "actor": "customer",
      "purpose": "Exibir cardápio público com produtos disponíveis, permitir montagem do carrinho e preparar o pedido online.",
      "sections": [
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "areaPublicaCardapioFilters",
              "purpose": "Filtrar e buscar produtos do cardápio público.",
              "rulesApplied": [
                "rule-language-pt",
                "rule-tone-professional-concise"
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": []
              },
              "tempStates": [
                {
                  "stateKey": "ui.areaPublicaCardapio.filter.busca",
                  "type": "string",
                  "description": "Termo de busca por nome/descrição.",
                  "priority": "recommended",
                  "initialValue": "''"
                },
                {
                  "stateKey": "ui.areaPublicaCardapio.filter.categoria",
                  "type": "string",
                  "description": "Categoria selecionada para filtragem.",
                  "priority": "recommended",
                  "initialValue": "''"
                },
                {
                  "stateKey": "ui.areaPublicaCardapio.filter.sort",
                  "type": "string",
                  "description": "Ordenação aplicada (ex.: preco_asc, preco_desc).",
                  "priority": "optional",
                  "initialValue": "'relevancia'"
                }
              ],
              "computedFields": [],
              "navigationFields": [],
              "emits": [
                {
                  "event": "filtrarProdutos",
                  "payload": "{busca,categoria,sort}"
                }
              ]
            },
            {
              "organismName": "areaPublicaCardapioProductList",
              "purpose": "Listar produtos disponíveis e permitir adicionar ao carrinho.",
              "rulesApplied": [
                "rule-product-unavailability-by-stock",
                "rule-required-functionalities"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.produto[]",
                "sourceRoutine": "pizzaria.listProdutosPublicos",
                "itemFields": [
                  {
                    "entityField": "id",
                    "entity": "Produto",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "nome",
                    "entity": "Produto",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "descricao",
                    "entity": "Produto",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "preco",
                    "entity": "Produto",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "categoria",
                    "entity": "Produto",
                    "priority": "recommended",
                    "usage": "filter"
                  },
                  {
                    "entityField": "disponivel",
                    "entity": "Produto",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "ativo",
                    "entity": "Produto",
                    "priority": "optional",
                    "usage": "display"
                  }
                ],
                "params": [
                  {
                    "paramName": "termo",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.areaPublicaCardapio.filter.busca"
                    }
                  },
                  {
                    "paramName": "categoria",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.areaPublicaCardapio.filter.categoria"
                    }
                  },
                  {
                    "paramName": "somenteDisponiveis",
                    "type": "boolean",
                    "source": {
                      "from": "fixed",
                      "value": true
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [],
              "computedFields": [],
              "navigationFields": [],
              "emits": [
                {
                  "event": "adicionarAoCarrinho",
                  "payload": "{produtoId,quantidade,observacoes}",
                  "writesState": "ui.areaPublicaCardapio.cart.itens"
                }
              ]
            },
            {
              "organismName": "areaPublicaCardapioComboUpsell",
              "purpose": "Exibir combos e sugestões de upsell durante a escolha dos itens.",
              "rulesApplied": [
                "rule-language-pt",
                "rule-tone-professional-concise"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.combo[]",
                "sourceRoutine": "pizzaria.listCombosAtivos",
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
                    "entityField": "itens",
                    "entity": "Combo",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "preco",
                    "entity": "Combo",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "ativo",
                    "entity": "Combo",
                    "priority": "optional",
                    "usage": "display"
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
                ],
                "editable": false
              },
              "tempStates": [],
              "computedFields": [
                {
                  "fieldId": "combosRecomendados",
                  "derivedFrom": [
                    "db.combo[]",
                    "ui.areaPublicaCardapio.cart.itens"
                  ],
                  "description": "Combos priorizados com base no carrinho atual.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "adicionarComboAoCarrinho",
                  "payload": "{comboId}",
                  "writesState": "ui.areaPublicaCardapio.cart.itens"
                }
              ]
            }
          ]
        },
        {
          "sectionName": "aside",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "areaPublicaCardapioCartSummary",
              "purpose": "Exibir resumo do carrinho e preparar dados para criação do pedido público.",
              "rulesApplied": [
                "rule-internal-with-public-area",
                "rule-cancellation-refund-policy"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.areaPublicaCardapio.politicaCancelamento",
                "sourceRoutine": "pizzaria.getPoliticaCancelamentoAtiva",
                "fields": [
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
                  },
                  {
                    "entityField": "ativo",
                    "entity": "PoliticaCancelamentoReembolso",
                    "priority": "optional",
                    "usage": "display"
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
                  "stateKey": "ui.areaPublicaCardapio.cart.itens",
                  "type": "array",
                  "description": "Itens atuais do carrinho público.",
                  "priority": "required",
                  "initialValue": "[]"
                },
                {
                  "stateKey": "ui.areaPublicaCardapio.orderType",
                  "type": "string",
                  "description": "Tipo de pedido selecionado pelo cliente.",
                  "priority": "recommended",
                  "initialValue": "'delivery'"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "subtotalCarrinho",
                  "derivedFrom": [
                    "ui.areaPublicaCardapio.cart.itens"
                  ],
                  "description": "Soma dos itens antes de taxas.",
                  "priority": "required"
                },
                {
                  "fieldId": "totalCarrinho",
                  "derivedFrom": [
                    "ui.areaPublicaCardapio.cart.itens"
                  ],
                  "description": "Total do carrinho para seguir ao pedido.",
                  "priority": "required"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "alterarQuantidadeItem",
                  "payload": "{itemId,quantidade}",
                  "writesState": "ui.areaPublicaCardapio.cart.itens"
                },
                {
                  "event": "removerItemCarrinho",
                  "payload": "{itemId}",
                  "writesState": "ui.areaPublicaCardapio.cart.itens"
                },
                {
                  "event": "criarPedidoPublico",
                  "payload": "{itens,orderType}"
                }
              ]
            },
            {
              "organismName": "areaPublicaCardapioWhatsAppCta",
              "purpose": "Permitir contato rápido via WhatsApp para dúvidas sobre pedido.",
              "rulesApplied": [
                "rule-whatsapp-integration"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.configuracaoWhatsApp",
                "sourceRoutine": "pizzaria.getConfiguracaoWhatsAppAtiva",
                "fields": [
                  {
                    "entityField": "numeroTelefone",
                    "entity": "ConfiguracaoWhatsApp",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "ativo",
                    "entity": "ConfiguracaoWhatsApp",
                    "priority": "recommended",
                    "usage": "display"
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
              "tempStates": [],
              "computedFields": [
                {
                  "fieldId": "whatsAppLink",
                  "derivedFrom": [
                    "db.configuracaoWhatsApp.numeroTelefone"
                  ],
                  "description": "Link externo formatado para WhatsApp.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "abrirWhatsApp",
                  "target": "https://wa.me/{numeroTelefone}",
                  "params": [
                    "db.configuracaoWhatsApp.numeroTelefone"
                  ],
                  "priority": "recommended",
                  "navigationType": "external"
                }
              ],
              "emits": []
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.areaPublicaCardapio.loadMenu",
          "description": "Carregamento do cardápio público.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.areaPublicaCardapio.createOrder",
          "description": "Criação do pedido público.",
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
          "stateKey": "ui.areaPublicaCardapio.filter.busca",
          "type": "string",
          "description": "Termo de busca por produtos.",
          "priority": "recommended",
          "initialValue": "''"
        },
        {
          "stateKey": "ui.areaPublicaCardapio.filter.categoria",
          "type": "string",
          "description": "Categoria selecionada.",
          "priority": "recommended",
          "initialValue": "''"
        },
        {
          "stateKey": "ui.areaPublicaCardapio.filter.sort",
          "type": "string",
          "description": "Ordenação atual.",
          "priority": "optional",
          "initialValue": "'relevancia'"
        },
        {
          "stateKey": "ui.areaPublicaCardapio.cart.itens",
          "type": "array",
          "description": "Itens do carrinho público.",
          "priority": "required",
          "initialValue": "[]"
        },
        {
          "stateKey": "ui.areaPublicaCardapio.orderType",
          "type": "string",
          "description": "Fluxo do pedido selecionado.",
          "priority": "recommended",
          "initialValue": "'delivery'"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/areaPublicaCardapio.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/areaPublicaCardapio.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/areaPublicaCardapio.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/areaPublicaCardapio.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controllers/areaPublicaCardapio.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-26T13:35:48Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "areaPublicaCardapio.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-26T13:35:48Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "areaPublicaCardapio.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-26T13:35:48Z"
  }
]
