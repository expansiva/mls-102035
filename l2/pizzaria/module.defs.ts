/// <mls fileReference="_102035_/l2/pizzaria/module.defs.ts" enhancement="_blank"/>


export const ontology = {
  "meta": {
    "userLanguage": "pt",
    "moduleName": "pizzaria",
    "userPromptOriginal": "Criar módulo para gestão de pizzaria.",
    "userPromptFinal": "Criar módulo interno de pizzaria para equipe (admin, atendente, cozinheiro e entregador), com interface profissional e concisa, apenas em português, controlando pedidos, produção e entregas, com impressão de comanda e display na cozinha. O fluxo de pedidos deve suportar os status: recebido, em preparo, pronto, saiu para entrega e entregue. Incluir filtro rápido por status e por prioridade (ex.: tempo desde “recebido”) no painel principal para localizar pedidos críticos."
  },
  "ontology": {
    "entities": {
      "Pedido": {
        "description": "Registro central do pedido do cliente.",
        "fields": {
          "id": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "values": [
              "recebido",
              "em preparo",
              "pronto",
              "saiu para entrega",
              "entregue"
            ]
          },
          "criadoEm": {
            "type": "datetime"
          },
          "atualizadoEm": {
            "type": "datetime"
          },
          "itens": {
            "type": "array",
            "constraints": "Lista de itens do pedido."
          },
          "responsavelAtendimento": {
            "type": "string",
            "required": false
          },
          "observacoes": {
            "type": "string",
            "required": false
          },
          "formaPagamento": {
            "type": "string",
            "required": false
          },
          "statusPagamento": {
            "type": "string",
            "values": [
              "pendente",
              "pago",
              "parcial",
              "cancelado"
            ],
            "required": false
          },
          "observacaoCritica": {
            "type": "string",
            "required": false,
            "constraints": "Observação crítica que exige comunicação interna."
          }
        },
        "rules": [
          "rulePedidoStatusPermitidos",
          "ruleModuloInterno",
          "ruleIdiomaPt",
          "ruleRegistroPagamentoPedido",
          "ruleComunicacaoObservacaoCritica"
        ]
      },
      "ItemPedido": {
        "description": "Item individual de um pedido.",
        "fields": {
          "id": {
            "type": "string"
          },
          "pedidoId": {
            "type": "string"
          },
          "nome": {
            "type": "string"
          },
          "quantidade": {
            "type": "number"
          },
          "observacoes": {
            "type": "string",
            "required": false
          }
        },
        "rules": [
          "ruleModuloInterno",
          "ruleIdiomaPt"
        ]
      },
      "Producao": {
        "description": "Controle do processo de produção na cozinha.",
        "fields": {
          "id": {
            "type": "string"
          },
          "pedidoId": {
            "type": "string"
          },
          "statusProducao": {
            "type": "string",
            "values": [
              "em preparo",
              "pronto"
            ]
          },
          "inicioEm": {
            "type": "datetime",
            "required": false
          },
          "fimEm": {
            "type": "datetime",
            "required": false
          },
          "cozinheiroResponsavelId": {
            "type": "string",
            "required": false
          }
        },
        "rules": [
          "rulePedidoStatusPermitidos",
          "ruleDisplayCozinha",
          "ruleIdiomaPt",
          "ruleResponsavelObrigatorioParaAvancarStatus"
        ]
      },
      "Entrega": {
        "description": "Controle da entrega do pedido.",
        "fields": {
          "id": {
            "type": "string"
          },
          "pedidoId": {
            "type": "string"
          },
          "entregadorId": {
            "type": "string",
            "required": false
          },
          "statusEntrega": {
            "type": "string",
            "values": [
              "saiu para entrega",
              "entregue"
            ]
          },
          "inicioEm": {
            "type": "datetime",
            "required": false
          },
          "fimEm": {
            "type": "datetime",
            "required": false
          }
        },
        "rules": [
          "rulePedidoStatusPermitidos",
          "ruleIdiomaPt",
          "ruleResponsavelObrigatorioParaAvancarStatus"
        ]
      },
      "Usuario": {
        "description": "Usuário interno do sistema.",
        "fields": {
          "id": {
            "type": "string"
          },
          "nome": {
            "type": "string"
          },
          "perfil": {
            "type": "string",
            "values": [
              "admin",
              "atendente",
              "cozinheiro",
              "entregador"
            ]
          }
        },
        "rules": [
          "rulePerfisAcesso",
          "ruleModuloInterno",
          "ruleIdiomaPt"
        ]
      }
    }
  },
  "rules": {
    "rulePerfisAcesso": {
      "kind": "policy",
      "description": "Somente os perfis admin, atendente, cozinheiro e entregador têm acesso ao módulo.",
      "scope": [
        "Usuario",
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Apenas esses quatro perfis podem autenticar e usar o módulo.",
        "Qualquer outro perfil é bloqueado."
      ]
    },
    "ruleModuloInterno": {
      "kind": "platform",
      "description": "O módulo é de uso interno pela equipe, sem acesso para clientes externos.",
      "scope": [
        "entities",
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Não há funcionalidades expostas para clientes externos.",
        "Todas as ações são operadas por usuários internos."
      ]
    },
    "ruleTomProfissionalConcisao": {
      "kind": "policy",
      "description": "A interface e mensagens devem ter tom profissional e conciso.",
      "scope": [
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Textos de UI evitam informalidade e são objetivos.",
        "Mensagens são claras e diretas."
      ]
    },
    "ruleIdiomaPt": {
      "kind": "platform",
      "description": "O módulo deve operar apenas em português.",
      "scope": [
        "entities",
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Todos os textos e mensagens estão em português.",
        "Não há seleção de idioma."
      ]
    },
    "ruleProcessosPrincipais": {
      "kind": "domain",
      "description": "O módulo deve controlar pedidos, produção e entregas.",
      "scope": [
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Existem capacidades para gerir pedidos, produção e entregas."
      ]
    },
    "ruleImpressaoComanda": {
      "kind": "domain",
      "description": "Deve haver integração para impressão de comanda.",
      "scope": [
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Existe ação para imprimir comanda para pedidos."
      ]
    },
    "ruleDisplayCozinha": {
      "kind": "domain",
      "description": "Deve haver display na cozinha para acompanhamento da produção.",
      "scope": [
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Existe ação para exibir pedidos no display da cozinha."
      ]
    },
    "rulePedidoStatusPermitidos": {
      "kind": "domain",
      "description": "O pedido deve seguir os status: recebido, em preparo, pronto, saiu para entrega e entregue.",
      "scope": [
        "Pedido",
        "Producao",
        "Entrega"
      ],
      "acceptanceCriteria": [
        "O campo status do pedido aceita somente esses valores.",
        "A produção usa em preparo e pronto.",
        "A entrega usa saiu para entrega e entregue."
      ]
    },
    "ruleMetasTempoEtapas": {
      "kind": "domain",
      "description": "Existem metas de tempo por etapa (recebido→pronto→entregue) e monitoramento de desvios.",
      "scope": [
        "capabilities"
      ],
      "acceptanceCriteria": [
        "As metas por etapa podem ser definidas.",
        "Os desvios de tempo são identificados e registrados para análise."
      ]
    },
    "ruleResponsavelObrigatorioParaAvancarStatus": {
      "kind": "domain",
      "description": "Não é permitido avançar status de produção ou entrega sem responsável designado.",
      "scope": [
        "Producao",
        "Entrega",
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Produção só avança para em preparo/pronto com cozinheiro responsável definido.",
        "Entrega só avança para saiu para entrega/entregue com entregador definido."
      ]
    },
    "ruleRegistroPagamentoPedido": {
      "kind": "domain",
      "description": "O pedido deve registrar forma e status de pagamento.",
      "scope": [
        "Pedido",
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Cada pedido pode conter forma de pagamento.",
        "Cada pedido pode conter status de pagamento."
      ]
    },
    "ruleComunicacaoObservacaoCritica": {
      "kind": "policy",
      "description": "Observações críticas no pedido devem ser comunicadas internamente de forma clara.",
      "scope": [
        "Pedido",
        "capabilities"
      ],
      "acceptanceCriteria": [
        "Observação crítica é registrada no pedido.",
        "Observações críticas são destacadas para a equipe."
      ]
    }
  },
  "capabilities": {
    "gerirPedidos": {
      "description": "Criar, atualizar e acompanhar pedidos com seus status.",
      "usesRules": [
        "ruleProcessosPrincipais",
        "rulePedidoStatusPermitidos",
        "ruleIdiomaPt",
        "ruleTomProfissionalConcisao",
        "ruleModuloInterno",
        "ruleRegistroPagamentoPedido",
        "ruleComunicacaoObservacaoCritica"
      ],
      "actions": [
        {
          "actionId": "criarPedido",
          "description": "Registrar novo pedido com itens."
        },
        {
          "actionId": "atualizarStatusPedido",
          "description": "Atualizar o status do pedido conforme o fluxo definido."
        },
        {
          "actionId": "listarPedidos",
          "description": "Listar pedidos por status e data."
        },
        {
          "actionId": "filtrarPedidosPorStatusEPrioridade",
          "description": "Filtrar rapidamente pedidos por status e por prioridade (ex.: tempo desde recebido) no painel principal."
        },
        {
          "actionId": "registrarPagamentoPedido",
          "description": "Registrar forma e status de pagamento do pedido."
        },
        {
          "actionId": "sinalizarObservacaoCritica",
          "description": "Registrar e destacar observações críticas no pedido."
        }
      ]
    },
    "controlarProducao": {
      "description": "Gerenciar a produção na cozinha.",
      "usesRules": [
        "ruleProcessosPrincipais",
        "rulePedidoStatusPermitidos",
        "ruleDisplayCozinha",
        "ruleIdiomaPt",
        "ruleTomProfissionalConcisao",
        "ruleResponsavelObrigatorioParaAvancarStatus"
      ],
      "actions": [
        {
          "actionId": "iniciarPreparo",
          "description": "Marcar pedido como em preparo."
        },
        {
          "actionId": "finalizarPreparo",
          "description": "Marcar pedido como pronto."
        },
        {
          "actionId": "exibirNoDisplayCozinha",
          "description": "Mostrar pedidos no display da cozinha."
        },
        {
          "actionId": "designarCozinheiroResponsavel",
          "description": "Definir cozinheiro responsável pela produção do pedido."
        }
      ]
    },
    "gerirEntregas": {
      "description": "Gerenciar o fluxo de entregas.",
      "usesRules": [
        "ruleProcessosPrincipais",
        "rulePedidoStatusPermitidos",
        "ruleIdiomaPt",
        "ruleTomProfissionalConcisao",
        "ruleResponsavelObrigatorioParaAvancarStatus"
      ],
      "actions": [
        {
          "actionId": "atribuirEntregador",
          "description": "Atribuir um entregador ao pedido."
        },
        {
          "actionId": "marcarSaiuParaEntrega",
          "description": "Atualizar status para saiu para entrega."
        },
        {
          "actionId": "marcarEntregue",
          "description": "Atualizar status para entregue."
        }
      ]
    },
    "imprimirComanda": {
      "description": "Impressão de comanda para pedidos.",
      "usesRules": [
        "ruleImpressaoComanda",
        "ruleIdiomaPt",
        "ruleTomProfissionalConcisao"
      ],
      "actions": [
        {
          "actionId": "imprimirComandaPedido",
          "description": "Imprimir comanda do pedido."
        }
      ]
    },
    "administrarAcesso": {
      "description": "Gerenciar perfis e acesso interno.",
      "usesRules": [
        "rulePerfisAcesso",
        "ruleModuloInterno",
        "ruleIdiomaPt",
        "ruleTomProfissionalConcisao"
      ],
      "actions": [
        {
          "actionId": "cadastrarUsuario",
          "description": "Cadastrar usuário interno com perfil."
        },
        {
          "actionId": "atualizarPerfilUsuario",
          "description": "Alterar perfil de usuário interno."
        }
      ]
    },
    "monitorarMetasTempo": {
      "description": "Definir metas de tempo por etapa e monitorar desvios.",
      "usesRules": [
        "ruleMetasTempoEtapas",
        "ruleIdiomaPt",
        "ruleTomProfissionalConcisao",
        "ruleModuloInterno"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "definirMetasTempoEtapas",
          "description": "Definir metas de tempo para as etapas recebido, pronto e entregue."
        },
        {
          "actionId": "monitorarDesviosTempo",
          "description": "Identificar desvios em relação às metas de tempo."
        }
      ]
    }
  }
}
