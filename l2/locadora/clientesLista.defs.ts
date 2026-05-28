/// <mls fileReference="_102035_/l2/locadora/clientesLista.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "clientes-lista",
  "pageName": "clientesLista",
  "actor": "admin",
  "purpose": "Consultar clientes cadastrados.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "clientesListaResults",
          "purpose": "Listar clientes cadastrados para consulta.",
          "rulesApplied": [
            "rule_papel_admin_unico",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "clientesListaSearch",
          "purpose": "Permitir busca e refinamento da lista de clientes.",
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
      "screenId": "clientes-lista",
      "pageName": "clientesLista",
      "actor": "admin",
      "purpose": "Consultar clientes cadastrados.",
      "sections": [
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "clientesListaResults",
              "purpose": "Listar clientes cadastrados para consulta.",
              "rulesApplied": [
                "rule_papel_admin_unico",
                "rule_idioma_pt_br",
                "rule_tom_profissional_conciso",
                "rule_cliente_campos_obrigatorios",
                "rule_cpf_cnh_formato_mascara"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.cliente[]",
                "sourceRoutine": "locadora.clientesLista.listarClientes",
                "itemFields": [
                  {
                    "entityField": "nome",
                    "entity": "cliente",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identificação principal do cliente na listagem."
                  },
                  {
                    "entityField": "cpf",
                    "entity": "cliente",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Documento obrigatório e único para consulta."
                  },
                  {
                    "entityField": "cnh",
                    "entity": "cliente",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Documento obrigatório para habilitação."
                  },
                  {
                    "entityField": "telefone",
                    "entity": "cliente",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Contato rápido."
                  },
                  {
                    "entityField": "email",
                    "entity": "cliente",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Contato formal."
                  }
                ],
                "params": [
                  {
                    "paramName": "nome",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.filter.nome"
                    }
                  },
                  {
                    "paramName": "cpf",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.filter.cpf"
                    }
                  },
                  {
                    "paramName": "cnh",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.filter.cnh"
                    }
                  },
                  {
                    "paramName": "telefone",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.filter.telefone"
                    }
                  },
                  {
                    "paramName": "email",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.filter.email"
                    }
                  },
                  {
                    "paramName": "statusValidacao",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.filter.statusValidacao"
                    }
                  },
                  {
                    "paramName": "page",
                    "type": "number",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.pagination.page"
                    }
                  },
                  {
                    "paramName": "pageSize",
                    "type": "number",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.pagination.pageSize"
                    }
                  },
                  {
                    "paramName": "sortBy",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.sort.by"
                    }
                  },
                  {
                    "paramName": "sortDir",
                    "type": "string",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.clientesLista.sort.dir"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.clientesLista.selection.clienteId",
                  "type": "string",
                  "description": "Cliente selecionado na lista para ações futuras.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.clientesLista.view.compact",
                  "type": "boolean",
                  "description": "Alternar visualização compacta da tabela.",
                  "priority": "optional",
                  "initialValue": "false"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "clienteCpfMascarado",
                  "derivedFrom": [
                    "db.cliente[].cpf"
                  ],
                  "description": "CPF formatado com máscara padrão.",
                  "priority": "recommended"
                },
                {
                  "fieldId": "clienteCnhMascarado",
                  "derivedFrom": [
                    "db.cliente[].cnh"
                  ],
                  "description": "CNH formatada com máscara padrão.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "locadora.clientesLista.selecionarCliente",
                  "payload": "{clienteId}",
                  "writesState": "ui.clientesLista.selection.clienteId"
                }
              ]
            },
            {
              "organismName": "clientesListaSearch",
              "purpose": "Permitir busca e refinamento da lista de clientes.",
              "rulesApplied": [
                "rule_papel_admin_unico",
                "rule_idioma_pt_br",
                "rule_tom_profissional_conciso",
                "rule_cpf_cnh_formato_mascara",
                "rule_bloqueio_cliente_cpf_cnh_invalidos"
              ],
              "dataShape": {
                "shape": "fields",
                "entityFields": [
                  {
                    "entity": "cliente",
                    "entityField": "nome",
                    "stateKey": "db.cliente.nome",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Filtro textual por nome."
                  },
                  {
                    "entity": "cliente",
                    "entityField": "cpf",
                    "stateKey": "db.cliente.cpf",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Filtro por CPF com máscara."
                  },
                  {
                    "entity": "cliente",
                    "entityField": "cnh",
                    "stateKey": "db.cliente.cnh",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Filtro por CNH com máscara."
                  },
                  {
                    "entity": "cliente",
                    "entityField": "telefone",
                    "stateKey": "db.cliente.telefone",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Filtro por telefone."
                  },
                  {
                    "entity": "cliente",
                    "entityField": "email",
                    "stateKey": "db.cliente.email",
                    "priority": "optional",
                    "usage": "filter",
                    "priorityReason": "Filtro por e-mail."
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.clientesLista.filter.nome",
                  "type": "string",
                  "description": "Texto parcial do nome do cliente.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.clientesLista.filter.cpf",
                  "type": "string",
                  "description": "CPF com máscara para busca exata.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.clientesLista.filter.cnh",
                  "type": "string",
                  "description": "CNH com máscara para busca exata.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.clientesLista.filter.telefone",
                  "type": "string",
                  "description": "Telefone com DDD para busca.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.clientesLista.filter.email",
                  "type": "string",
                  "description": "E-mail para busca exata ou parcial.",
                  "priority": "optional"
                },
                {
                  "stateKey": "ui.clientesLista.filter.statusValidacao",
                  "type": "string",
                  "description": "Filtro por situação de validação de CPF/CNH.",
                  "priority": "optional",
                  "initialValue": "todos"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "filtrosAtivos",
                  "derivedFrom": [
                    "ui.clientesLista.filter.nome",
                    "ui.clientesLista.filter.cpf",
                    "ui.clientesLista.filter.cnh",
                    "ui.clientesLista.filter.telefone",
                    "ui.clientesLista.filter.email",
                    "ui.clientesLista.filter.statusValidacao"
                  ],
                  "description": "Indica se há filtros ativos para destacar o estado da busca.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "locadora.clientesLista.buscar",
                  "payload": "{nome,cpf,cnh,telefone,email,statusValidacao}",
                  "writesState": "ui.clientesLista.search.lastPayload"
                },
                {
                  "event": "locadora.clientesLista.limparFiltros",
                  "payload": "{}",
                  "writesState": "ui.clientesLista.filter.*"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.clientesLista.loadingList",
          "description": "Carregamento da listagem de clientes.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.clientesLista.loadingSearch",
          "description": "Aplicação de filtros e busca.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.clientesLista.error",
          "description": "Erro ao consultar clientes.",
          "values": [
            "idle",
            "error"
          ]
        }
      ],
      "tempStates": [
        {
          "stateKey": "ui.clientesLista.pagination.page",
          "type": "number",
          "description": "Página atual da listagem.",
          "priority": "recommended",
          "initialValue": "1"
        },
        {
          "stateKey": "ui.clientesLista.pagination.pageSize",
          "type": "number",
          "description": "Quantidade de itens por página.",
          "priority": "recommended",
          "initialValue": "20"
        },
        {
          "stateKey": "ui.clientesLista.sort.by",
          "type": "string",
          "description": "Campo de ordenação da listagem.",
          "priority": "optional",
          "initialValue": "nome"
        },
        {
          "stateKey": "ui.clientesLista.sort.dir",
          "type": "string",
          "description": "Direção da ordenação da listagem.",
          "priority": "optional",
          "initialValue": "asc"
        },
        {
          "stateKey": "ui.clientesLista.search.lastPayload",
          "type": "object",
          "description": "Últimos filtros aplicados para repetição da consulta.",
          "priority": "optional"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/clientesLista.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l2/locadora/module.defs.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/clientesLista.defs.ts).definitionPage]]
\`\`\`

## Contracts
\`\`\`JSON
    [[(_102035_/l2/locadora/web/contracts/clientesLista.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/clientesLista.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/locadora/web/shared/clientesLista.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "_102035_/l1/locadora/layer_2_controllers/clientesLista.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-28T19:45:46Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "clientesLista.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-28T19:45:46Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "clientesLista.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-28T19:45:46Z"
  }
]
