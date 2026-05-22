/// <mls fileReference="_102035_/l2/pizzaria/metasTempoConfiguracao.defs.ts"  enhancement="_blank"/>

export const definition = {
  "pages": [
    {
      "screenId": "102035_2",
      "pageName": "metasTempoConfiguracao",
      "actor": "admin",
      "purpose": "Configurar metas de tempo por etapa e visualizar desvios para controle operacional interno.",
      "sections": [
        {
          "sectionName": "header",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "metasTempoConfiguracaoHeader",
              "purpose": "Apresentar contexto da configuração e ações rápidas.",
              "rulesApplied": [
                "ruleMetasTempoEtapas",
                "ruleIdiomaPt",
                "ruleTomProfissionalConcisao",
                "ruleModuloInterno"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.pizzaria.metasTempoResumo",
                "sourceRoutine": "pizzaria.getMetasTempoEtapas",
                "fields": [
                  {
                    "entityField": "metaRecebidoMin",
                    "entity": "MetasTempo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Meta da etapa inicial para controle de SLA."
                  },
                  {
                    "entityField": "metaProntoMin",
                    "entity": "MetasTempo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Meta intermediária para produção."
                  },
                  {
                    "entityField": "metaEntregueMin",
                    "entity": "MetasTempo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Meta final para entrega."
                  },
                  {
                    "entityField": "atualizadoEm",
                    "entity": "MetasTempo",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Transparência sobre última atualização."
                  }
                ],
                "params": []
              },
              "tempStates": [
                {
                  "stateKey": "ui.metasTempoConfiguracao.editMode",
                  "type": "boolean",
                  "description": "Habilita edição das metas.",
                  "priority": "recommended",
                  "initialValue": "false"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "metaTotalMin",
                  "derivedFrom": [
                    "db.pizzaria.metasTempoResumo.metaRecebidoMin",
                    "db.pizzaria.metasTempoResumo.metaProntoMin",
                    "db.pizzaria.metasTempoResumo.metaEntregueMin"
                  ],
                  "description": "Soma das metas por etapa para referência global.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "metasTempoEditar",
                  "payload": "ui.metasTempoConfiguracao.editMode=true",
                  "writesState": "ui.metasTempoConfiguracao.editMode"
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
              "organismName": "metasTempoConfiguracaoForm",
              "purpose": "Editar e salvar metas de tempo por etapa.",
              "rulesApplied": [
                "ruleMetasTempoEtapas",
                "ruleIdiomaPt",
                "ruleTomProfissionalConcisao",
                "ruleModuloInterno"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.pizzaria.metasTempo",
                "sourceRoutine": "pizzaria.getMetasTempoEtapas",
                "fields": [
                  {
                    "entityField": "metaRecebidoMin",
                    "entity": "MetasTempo",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Define limite aceitável para início do preparo."
                  },
                  {
                    "entityField": "metaProntoMin",
                    "entity": "MetasTempo",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Define limite aceitável para finalização da produção."
                  },
                  {
                    "entityField": "metaEntregueMin",
                    "entity": "MetasTempo",
                    "priority": "required",
                    "usage": "edit",
                    "priorityReason": "Define limite aceitável para entrega ao cliente."
                  },
                  {
                    "entityField": "observacao",
                    "entity": "MetasTempo",
                    "priority": "optional",
                    "usage": "edit",
                    "priorityReason": "Justificativa operacional opcional."
                  },
                  {
                    "entityField": "atualizadoEm",
                    "entity": "MetasTempo",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Registro de auditoria."
                  },
                  {
                    "entityField": "atualizadoPor",
                    "entity": "MetasTempo",
                    "priority": "recommended",
                    "usage": "display",
                    "priorityReason": "Responsável pela alteração."
                  }
                ],
                "params": []
              },
              "tempStates": [
                {
                  "stateKey": "ui.metasTempoConfiguracao.form.changed",
                  "type": "boolean",
                  "description": "Indica se há alterações pendentes.",
                  "priority": "recommended",
                  "initialValue": "false"
                },
                {
                  "stateKey": "ui.metasTempoConfiguracao.form.validationError",
                  "type": "string",
                  "description": "Mensagem de validação quando metas são inválidas.",
                  "priority": "optional",
                  "initialValue": "''"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "metasValidas",
                  "derivedFrom": [
                    "db.pizzaria.metasTempo.metaRecebidoMin",
                    "db.pizzaria.metasTempo.metaProntoMin",
                    "db.pizzaria.metasTempo.metaEntregueMin"
                  ],
                  "description": "Valida se metas são maiores que zero e consistentes.",
                  "priority": "required"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "metasTempoSalvar",
                  "payload": "db.pizzaria.metasTempo",
                  "writesState": "ui.metasTempoConfiguracao.save"
                }
              ]
            },
            {
              "organismName": "metasTempoConfiguracaoDesviosResumo",
              "purpose": "Exibir resumo dos desvios mais recentes por etapa.",
              "rulesApplied": [
                "ruleMetasTempoEtapas",
                "ruleIdiomaPt",
                "ruleTomProfissionalConcisao",
                "ruleModuloInterno"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.pizzaria.desviosTempo[]",
                "sourceRoutine": "pizzaria.listDesviosTempo",
                "itemFields": [
                  {
                    "entityField": "pedidoId",
                    "entity": "DesvioTempo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Referência ao pedido com desvio."
                  },
                  {
                    "entityField": "etapa",
                    "entity": "DesvioTempo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Identifica em qual etapa ocorreu o desvio."
                  },
                  {
                    "entityField": "tempoDecorridoMin",
                    "entity": "DesvioTempo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Quantifica o desvio para priorização."
                  },
                  {
                    "entityField": "metaMin",
                    "entity": "DesvioTempo",
                    "priority": "required",
                    "usage": "display",
                    "priorityReason": "Comparação direta com meta."
                  },
                  {
                    "entityField": "criadoEm",
                    "entity": "DesvioTempo",
                    "priority": "recommended",
                    "usage": "sort",
                    "priorityReason": "Ordenação por recência."
                  },
                  {
                    "entityField": "statusPedido",
                    "entity": "DesvioTempo",
                    "priority": "recommended",
                    "usage": "filter",
                    "priorityReason": "Filtrar por status do pedido."
                  }
                ],
                "params": [
                  {
                    "paramName": "periodoDias",
                    "type": "number",
                    "source": {
                      "from": "state",
                      "stateKey": "ui.metasTempoConfiguracao.filtro.periodoDias"
                    }
                  }
                ],
                "editable": false
              },
              "tempStates": [
                {
                  "stateKey": "ui.metasTempoConfiguracao.filtro.periodoDias",
                  "type": "number",
                  "description": "Período em dias para consulta de desvios.",
                  "priority": "recommended",
                  "initialValue": "7"
                },
                {
                  "stateKey": "ui.metasTempoConfiguracao.filtro.etapa",
                  "type": "string",
                  "description": "Filtra por etapa específica.",
                  "priority": "optional",
                  "initialValue": "''"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "desvioPercentual",
                  "derivedFrom": [
                    "db.pizzaria.desviosTempo[].tempoDecorridoMin",
                    "db.pizzaria.desviosTempo[].metaMin"
                  ],
                  "description": "Percentual de desvio sobre a meta.",
                  "priority": "optional"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "verPedido",
                  "target": "pizzaria/pedidos/detalhe",
                  "params": [
                    "db.pizzaria.desviosTempo[].pedidoId"
                  ],
                  "priority": "optional",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "desviosAtualizar",
                  "payload": "ui.metasTempoConfiguracao.filtro",
                  "writesState": "ui.metasTempoConfiguracao.load"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.metasTempoConfiguracao.load",
          "description": "Carregamento inicial das metas e desvios.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.metasTempoConfiguracao.save",
          "description": "Salvar alterações das metas.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.metasTempoConfiguracao.error",
          "description": "Erro geral da página.",
          "values": [
            "idle",
            "error"
          ]
        }
      ],
      "tempStates": [
        {
          "stateKey": "ui.metasTempoConfiguracao.toast",
          "type": "string",
          "description": "Mensagem de feedback ao usuário.",
          "priority": "optional",
          "initialValue": "''"
        },
        {
          "stateKey": "ui.metasTempoConfiguracao.refreshIntervalMin",
          "type": "number",
          "description": "Intervalo de atualização automática dos desvios.",
          "priority": "optional",
          "initialValue": "5"
        }
      ]
    }
  ]
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/metasTempoConfiguracao.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/metasTempoConfiguracao.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/metasTempoConfiguracao.defs.ts).definition]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/metasTempoConfiguracao.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controllers/metasTempoConfiguracao.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-22T18:13:25Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "/l2/pizzaria/web/shared/metasTempoConfiguracao.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageShared.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-22T18:13:25Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "/l2/pizzaria/web/desktop/page11/metasTempoConfiguracao.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageRender.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-22T18:13:25Z"
  }
]
