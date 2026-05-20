/// <mls fileReference="_102035_/l2/pizzaria/customerEditor.defs.ts"  enhancement="_blank"/>

export const definition = {
  "pages": [
    {
      "screenId": "customerEditor",
      "pageName": "customerEditor",
      "actor": "staff",
      "purpose": "Cadastrar e atualizar clientes com histórico de pedidos para uso interno.",
      "sections": [
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "customerEditorForm",
              "purpose": "Exibir e editar dados do cliente.",
              "rulesApplied": [
                "rule12",
                "rule2",
                "rule3",
                "rule1"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.customerEditor.customerDetail",
                "sourceRoutine": "customerManagement.getCustomer",
                "fields": [
                  {
                    "entity": "Customer",
                    "entityField": "customerId",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Chave do cliente para edição e referência."
                  },
                  {
                    "entity": "Customer",
                    "entityField": "name",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Campo obrigatório para identificação do cliente."
                  },
                  {
                    "entity": "Customer",
                    "entityField": "phone",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Necessário para contato e pedidos por telefone."
                  },
                  {
                    "entity": "Customer",
                    "entityField": "notes",
                    "priority": "recommended",
                    "usage": "edit",
                    "priorityReason": "Observações úteis no atendimento."
                  }
                ],
                "params": [
                  {
                    "paramName": "customerId",
                    "type": "string",
                    "source": {
                      "from": "route",
                      "routeParam": "customerId"
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.customerEditor.formMode",
                  "type": "string",
                  "description": "Modo do formulário: create | edit",
                  "priority": "required",
                  "initialValue": "'create'"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "isEditMode",
                  "derivedFrom": [
                    "ui.customerEditor.formMode"
                  ],
                  "description": "Indica se está editando um cliente existente.",
                  "priority": "required"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "goToCustomerHistory",
                  "target": "/pizzaria/clientes/:customerId/historico",
                  "params": [
                    "db.customerEditor.customerDetail.customerId"
                  ],
                  "priority": "recommended",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "customerSaved",
                  "payload": "{customerId}",
                  "writesState": "ui.customerEditor.formMode"
                }
              ]
            },
            {
              "organismName": "customerEditorHistoryPreview",
              "purpose": "Listar histórico recente de pedidos do cliente.",
              "rulesApplied": [
                "rule12",
                "rule2",
                "rule3",
                "rule1"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.customerEditor.customerOrderHistory[]",
                "sourceRoutine": "customerManagement.viewCustomerHistory",
                "itemFields": [
                  {
                    "entity": "CustomerOrderHistory",
                    "entityField": "orderId",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identificador do pedido para consulta."
                  },
                  {
                    "entity": "CustomerOrderHistory",
                    "entityField": "orderDate",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Data do pedido para referência."
                  },
                  {
                    "entity": "CustomerOrderHistory",
                    "entityField": "customerId",
                    "priority": "required",
                    "usage": "filter",
                    "priorityReason": "Filtro por cliente."
                  }
                ],
                "params": [
                  {
                    "paramName": "customerId",
                    "type": "string",
                    "source": {
                      "from": "route",
                      "routeParam": "customerId"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.customerEditor.history.limit",
                  "type": "number",
                  "description": "Quantidade de registros exibidos no preview.",
                  "priority": "optional",
                  "initialValue": "5"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "historyCount",
                  "derivedFrom": [
                    "db.customerEditor.customerOrderHistory[]"
                  ],
                  "description": "Total de registros retornados no preview.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "goToFullHistory",
                  "target": "/pizzaria/clientes/:customerId/historico",
                  "params": [
                    "db.customerEditor.customerDetail.customerId"
                  ],
                  "priority": "recommended",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "historyViewed",
                  "payload": "{customerId}"
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
              "organismName": "customerEditorActions",
              "purpose": "Ações rápidas de salvar, cancelar e limpar formulário.",
              "rulesApplied": [
                "rule2",
                "rule3",
                "rule1"
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": [
                  {
                    "entity": "Customer",
                    "entityField": "customerId",
                    "stateKey": "db.customerEditor.customerDetail.customerId",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entity": "Customer",
                    "entityField": "name",
                    "stateKey": "db.customerEditor.customerDetail.name",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entity": "Customer",
                    "entityField": "phone",
                    "stateKey": "db.customerEditor.customerDetail.phone",
                    "priority": "required",
                    "usage": "display"
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.customerEditor.confirmCancel",
                  "type": "boolean",
                  "description": "Confirmar cancelamento com alterações pendentes.",
                  "priority": "optional",
                  "initialValue": "false"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "canSave",
                  "derivedFrom": [
                    "db.customerEditor.customerDetail.name",
                    "db.customerEditor.customerDetail.phone"
                  ],
                  "description": "Habilita salvar quando campos obrigatórios estão preenchidos.",
                  "priority": "required"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "backToCustomerList",
                  "target": "/pizzaria/clientes",
                  "params": [],
                  "priority": "optional",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "saveCustomer",
                  "payload": "db.customerEditor.customerDetail"
                },
                {
                  "event": "cancelEdit",
                  "payload": "{reason:'user'}"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.customerEditor.load",
          "description": "Carregamento do cliente.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.customerEditor.save",
          "description": "Salvar cliente.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.customerEditor.loadHistory",
          "description": "Carregar histórico de pedidos.",
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
          "stateKey": "ui.customerEditor.route.customerId",
          "type": "string",
          "description": "Parâmetro de rota do cliente selecionado.",
          "priority": "required"
        },
        {
          "stateKey": "ui.customerEditor.validationErrors",
          "type": "string",
          "description": "Erros de validação do formulário.",
          "priority": "optional"
        }
      ]
    }
  ],
  "status": "draft"
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/customerEditor.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/customerEditor.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/customerEditor.defs.ts).definition]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/customerEditor.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controller/customerEditor.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-20T22:42:31Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "/l2/pizzaria/web/shared/customerEditor.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageShared.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-20T22:42:31Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "/l2/pizzaria/web/desktop/page11/customerEditor.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageRender.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-20T22:42:31Z"
  }
]
