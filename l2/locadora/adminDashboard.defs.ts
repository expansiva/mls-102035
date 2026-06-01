/// <mls fileReference="_102035_/l2/locadora/adminDashboard.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "admin-dashboard",
  "pageName": "adminDashboard",
  "actor": "admin",
  "purpose": "Acesso às áreas de frota, clientes e locações para cadastro e consulta.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "adminDashboardQuickAccessCards",
          "purpose": "Exibir atalhos para gestão de frota, clientes e locações.",
          "rulesApplied": [
            "rule_publico_interno",
            "rule_papel_admin_unico",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        },
        {
          "organismName": "adminDashboardSummaryPanel",
          "purpose": "Apresentar visão geral das áreas principais para consulta rápida.",
          "rulesApplied": [
            "rule_publico_interno",
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
      "screenId": "admin-dashboard",
      "pageName": "adminDashboard",
      "actor": "admin",
      "purpose": "Acesso às áreas de frota, clientes e locações para cadastro e consulta.",
      "sections": [
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "adminDashboardQuickAccessCards",
              "purpose": "Exibir atalhos para gestão de frota, clientes e locações.",
              "rulesApplied": [
                "rule_publico_interno",
                "rule_papel_admin_unico",
                "rule_idioma_pt_br",
                "rule_tom_profissional_conciso"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.adminDashboard.quickAccess",
                "sourceRoutine": "locadora.adminDashboard.getQuickAccess",
                "fields": [],
                "params": []
              },
              "tempStates": [
                {
                  "stateKey": "ui.adminDashboard.quickAccess.hoveredCard",
                  "type": "string",
                  "description": "Controla o cartão em foco para feedback visual.",
                  "priority": "optional",
                  "initialValue": "''"
                }
              ],
              "computedFields": [],
              "navigationFields": [
                {
                  "fieldId": "toGestaoFrota",
                  "target": "gestaoFrotaList",
                  "params": [],
                  "priority": "required",
                  "navigationType": "internal"
                },
                {
                  "fieldId": "toGestaoClientes",
                  "target": "gestaoClientesList",
                  "params": [],
                  "priority": "required",
                  "navigationType": "internal"
                },
                {
                  "fieldId": "toGestaoLocacoes",
                  "target": "gestaoLocacoesList",
                  "params": [],
                  "priority": "required",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "locadora.adminDashboard.navigate",
                  "payload": "{target:'gestaoFrotaList'|'gestaoClientesList'|'gestaoLocacoesList'}"
                }
              ]
            },
            {
              "organismName": "adminDashboardSummaryPanel",
              "purpose": "Apresentar visão geral das áreas principais para consulta rápida.",
              "rulesApplied": [
                "rule_publico_interno",
                "rule_papel_admin_unico",
                "rule_idioma_pt_br",
                "rule_tom_profissional_conciso"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.adminDashboard.summary",
                "sourceRoutine": "locadora.adminDashboard.getSummary",
                "fields": [
                  {
                    "entity": "veiculo",
                    "entityField": "status",
                    "priority": "recommended",
                    "usage": "display",
                    "nestedCollection": {
                      "stateKeySuffix": ".veiculos[]",
                      "itemFields": [
                        {
                          "entity": "veiculo",
                          "entityField": "placa",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entity": "veiculo",
                          "entityField": "modelo",
                          "priority": "recommended",
                          "usage": "display"
                        },
                        {
                          "entity": "veiculo",
                          "entityField": "categoria",
                          "priority": "recommended",
                          "usage": "display"
                        },
                        {
                          "entity": "veiculo",
                          "entityField": "status",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entity": "veiculo",
                          "entityField": "quilometragem",
                          "priority": "optional",
                          "usage": "display"
                        }
                      ]
                    }
                  },
                  {
                    "entity": "cliente",
                    "entityField": "cpf",
                    "priority": "recommended",
                    "usage": "display",
                    "nestedCollection": {
                      "stateKeySuffix": ".clientes[]",
                      "itemFields": [
                        {
                          "entity": "cliente",
                          "entityField": "nome",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entity": "cliente",
                          "entityField": "cpf",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entity": "cliente",
                          "entityField": "telefone",
                          "priority": "optional",
                          "usage": "display"
                        },
                        {
                          "entity": "cliente",
                          "entityField": "email",
                          "priority": "optional",
                          "usage": "display"
                        }
                      ]
                    }
                  },
                  {
                    "entity": "locacao",
                    "entityField": "dataRetirada",
                    "priority": "recommended",
                    "usage": "display",
                    "nestedCollection": {
                      "stateKeySuffix": ".locacoes[]",
                      "itemFields": [
                        {
                          "entity": "locacao",
                          "entityField": "dataRetirada",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entity": "locacao",
                          "entityField": "devolucaoPrevista",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entity": "locacao",
                          "entityField": "placaVeiculo",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entity": "locacao",
                          "entityField": "cpf",
                          "priority": "required",
                          "usage": "display"
                        },
                        {
                          "entity": "locacao",
                          "entityField": "valorDiario",
                          "priority": "optional",
                          "usage": "display"
                        }
                      ]
                    }
                  }
                ],
                "params": []
              },
              "tempStates": [
                {
                  "stateKey": "ui.adminDashboard.summary.filterStatus",
                  "type": "string",
                  "description": "Filtro rápido por status de veículo no painel.",
                  "priority": "optional",
                  "initialValue": "'disponível'"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "totalVeiculos",
                  "derivedFrom": [
                    "db.adminDashboard.summary.veiculos[]"
                  ],
                  "description": "Total de veículos cadastrados.",
                  "priority": "recommended"
                },
                {
                  "fieldId": "veiculosDisponiveis",
                  "derivedFrom": [
                    "db.adminDashboard.summary.veiculos[]"
                  ],
                  "description": "Total de veículos com status disponível.",
                  "priority": "recommended"
                },
                {
                  "fieldId": "totalClientes",
                  "derivedFrom": [
                    "db.adminDashboard.summary.clientes[]"
                  ],
                  "description": "Total de clientes cadastrados.",
                  "priority": "recommended"
                },
                {
                  "fieldId": "locacoesAtivas",
                  "derivedFrom": [
                    "db.adminDashboard.summary.locacoes[]"
                  ],
                  "description": "Total de locações em aberto conforme devolução prevista futura.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "openFrota",
                  "target": "gestaoFrotaList",
                  "params": [],
                  "priority": "optional",
                  "navigationType": "internal"
                },
                {
                  "fieldId": "openClientes",
                  "target": "gestaoClientesList",
                  "params": [],
                  "priority": "optional",
                  "navigationType": "internal"
                },
                {
                  "fieldId": "openLocacoes",
                  "target": "gestaoLocacoesList",
                  "params": [],
                  "priority": "optional",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "locadora.adminDashboard.refreshSummary",
                  "payload": "{}",
                  "writesState": "ui.adminDashboard.load"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.adminDashboard.load",
          "description": "Carregamento dos dados do dashboard.",
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
          "stateKey": "ui.adminDashboard.activeSection",
          "type": "string",
          "description": "Seção atual em foco no dashboard.",
          "priority": "optional",
          "initialValue": "'main'"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/adminDashboard.defs.ts).definitionPage]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l2/locadora/module.defs.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/adminDashboard.defs.ts).definitionPage]]
\`\`\`

## Contracts
\`\`\`JSON
    [[(_102035_/l2/locadora/web/contracts/adminDashboard.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/locadora/adminDashboard.defs.ts).definitionPage]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/locadora/web/shared/adminDashboard.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "_102035_/l1/locadora/layer_2_controllers/adminDashboard.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-29T17:10:17Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "adminDashboard.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-29T17:10:17Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "adminDashboard.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-29T17:10:17Z"
  }
]
