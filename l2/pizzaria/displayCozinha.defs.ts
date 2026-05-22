/// <mls fileReference="_102035_/l2/pizzaria/displayCozinha.defs.ts"  enhancement="_blank"/>

export const definition = {
  "pages": [
    {
      "screenId": "displayCozinha",
      "pageName": "displayCozinha",
      "actor": "staff",
      "purpose": "Exibir pedidos em produção no display da cozinha com atualização rápida e destaque de prioridades.",
      "sections": [
        {
          "sectionName": "header",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "displayCozinhaHeaderResumo",
              "purpose": "Mostrar resumo operacional da cozinha e filtros rápidos por status e prioridade.",
              "rulesApplied": [
                "ruleDisplayCozinha",
                "rulePedidoStatusPermitidos",
                "ruleIdiomaPt",
                "ruleTomProfissionalConcisao"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.displayCozinha.resumo",
                "sourceRoutine": "pizzaria.getResumoProducaoCozinha",
                "fields": [
                  {
                    "entityField": "status",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "group"
                  },
                  {
                    "entityField": "criadoEm",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "sort"
                  },
                  {
                    "entityField": "statusProducao",
                    "entity": "Producao",
                    "priority": "required",
                    "usage": "group"
                  }
                ],
                "params": [
                  {
                    "paramName": "cozinhaId",
                    "type": "string",
                    "source": {
                      "from": "context",
                      "contextKey": "user.cozinhaId"
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.displayCozinha.filter.status",
                  "type": "string",
                  "description": "Filtro rápido por status do pedido na cozinha.",
                  "priority": "recommended",
                  "initialValue": "'em preparo'"
                },
                {
                  "stateKey": "ui.displayCozinha.filter.prioridade",
                  "type": "string",
                  "description": "Filtro por prioridade (tempo desde recebido).",
                  "priority": "recommended",
                  "initialValue": "'critico'"
                },
                {
                  "stateKey": "ui.displayCozinha.autoRefresh",
                  "type": "boolean",
                  "description": "Atualização automática do display.",
                  "priority": "recommended",
                  "initialValue": "true"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "tempoMedioPreparo",
                  "derivedFrom": [
                    "db.displayCozinha.resumo"
                  ],
                  "description": "Tempo médio de preparo dos pedidos em produção.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "filtroAlterado",
                  "payload": "{status,prioridade}",
                  "writesState": "ui.displayCozinha.filter"
                }
              ]
            }
          ]
        },
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "displayCozinhaListaPedidos",
              "purpose": "Listar pedidos em preparo/pronto com destaque de observações críticas e prioridade.",
              "rulesApplied": [
                "ruleDisplayCozinha",
                "rulePedidoStatusPermitidos",
                "ruleResponsavelObrigatorioParaAvancarStatus",
                "ruleComunicacaoObservacaoCritica",
                "ruleIdiomaPt",
                "ruleTomProfissionalConcisao"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.pedido.cozinha[]",
                "sourceRoutine": "pizzaria.listarPedidosCozinha",
                "itemFields": [
                  {
                    "entityField": "id",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "status",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "filter"
                  },
                  {
                    "entityField": "criadoEm",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "sort"
                  },
                  {
                    "entityField": "atualizadoEm",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "observacoes",
                    "entity": "Pedido",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "observacaoCritica",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "responsavelAtendimento",
                    "entity": "Pedido",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "statusProducao",
                    "entity": "Producao",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "inicioEm",
                    "entity": "Producao",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "fimEm",
                    "entity": "Producao",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "cozinheiroResponsavelId",
                    "entity": "Producao",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "itens",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "isNested": true,
                    "nestedCollection": {
                      "stateKeySuffix": ".itens[]",
                      "itemFields": [
                        {
                          "entityField": "nome",
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
                          "entityField": "observacoes",
                          "entity": "ItemPedido",
                          "priority": "optional",
                          "usage": "display"
                        }
                      ]
                    }
                  }
                ],
                "params": [
                  {
                    "paramName": "status",
                    "type": "string[]",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.displayCozinha.filter.status"
                    }
                  },
                  {
                    "paramName": "prioridade",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.displayCozinha.filter.prioridade"
                    }
                  },
                  {
                    "paramName": "cozinhaId",
                    "type": "string",
                    "source": {
                      "from": "context",
                      "contextKey": "user.cozinhaId"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.displayCozinha.selecaoPedidoId",
                  "type": "string",
                  "description": "Pedido selecionado para ações rápidas de produção.",
                  "priority": "recommended"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "tempoDesdeRecebido",
                  "derivedFrom": [
                    "db.pedido.cozinha[].criadoEm"
                  ],
                  "description": "Tempo decorrido desde o recebimento do pedido para priorização.",
                  "priority": "required"
                },
                {
                  "fieldId": "prioridadeVisual",
                  "derivedFrom": [
                    "tempoDesdeRecebido",
                    "ui.displayCozinha.filter.prioridade"
                  ],
                  "description": "Classificação visual de prioridade (crítico, atenção, normal).",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "pedidoSelecionado",
                  "payload": "{pedidoId}",
                  "writesState": "ui.displayCozinha.selecaoPedidoId"
                },
                {
                  "event": "atualizarStatusProducao",
                  "payload": "{pedidoId,statusProducao,cozinheiroResponsavelId}"
                },
                {
                  "event": "designarCozinheiro",
                  "payload": "{pedidoId,cozinheiroResponsavelId}"
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
              "organismName": "displayCozinhaDetalhePedido",
              "purpose": "Exibir detalhes do pedido selecionado e ações de avanço de produção.",
              "rulesApplied": [
                "rulePedidoStatusPermitidos",
                "ruleResponsavelObrigatorioParaAvancarStatus",
                "ruleComunicacaoObservacaoCritica",
                "ruleIdiomaPt",
                "ruleTomProfissionalConcisao"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.displayCozinha.pedidoDetalhe",
                "sourceRoutine": "pizzaria.getPedidoCozinhaDetalhe",
                "fields": [
                  {
                    "entityField": "id",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "status",
                    "entity": "Pedido",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "criadoEm",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "observacoes",
                    "entity": "Pedido",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "observacaoCritica",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "statusProducao",
                    "entity": "Producao",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "inicioEm",
                    "entity": "Producao",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "fimEm",
                    "entity": "Producao",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "cozinheiroResponsavelId",
                    "entity": "Producao",
                    "priority": "recommended",
                    "usage": "edit"
                  },
                  {
                    "entityField": "itens",
                    "entity": "Pedido",
                    "priority": "recommended",
                    "usage": "display",
                    "isNested": true,
                    "nestedCollection": {
                      "stateKeySuffix": ".itens[]",
                      "itemFields": [
                        {
                          "entityField": "nome",
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
                          "entityField": "observacoes",
                          "entity": "ItemPedido",
                          "priority": "optional",
                          "usage": "display"
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
                      "stateKey": "ui.displayCozinha.selecaoPedidoId"
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.displayCozinha.acaoRapida",
                  "type": "string",
                  "description": "Ação rápida selecionada (iniciar preparo/finalizar preparo).",
                  "priority": "optional"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "podeAvancarParaPronto",
                  "derivedFrom": [
                    "db.displayCozinha.pedidoDetalhe.statusProducao",
                    "db.displayCozinha.pedidoDetalhe.cozinheiroResponsavelId"
                  ],
                  "description": "Indica se o pedido pode ser marcado como pronto conforme responsável designado.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "iniciarPreparo",
                  "payload": "{pedidoId,cozinheiroResponsavelId}"
                },
                {
                  "event": "finalizarPreparo",
                  "payload": "{pedidoId,cozinheiroResponsavelId}"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.displayCozinha.load",
          "description": "Carregamento do display da cozinha.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.displayCozinha.updateStatus",
          "description": "Atualização de status de produção.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.displayCozinha.assignCook",
          "description": "Designação de cozinheiro responsável.",
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
          "stateKey": "ui.displayCozinha.clock",
          "type": "datetime",
          "description": "Relógio operacional para referência de tempo na cozinha.",
          "priority": "optional",
          "initialValue": "now()"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/displayCozinha.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/displayCozinha.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/displayCozinha.defs.ts).definition]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/displayCozinha.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controller/displayCozinha.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-21T20:58:52Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "/l2/pizzaria/web/shared/displayCozinha.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageShared.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-21T20:58:52Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "/l2/pizzaria/web/desktop/page11/displayCozinha.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageRender.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-21T20:58:52Z"
  }
]
