/// <mls fileReference="_102035_/l2/pizzaria/confirmacaoImpressaoComanda.defs.ts"  enhancement="_blank"/>

export const definition = {
  "pages": [
    {
      "screenId": "102035_2",
      "pageName": "confirmacaoImpressaoComanda",
      "actor": "staff",
      "purpose": "Confirmar impressão de comanda do pedido e garantir revisão rápida antes de enviar para a impressora.",
      "sections": [
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "confirmacaoImpressaoComandaResumoPedido",
              "purpose": "Exibir resumo do pedido e solicitar confirmação da impressão da comanda.",
              "rulesApplied": [
                "ruleImpressaoComanda",
                "ruleIdiomaPt",
                "ruleTomProfissionalConcisao",
                "ruleModuloInterno",
                "rulePedidoStatusPermitidos",
                "ruleRegistroPagamentoPedido",
                "ruleComunicacaoObservacaoCritica"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.confirmacaoImpressaoComanda.pedidoResumo",
                "sourceRoutine": "pizzaria.getPedidoResumoImpressao",
                "fields": [
                  {
                    "entity": "Pedido",
                    "entityField": "id",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identificação do pedido a ser impresso."
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "status",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Confirmar estágio do pedido antes da impressão."
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "criadoEm",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Referência de tempo para priorização."
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "observacoes",
                    "priority": "optional",
                    "usage": "display",
                    "priorityReason": "Informações adicionais relevantes."
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "observacaoCritica",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Destaque de comunicação interna crítica."
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "formaPagamento",
                    "priority": "optional",
                    "usage": "display",
                    "priorityReason": "Registrar forma de pagamento quando disponível."
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "statusPagamento",
                    "priority": "optional",
                    "usage": "display",
                    "priorityReason": "Confirmar status de pagamento quando aplicável."
                  },
                  {
                    "entity": "Pedido",
                    "entityField": "itens",
                    "priority": "required",
                    "usage": "display",
                    "isNested": true,
                    "nestedCollection": {
                      "stateKeySuffix": ".itens[]",
                      "itemFields": [
                        {
                          "entity": "ItemPedido",
                          "entityField": "nome",
                          "priority": "required",
                          "usage": "display",
                          "priorityReason": "Identificar item na comanda."
                        },
                        {
                          "entity": "ItemPedido",
                          "entityField": "quantidade",
                          "priority": "required",
                          "usage": "display",
                          "priorityReason": "Quantidade do item na comanda."
                        },
                        {
                          "entity": "ItemPedido",
                          "entityField": "observacoes",
                          "priority": "optional",
                          "usage": "display",
                          "priorityReason": "Observações específicas do item."
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
                      "from": "route",
                      "routeParam": "pedidoId"
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.confirmacaoImpressaoComanda.ackObservacaoCritica",
                  "type": "boolean",
                  "description": "Confirmação de ciência da observação crítica antes da impressão.",
                  "priority": "recommended",
                  "initialValue": "false"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "tempoDesdeCriacaoMin",
                  "derivedFrom": [
                    "db.confirmacaoImpressaoComanda.pedidoResumo.criadoEm"
                  ],
                  "description": "Minutos desde a criação do pedido para referência de prioridade.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "voltarPedidos",
                  "target": "/pizzaria/pedidos",
                  "params": [],
                  "priority": "optional",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "confirmarImpressao",
                  "payload": "{pedidoId: db.confirmacaoImpressaoComanda.pedidoResumo.id}",
                  "writesState": "ui.confirmacaoImpressaoComanda.resultadoImpressao"
                },
                {
                  "event": "cancelarImpressao",
                  "payload": "{pedidoId: db.confirmacaoImpressaoComanda.pedidoResumo.id}"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.confirmacaoImpressaoComanda.carregarResumo",
          "description": "Carregamento do resumo do pedido para impressão.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.confirmacaoImpressaoComanda.imprimirComanda",
          "description": "Estado da ação de impressão da comanda.",
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
          "stateKey": "ui.confirmacaoImpressaoComanda.confirmacaoDigitada",
          "type": "string",
          "description": "Texto de confirmação opcional para validar a impressão.",
          "priority": "optional",
          "initialValue": "\"\""
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/confirmacaoImpressaoComanda.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/confirmacaoImpressaoComanda.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/confirmacaoImpressaoComanda.defs.ts).definition]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/confirmacaoImpressaoComanda.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controller/confirmacaoImpressaoComanda.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-22T17:54:22Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "/l2/pizzaria/web/shared/confirmacaoImpressaoComanda.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageShared.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-22T17:54:22Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "/l2/pizzaria/web/desktop/page11/confirmacaoImpressaoComanda.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageRender.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-22T17:54:22Z"
  }
]
