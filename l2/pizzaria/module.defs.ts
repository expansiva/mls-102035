/// <mls fileReference="_102035_/l2/pizzaria/module.defs.ts" enhancement="_blank"/>


export const ontology = {
  "meta": {
    "userLanguage": "pt",
    "moduleName": "pizzaria",
    "userPromptOriginal": "Criar módulo de controle de pizzaria.",
    "userPromptFinal": "Criar módulo de controle de pizzaria para pizzarias pequenas e médias com atendimento balcão e delivery, com tom amigável e simples porém profissional, suporte apenas a Português (pt-BR), para perfis admin, atendente, operador de caixa, pizzaiolo e entregador. Funcionalidades: pedidos balcão e delivery, cardápio, controle de produção, estoque básico e financeiro simples. Fluxo: pedido entra, passa por confirmação com resumo e ETA antes de produção, vai para produção com status, imprime comanda e pode enviar atualização por WhatsApp. Relatórios de vendas por dia e por produto. Sem integração com maquininhas por enquanto. Incluir políticas de cancelamento e reembolso com motivo obrigatório, janelas de entrega e tempo estimado por canal, taxas de entrega por região com valor mínimo, mensagens padronizadas para WhatsApp específicas por status e controle de caixa com abertura, sangria e fechamento diário."
  },
  "ui": {
    "visualStyle": "Claro e amigável."
  },
  "ontology": {
    "entities": {
      "Usuario": {
        "description": "Pessoa que acessa o módulo com um perfil específico.",
        "fields": {
          "nome": {
            "type": "string"
          },
          "perfil": {
            "type": "string",
            "values": [
              "admin",
              "atendente",
              "operador de caixa",
              "pizzaiolo",
              "entregador"
            ]
          }
        },
        "rules": [
          "rule_access_roles"
        ]
      },
      "Pedido": {
        "description": "Registro de pedido balcão ou delivery.",
        "fields": {
          "canal": {
            "type": "string",
            "values": [
              "balcao",
              "delivery"
            ]
          },
          "status": {
            "type": "string",
            "values": [
              "recebido",
              "confirmado",
              "emProducao",
              "pronto",
              "emEntrega",
              "entregue",
              "cancelado"
            ]
          },
          "itens": {
            "type": "array",
            "constraints": "Lista de itens do cardápio com quantidade."
          },
          "total": {
            "type": "number"
          },
          "dataHora": {
            "type": "datetime"
          },
          "clienteContato": {
            "type": "string",
            "required": false
          },
          "motivoCancelamento": {
            "type": "string",
            "required": false,
            "constraints": "Obrigatório quando o status for cancelado."
          },
          "tempoEstimadoMin": {
            "type": "number",
            "required": false,
            "constraints": "ETA do pedido em minutos, definido na confirmação."
          }
        },
        "rules": [
          "rule_order_flow",
          "rule_order_confirmation",
          "rule_whatsapp_updates",
          "rule_print_ticket",
          "rule_cancel_refund_policy",
          "rule_delivery_windows",
          "rule_delivery_fee_policy",
          "rule_whatsapp_message_policy"
        ]
      },
      "ItemCardapio": {
        "description": "Item disponível para venda no cardápio.",
        "fields": {
          "nome": {
            "type": "string"
          },
          "descricao": {
            "type": "string",
            "required": false
          },
          "preco": {
            "type": "number"
          },
          "ativo": {
            "type": "boolean"
          }
        }
      },
      "Producao": {
        "description": "Controle de produção dos pedidos.",
        "fields": {
          "pedidoId": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "values": [
              "emProducao",
              "pronto"
            ]
          },
          "responsavel": {
            "type": "string",
            "required": false
          }
        }
      },
      "Estoque": {
        "description": "Controle básico de estoque de ingredientes e insumos.",
        "fields": {
          "item": {
            "type": "string"
          },
          "quantidade": {
            "type": "number"
          },
          "unidade": {
            "type": "string"
          }
        }
      },
      "Financeiro": {
        "description": "Registro simples de vendas e totais.",
        "fields": {
          "pedidoId": {
            "type": "string"
          },
          "valor": {
            "type": "number"
          },
          "dataHora": {
            "type": "datetime"
          }
        }
      },
      "PoliticaCancelamentoReembolso": {
        "description": "Políticas de cancelamento e reembolso com motivos obrigatórios.",
        "fields": {
          "motivosPermitidos": {
            "type": "array",
            "constraints": "Lista de motivos padronizados para cancelamento e reembolso."
          },
          "regras": {
            "type": "string",
            "constraints": "Condições gerais para cancelamento e reembolso."
          },
          "ativa": {
            "type": "boolean"
          }
        }
      },
      "ConfiguracaoEntrega": {
        "description": "Definição de janelas de entrega e tempo estimado padrão por canal.",
        "fields": {
          "canal": {
            "type": "string",
            "values": [
              "balcao",
              "delivery"
            ]
          },
          "janelaEntrega": {
            "type": "string",
            "constraints": "Intervalo de horário disponível para entrega."
          },
          "tempoEstimadoPadraoMin": {
            "type": "number",
            "constraints": "Tempo estimado padrão em minutos."
          },
          "ativa": {
            "type": "boolean"
          }
        }
      },
      "TaxaEntrega": {
        "description": "Política de taxa de entrega por região e valor mínimo.",
        "fields": {
          "regiao": {
            "type": "string"
          },
          "taxa": {
            "type": "number"
          },
          "valorMinimoPedido": {
            "type": "number"
          },
          "ativa": {
            "type": "boolean"
          }
        }
      },
      "MensagemWhatsAppPadrao": {
        "description": "Mensagens padronizadas para comunicação de status por WhatsApp.",
        "fields": {
          "statusPedido": {
            "type": "string",
            "values": [
              "recebido",
              "confirmado",
              "emProducao",
              "pronto",
              "emEntrega",
              "entregue",
              "cancelado"
            ]
          },
          "mensagem": {
            "type": "string"
          },
          "ativa": {
            "type": "boolean"
          }
        }
      },
      "Caixa": {
        "description": "Controle de caixa com abertura, sangria e fechamento diário.",
        "fields": {
          "data": {
            "type": "date"
          },
          "valorAbertura": {
            "type": "number"
          },
          "valorFechamento": {
            "type": "number",
            "required": false
          },
          "status": {
            "type": "string",
            "values": [
              "aberto",
              "fechado"
            ]
          }
        }
      },
      "MovimentoCaixa": {
        "description": "Movimentações de caixa como sangrias e entradas.",
        "fields": {
          "caixaId": {
            "type": "string"
          },
          "tipo": {
            "type": "string",
            "values": [
              "entrada",
              "sangria"
            ]
          },
          "valor": {
            "type": "number"
          },
          "dataHora": {
            "type": "datetime"
          },
          "observacao": {
            "type": "string",
            "required": false
          }
        }
      },
      "MovimentoEstoque": {
        "description": "Registro de movimentações de estoque (entrada/saída) com motivo.",
        "fields": {
          "id": {
            "type": "string"
          },
          "estoqueId": {
            "type": "string"
          },
          "tipo": {
            "type": "string",
            "values": [
              "entrada",
              "saida"
            ]
          },
          "quantidade": {
            "type": "number"
          },
          "dataHora": {
            "type": "datetime"
          },
          "motivo": {
            "type": "string"
          },
          "observacao": {
            "type": "string",
            "required": false
          }
        },
        "rules": [
          "rule_features_core"
        ]
      },
      "Reembolso": {
        "description": "Registro de reembolsos vinculados a pedidos cancelados.",
        "fields": {
          "id": {
            "type": "string"
          },
          "pedidoId": {
            "type": "string"
          },
          "valor": {
            "type": "number"
          },
          "dataHora": {
            "type": "datetime"
          },
          "motivo": {
            "type": "string"
          },
          "observacao": {
            "type": "string",
            "required": false
          }
        },
        "rules": [
          "rule_cancel_refund_policy"
        ]
      }
    }
  },
  "rules": {
    "rule_access_roles": {
      "kind": "policy",
      "description": "O módulo deve permitir acesso apenas aos perfis admin, atendente, operador de caixa, pizzaiolo e entregador.",
      "scope": [
        "Usuario"
      ],
      "acceptanceCriteria": [
        "Somente os perfis listados podem autenticar e visualizar funcionalidades autorizadas."
      ]
    },
    "rule_language_ptbr": {
      "kind": "platform",
      "description": "O módulo deve operar exclusivamente em Português (pt-BR).",
      "scope": [
        "global"
      ],
      "acceptanceCriteria": [
        "Todas as telas e mensagens exibidas estão em pt-BR."
      ]
    },
    "rule_tone": {
      "kind": "platform",
      "description": "A comunicação da interface deve ser amigável e simples, porém profissional.",
      "scope": [
        "global"
      ],
      "acceptanceCriteria": [
        "Textos de interface mantêm tom amigável e simples sem perder profissionalismo."
      ]
    },
    "rule_target_business": {
      "kind": "domain",
      "description": "O módulo é voltado para pizzarias pequenas e médias com atendimento balcão e delivery.",
      "scope": [
        "global"
      ],
      "acceptanceCriteria": [
        "Funcionalidades priorizam fluxos de balcão e delivery para operações pequenas e médias."
      ]
    },
    "rule_features_core": {
      "kind": "domain",
      "description": "O módulo deve incluir pedidos balcão e delivery, cardápio, controle de produção, estoque básico e financeiro simples.",
      "scope": [
        "global"
      ],
      "acceptanceCriteria": [
        "Existem telas e ações para pedidos, cardápio, produção, estoque básico e financeiro simples."
      ]
    },
    "rule_order_flow": {
      "kind": "domain",
      "description": "O fluxo de pedidos deve permitir entrada do pedido, confirmação, encaminhamento para produção com status e atualização de status.",
      "scope": [
        "Pedido",
        "Producao"
      ],
      "acceptanceCriteria": [
        "Pedido é criado com status recebido, confirmado antes de produção e pode avançar para emProducao, pronto, emEntrega e entregue."
      ]
    },
    "rule_order_confirmation": {
      "kind": "domain",
      "description": "Pedidos devem ser confirmados com resumo e ETA antes de seguir para produção.",
      "scope": [
        "Pedido"
      ],
      "acceptanceCriteria": [
        "Antes de enviar à produção, o pedido é confirmado com resumo e tempo estimado."
      ]
    },
    "rule_print_ticket": {
      "kind": "domain",
      "description": "Pedidos devem permitir impressão de comanda.",
      "scope": [
        "Pedido"
      ],
      "acceptanceCriteria": [
        "Existe ação para imprimir comanda de um pedido."
      ]
    },
    "rule_whatsapp_updates": {
      "kind": "domain",
      "description": "Pedidos podem enviar atualização de status por WhatsApp.",
      "scope": [
        "Pedido"
      ],
      "acceptanceCriteria": [
        "Existe opção de enviar atualização via WhatsApp quando o status muda."
      ]
    },
    "rule_reports_sales": {
      "kind": "domain",
      "description": "Devem existir relatórios de vendas por dia e por produto.",
      "scope": [
        "Financeiro"
      ],
      "acceptanceCriteria": [
        "Relatório diário de vendas e relatório por produto estão disponíveis."
      ]
    },
    "rule_no_card_machine_integration": {
      "kind": "policy",
      "description": "Não deve haver integração com maquininhas de pagamento neste momento.",
      "scope": [
        "global"
      ],
      "acceptanceCriteria": [
        "Nenhuma funcionalidade de integração com maquininhas é oferecida."
      ]
    },
    "rule_cancel_refund_policy": {
      "kind": "policy",
      "description": "Cancelamentos e reembolsos devem seguir políticas definidas e exigir motivo obrigatório.",
      "scope": [
        "Pedido",
        "PoliticaCancelamentoReembolso"
      ],
      "acceptanceCriteria": [
        "Ao cancelar um pedido, um motivo é obrigatório.",
        "Reembolsos seguem regras e motivos definidos na política."
      ]
    },
    "rule_delivery_windows": {
      "kind": "domain",
      "description": "Devem existir janelas de entrega e tempo estimado padrão por canal.",
      "scope": [
        "ConfiguracaoEntrega",
        "Pedido"
      ],
      "acceptanceCriteria": [
        "Para cada canal, existe uma janela de entrega e um tempo estimado padrão configurado."
      ]
    },
    "rule_delivery_fee_policy": {
      "kind": "domain",
      "description": "Deve haver políticas de taxa de entrega por região e valor mínimo de pedido.",
      "scope": [
        "TaxaEntrega",
        "Pedido"
      ],
      "acceptanceCriteria": [
        "Taxas de entrega são definidas por região com valor mínimo de pedido."
      ]
    },
    "rule_whatsapp_message_policy": {
      "kind": "policy",
      "description": "A comunicação de status por WhatsApp deve usar mensagens padronizadas.",
      "scope": [
        "MensagemWhatsAppPadrao",
        "Pedido"
      ],
      "acceptanceCriteria": [
        "Para cada status relevante existe uma mensagem padrão ativa."
      ]
    },
    "rule_cash_control": {
      "kind": "domain",
      "description": "O caixa deve permitir abertura, sangria e fechamento diário.",
      "scope": [
        "Caixa",
        "MovimentoCaixa"
      ],
      "acceptanceCriteria": [
        "Existe abertura diária de caixa com valor inicial.",
        "Sangrias podem ser registradas no caixa aberto.",
        "Fechamento diário registra valor final."
      ]
    }
  },
  "capabilities": {
    "gestaoPedidos": {
      "description": "Gerenciar pedidos de balcão e delivery com fluxo e status.",
      "usesRules": [
        "rule_features_core",
        "rule_order_flow",
        "rule_order_confirmation",
        "rule_print_ticket",
        "rule_whatsapp_updates",
        "rule_cancel_refund_policy",
        "rule_delivery_windows",
        "rule_delivery_fee_policy",
        "rule_whatsapp_message_policy"
      ],
      "actions": [
        {
          "actionId": "criarPedido",
          "description": "Registrar novo pedido de balcão ou delivery."
        },
        {
          "actionId": "confirmarPedido",
          "description": "Confirmar pedido com resumo e ETA antes de enviar à produção."
        },
        {
          "actionId": "atualizarStatus",
          "description": "Atualizar o status do pedido ao longo da produção e entrega."
        },
        {
          "actionId": "imprimirComanda",
          "description": "Imprimir comanda do pedido."
        },
        {
          "actionId": "enviarWhatsApp",
          "description": "Enviar atualização de status por WhatsApp."
        },
        {
          "actionId": "cancelarPedido",
          "description": "Cancelar pedido informando motivo obrigatório."
        },
        {
          "actionId": "registrarReembolso",
          "description": "Registrar reembolso conforme política definida."
        }
      ]
    },
    "cardapio": {
      "description": "Gerenciar itens do cardápio.",
      "usesRules": [
        "rule_features_core"
      ],
      "actions": [
        {
          "actionId": "criarItem",
          "description": "Cadastrar item do cardápio."
        },
        {
          "actionId": "editarItem",
          "description": "Atualizar informações de item do cardápio."
        },
        {
          "actionId": "desativarItem",
          "description": "Ativar ou desativar item do cardápio."
        }
      ]
    },
    "producao": {
      "description": "Controlar produção dos pedidos.",
      "usesRules": [
        "rule_features_core",
        "rule_order_flow"
      ],
      "actions": [
        {
          "actionId": "visualizarFila",
          "description": "Ver fila de produção."
        },
        {
          "actionId": "marcarPronto",
          "description": "Marcar pedido como pronto."
        }
      ]
    },
    "estoqueBasico": {
      "description": "Controle básico de estoque de insumos.",
      "usesRules": [
        "rule_features_core"
      ],
      "actions": [
        {
          "actionId": "registrarEntrada",
          "description": "Registrar entrada de estoque."
        },
        {
          "actionId": "registrarSaida",
          "description": "Registrar saída de estoque."
        }
      ]
    },
    "financeiroSimples": {
      "description": "Registrar vendas e consultar totais básicos.",
      "usesRules": [
        "rule_features_core",
        "rule_reports_sales"
      ],
      "actions": [
        {
          "actionId": "registrarVenda",
          "description": "Registrar venda associada a pedido."
        },
        {
          "actionId": "consultarTotais",
          "description": "Consultar totais de vendas."
        }
      ]
    },
    "relatorios": {
      "description": "Gerar relatórios de vendas por dia e por produto.",
      "usesRules": [
        "rule_reports_sales"
      ],
      "actions": [
        {
          "actionId": "relatorioDiario",
          "description": "Emitir relatório de vendas por dia."
        },
        {
          "actionId": "relatorioPorProduto",
          "description": "Emitir relatório de vendas por produto."
        }
      ]
    },
    "politicaCancelamentoReembolso": {
      "description": "Definir políticas de cancelamento e reembolso com motivos obrigatórios.",
      "usesRules": [
        "rule_cancel_refund_policy"
      ],
      "actions": [
        {
          "actionId": "definirPolitica",
          "description": "Cadastrar e manter políticas de cancelamento e reembolso."
        },
        {
          "actionId": "definirMotivos",
          "description": "Cadastrar motivos obrigatórios de cancelamento e reembolso."
        }
      ]
    },
    "configuracaoEntrega": {
      "description": "Configurar janelas de entrega e tempo estimado padrão por canal.",
      "usesRules": [
        "rule_delivery_windows"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "definirJanelaEntrega",
          "description": "Definir janela de entrega por canal."
        },
        {
          "actionId": "definirTempoEstimado",
          "description": "Definir tempo estimado padrão por canal."
        }
      ]
    },
    "taxaEntrega": {
      "description": "Gerenciar taxas de entrega por região e valor mínimo.",
      "usesRules": [
        "rule_delivery_fee_policy"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "definirTaxaPorRegiao",
          "description": "Definir taxa de entrega por região."
        },
        {
          "actionId": "definirValorMinimo",
          "description": "Definir valor mínimo de pedido por região."
        }
      ]
    },
    "mensagensWhatsApp": {
      "description": "Padronizar mensagens de status enviadas por WhatsApp específicas por status.",
      "usesRules": [
        "rule_whatsapp_message_policy"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "cadastrarMensagemPadrao",
          "description": "Cadastrar mensagem padrão por status."
        },
        {
          "actionId": "ativarMensagemPadrao",
          "description": "Ativar ou desativar mensagens padrão."
        },
        {
          "actionId": "configurarMensagensPorStatus",
          "description": "Configurar mensagens específicas para cada status do pedido."
        }
      ]
    },
    "controleCaixa": {
      "description": "Controlar caixa com abertura, sangria e fechamento diário.",
      "usesRules": [
        "rule_cash_control"
      ],
      "actions": [
        {
          "actionId": "abrirCaixa",
          "description": "Registrar abertura do caixa com valor inicial."
        },
        {
          "actionId": "registrarSangria",
          "description": "Registrar sangria no caixa aberto."
        },
        {
          "actionId": "fecharCaixa",
          "description": "Registrar fechamento do caixa com valor final."
        }
      ]
    }
  }
}
