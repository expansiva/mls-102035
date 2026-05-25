/// <mls fileReference="_102035_/l2/pizzaria/module.defs.ts" enhancement="_blank"/>


export const ontology = {
  "meta": {
    "userLanguage": "pt",
    "moduleName": "pizzaria",
    "userPromptOriginal": "Clarification 1/2",
    "userPromptFinal": "Criar módulo de gestão de pizzaria principalmente interno com área pública para pedidos online. Perfis: admin, caixa, atendente, cozinha e entregador. Tom profissional e conciso. Idioma: português. Funcionalidades obrigatórias: cadastro de produtos, controle de pedidos, cozinha, entregas, caixa e estoque. Integrações: pagamentos online e WhatsApp. Fluxos de pedido: mesa, balcão e delivery. Status: recebido, em preparo, pronto, saiu para entrega, concluído. Incluir acompanhamento de pedido em tempo real, tempos‑alvo por etapa, combos e upsell no checkout, política de cancelamento e reembolso, zonas e taxas de entrega configuráveis, indisponibilidade de produtos por estoque e painel único de monitoramento de todos os pedidos com filtros por status e fluxo."
  },
  "ui": {
    "visualStyle": "Leve e amigável. Tema claro"
  },
  "ontology": {
    "entities": {
      "Usuario": {
        "description": "Usuário do sistema com perfil de acesso.",
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
              "caixa",
              "atendente",
              "cozinha",
              "entregador"
            ]
          },
          "ativo": {
            "type": "boolean"
          }
        },
        "rules": [
          "rule-access-profiles"
        ]
      },
      "Produto": {
        "description": "Item do cardápio da pizzaria.",
        "fields": {
          "id": {
            "type": "string"
          },
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
          "categoria": {
            "type": "string",
            "required": false
          },
          "ativo": {
            "type": "boolean"
          },
          "disponivel": {
            "type": "boolean",
            "required": false,
            "constraints": "Indica disponibilidade comercial do produto considerando estoque."
          }
        },
        "rules": [
          "rule-product-unavailability-by-stock"
        ]
      },
      "EstoqueItem": {
        "description": "Controle de estoque de insumos e produtos.",
        "fields": {
          "id": {
            "type": "string"
          },
          "produtoId": {
            "type": "string"
          },
          "quantidade": {
            "type": "number"
          },
          "unidade": {
            "type": "string"
          },
          "minimo": {
            "type": "number",
            "required": false
          }
        }
      },
      "Pedido": {
        "description": "Pedido de mesa, balcão ou delivery.",
        "fields": {
          "id": {
            "type": "string"
          },
          "tipo": {
            "type": "string",
            "values": [
              "mesa",
              "balcao",
              "delivery"
            ]
          },
          "status": {
            "type": "string",
            "values": [
              "recebido",
              "em preparo",
              "pronto",
              "saiu para entrega",
              "concluido",
              "cancelado",
              "reembolsado"
            ]
          },
          "itens": {
            "type": "array"
          },
          "total": {
            "type": "number"
          },
          "origem": {
            "type": "string",
            "values": [
              "interno",
              "publico"
            ]
          },
          "cliente": {
            "type": "string",
            "required": false
          },
          "enderecoEntrega": {
            "type": "string",
            "required": false
          },
          "zonaEntregaId": {
            "type": "string",
            "required": false
          },
          "taxaEntrega": {
            "type": "number",
            "required": false
          }
        },
        "rules": [
          "rule-order-flow",
          "rule-order-status",
          "rule-cancellation-refund-policy",
          "rule-delivery-zones-fees"
        ]
      },
      "Pagamento": {
        "description": "Registro de pagamento do pedido.",
        "fields": {
          "id": {
            "type": "string"
          },
          "pedidoId": {
            "type": "string"
          },
          "metodo": {
            "type": "string",
            "values": [
              "online"
            ]
          },
          "status": {
            "type": "string"
          },
          "valor": {
            "type": "number"
          }
        },
        "rules": [
          "rule-online-payments",
          "rule-cancellation-refund-policy"
        ]
      },
      "Entrega": {
        "description": "Entrega vinculada a pedido delivery.",
        "fields": {
          "id": {
            "type": "string"
          },
          "pedidoId": {
            "type": "string"
          },
          "entregadorId": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "values": [
              "saiu para entrega",
              "concluido"
            ]
          },
          "endereco": {
            "type": "string"
          }
        }
      },
      "ZonaEntrega": {
        "description": "Zona de entrega com taxa e prazo estimado configuráveis.",
        "fields": {
          "id": {
            "type": "string"
          },
          "nome": {
            "type": "string"
          },
          "taxa": {
            "type": "number"
          },
          "prazoEstimadoMin": {
            "type": "number",
            "required": false
          },
          "ativo": {
            "type": "boolean"
          }
        },
        "rules": [
          "rule-delivery-zones-fees"
        ]
      },
      "TempoAlvoEtapa": {
        "description": "Tempo-alvo por etapa do pedido para orientar produtividade.",
        "fields": {
          "id": {
            "type": "string"
          },
          "etapa": {
            "type": "string",
            "values": [
              "recebido",
              "em preparo",
              "pronto",
              "saiu para entrega"
            ]
          },
          "tempoAlvoMin": {
            "type": "number"
          },
          "ativo": {
            "type": "boolean"
          }
        },
        "rules": [
          "rule-target-time-per-stage"
        ]
      },
      "Combo": {
        "description": "Combo promocional para upsell no checkout.",
        "fields": {
          "id": {
            "type": "string"
          },
          "nome": {
            "type": "string"
          },
          "descricao": {
            "type": "string",
            "required": false
          },
          "itens": {
            "type": "array"
          },
          "preco": {
            "type": "number"
          },
          "ativo": {
            "type": "boolean"
          }
        }
      },
      "PoliticaCancelamentoReembolso": {
        "description": "Política padronizada de cancelamento e reembolso.",
        "fields": {
          "id": {
            "type": "string"
          },
          "condicoes": {
            "type": "string"
          },
          "prazoMaximoMin": {
            "type": "number",
            "required": false
          },
          "permiteReembolso": {
            "type": "boolean"
          },
          "ativo": {
            "type": "boolean"
          }
        },
        "rules": [
          "rule-cancellation-refund-policy"
        ]
      },
      "ItemPedido": {
        "description": "Item de pedido vinculando produto e quantidade.",
        "fields": {
          "id": {
            "type": "string"
          },
          "pedidoId": {
            "type": "string"
          },
          "produtoId": {
            "type": "string"
          },
          "quantidade": {
            "type": "number"
          },
          "precoUnitario": {
            "type": "number"
          },
          "observacoes": {
            "type": "string",
            "required": false
          }
        },
        "rules": [
          "rule-product-unavailability-by-stock"
        ]
      },
      "ConfiguracaoWhatsApp": {
        "description": "Parâmetros persistentes da integração com WhatsApp.",
        "fields": {
          "id": {
            "type": "string"
          },
          "numeroTelefone": {
            "type": "string"
          },
          "tokenAcesso": {
            "type": "string",
            "required": false
          },
          "webhookUrl": {
            "type": "string",
            "required": false
          },
          "ativo": {
            "type": "boolean"
          }
        },
        "rules": [
          "rule-whatsapp-integration"
        ]
      },
      "RegraUpsell": {
        "description": "Regra de sugestão de upsell entre produtos.",
        "fields": {
          "id": {
            "type": "string"
          },
          "produtoBaseId": {
            "type": "string"
          },
          "produtoSugeridoId": {
            "type": "string"
          },
          "prioridade": {
            "type": "number",
            "required": false
          },
          "ativo": {
            "type": "boolean"
          }
        }
      }
    }
  },
  "rules": {
    "rule-access-profiles": {
      "kind": "policy",
      "description": "O sistema deve suportar os perfis de acesso admin, caixa, atendente, cozinha e entregador.",
      "scope": [
        "Usuario"
      ],
      "acceptanceCriteria": [
        "Usuário só pode ter um perfil dentro do conjunto definido.",
        "Perfis fora do conjunto não são permitidos."
      ]
    },
    "rule-internal-with-public-area": {
      "kind": "domain",
      "description": "O módulo é principalmente interno, mas deve existir uma área pública para pedidos online.",
      "scope": [
        "Pedido"
      ],
      "acceptanceCriteria": [
        "Pedidos de origem pública devem ser possíveis.",
        "Pedidos internos devem continuar disponíveis."
      ]
    },
    "rule-tone-professional-concise": {
      "kind": "platform",
      "description": "As telas devem usar tom profissional e conciso.",
      "scope": [
        "global"
      ],
      "acceptanceCriteria": [
        "Textos de UI devem ser objetivos e profissionais."
      ]
    },
    "rule-language-pt": {
      "kind": "platform",
      "description": "O módulo deve estar disponível apenas em português.",
      "scope": [
        "global"
      ],
      "acceptanceCriteria": [
        "Nenhuma funcionalidade exige outros idiomas."
      ]
    },
    "rule-required-functionalities": {
      "kind": "domain",
      "description": "Funcionalidades obrigatórias: cadastro de produtos, controle de pedidos, cozinha, entregas, caixa e estoque.",
      "scope": [
        "global"
      ],
      "acceptanceCriteria": [
        "Todas as funcionalidades listadas devem existir no módulo."
      ]
    },
    "rule-online-payments": {
      "kind": "domain",
      "description": "O módulo deve suportar pagamentos online.",
      "scope": [
        "Pagamento"
      ],
      "acceptanceCriteria": [
        "Existe registro de pagamento com método online."
      ]
    },
    "rule-whatsapp-integration": {
      "kind": "platform",
      "description": "O módulo deve integrar com WhatsApp.",
      "scope": [
        "global"
      ],
      "acceptanceCriteria": [
        "Há capacidade para enviar ou receber informações via WhatsApp."
      ]
    },
    "rule-order-flow": {
      "kind": "domain",
      "description": "O fluxo de pedido deve suportar mesa, balcão e delivery.",
      "scope": [
        "Pedido"
      ],
      "acceptanceCriteria": [
        "Tipo do pedido deve ser mesa, balcão ou delivery."
      ]
    },
    "rule-order-status": {
      "kind": "domain",
      "description": "Status de pedido permitidos: recebido, em preparo, pronto, saiu para entrega, concluído, cancelado e reembolsado.",
      "scope": [
        "Pedido"
      ],
      "acceptanceCriteria": [
        "Pedidos não podem ter status fora do conjunto definido."
      ]
    },
    "rule-real-time-tracking": {
      "kind": "domain",
      "description": "Clientes e operação devem poder acompanhar o status do pedido em tempo real.",
      "scope": [
        "Pedido",
        "capability:acompanhamentoPedidoTempoReal"
      ],
      "acceptanceCriteria": [
        "O status do pedido é visível e atualizado ao longo do fluxo."
      ]
    },
    "rule-target-time-per-stage": {
      "kind": "policy",
      "description": "Deve existir política de tempo-alvo por etapa do pedido para orientar produtividade.",
      "scope": [
        "TempoAlvoEtapa",
        "capability:gestaoTempoAlvoEtapas"
      ],
      "acceptanceCriteria": [
        "Cada etapa relevante pode ter tempo-alvo configurado.",
        "A política pode ser ativada ou ajustada."
      ]
    },
    "rule-cancellation-refund-policy": {
      "kind": "policy",
      "description": "Deve existir política padronizada de cancelamento e reembolso.",
      "scope": [
        "Pedido",
        "Pagamento",
        "PoliticaCancelamentoReembolso",
        "capability:gestaoCancelamentoReembolso"
      ],
      "acceptanceCriteria": [
        "Cancelamentos seguem regras definidas.",
        "Reembolsos são registrados conforme a política."
      ]
    },
    "rule-delivery-zones-fees": {
      "kind": "policy",
      "description": "Zonas e taxas de entrega devem ser configuráveis.",
      "scope": [
        "ZonaEntrega",
        "Pedido",
        "capability:gestaoZonasEntrega"
      ],
      "acceptanceCriteria": [
        "Pedidos delivery podem referenciar uma zona configurada.",
        "Taxa de entrega é atribuída conforme a zona."
      ]
    },
    "rule-product-unavailability-by-stock": {
      "kind": "domain",
      "description": "Produtos devem ser marcados como indisponíveis quando o estoque não permite atendimento.",
      "scope": [
        "Produto",
        "EstoqueItem",
        "capability:gestaoIndisponibilidadeProdutos"
      ],
      "acceptanceCriteria": [
        "Produtos sem estoque suficiente não podem ser vendidos.",
        "A indisponibilidade é refletida no cardápio."
      ]
    },
    "rule-order-monitoring-dashboard": {
      "kind": "domain",
      "description": "Deve existir painel único de monitoramento de pedidos com filtros por status e fluxo.",
      "scope": [
        "capability:painelMonitoramentoPedidos",
        "Pedido"
      ],
      "acceptanceCriteria": [
        "É possível visualizar todos os pedidos em um único painel.",
        "O painel permite filtrar por status.",
        "O painel permite filtrar por fluxo (mesa, balcão, delivery)."
      ]
    }
  },
  "capabilities": {
    "cadastroProdutos": {
      "description": "Cadastrar e gerenciar produtos do cardápio.",
      "usesRules": [
        "rule-required-functionalities",
        "rule-product-unavailability-by-stock"
      ]
    },
    "controlePedidos": {
      "description": "Criar e acompanhar pedidos internos e públicos.",
      "usesRules": [
        "rule-internal-with-public-area",
        "rule-order-flow",
        "rule-order-status",
        "rule-real-time-tracking",
        "rule-cancellation-refund-policy",
        "rule-delivery-zones-fees",
        "rule-product-unavailability-by-stock"
      ]
    },
    "cozinha": {
      "description": "Visualizar e atualizar pedidos em preparo.",
      "usesRules": [
        "rule-order-status",
        "rule-target-time-per-stage"
      ]
    },
    "entregas": {
      "description": "Gerenciar entregas e atribuição de entregador.",
      "usesRules": [
        "rule-order-flow",
        "rule-order-status",
        "rule-target-time-per-stage",
        "rule-delivery-zones-fees"
      ]
    },
    "caixa": {
      "description": "Registrar e conferir pagamentos.",
      "usesRules": [
        "rule-online-payments",
        "rule-cancellation-refund-policy"
      ]
    },
    "estoque": {
      "description": "Controlar níveis de estoque e alertas mínimos.",
      "usesRules": [
        "rule-required-functionalities",
        "rule-product-unavailability-by-stock"
      ]
    },
    "integracaoWhatsApp": {
      "description": "Integração com WhatsApp para comunicação de pedidos.",
      "usesRules": [
        "rule-whatsapp-integration"
      ],
      "isOptional": false,
      "actions": [
        {
          "actionId": "enviarMensagem",
          "description": "Enviar confirmação e atualizações de pedido via WhatsApp."
        }
      ]
    },
    "areaPublicaPedidos": {
      "description": "Área pública para pedidos online.",
      "usesRules": [
        "rule-internal-with-public-area",
        "rule-real-time-tracking"
      ],
      "actions": [
        {
          "actionId": "criarPedidoPublico",
          "description": "Permitir que clientes façam pedidos online."
        }
      ]
    },
    "acompanhamentoPedidoTempoReal": {
      "description": "Acompanhar o status do pedido em tempo real.",
      "usesRules": [
        "rule-real-time-tracking",
        "rule-order-status"
      ],
      "actions": [
        {
          "actionId": "visualizarStatusAtual",
          "description": "Exibir o status atual do pedido ao longo do fluxo."
        }
      ]
    },
    "gestaoTempoAlvoEtapas": {
      "description": "Definir tempos-alvo por etapa do pedido.",
      "usesRules": [
        "rule-target-time-per-stage"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "configurarTempoAlvo",
          "description": "Configurar tempos-alvo por etapa do pedido."
        }
      ]
    },
    "combosUpsellCheckout": {
      "description": "Oferecer combos e sugestões de upsell no checkout.",
      "usesRules": [],
      "isOptional": true,
      "actions": [
        {
          "actionId": "sugerirCombo",
          "description": "Exibir combos relevantes durante o fechamento do pedido."
        },
        {
          "actionId": "sugerirUpsell",
          "description": "Sugerir itens complementares no checkout."
        }
      ]
    },
    "gestaoCancelamentoReembolso": {
      "description": "Aplicar política de cancelamento e reembolso.",
      "usesRules": [
        "rule-cancellation-refund-policy"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "cancelarPedido",
          "description": "Cancelar pedido conforme política definida."
        },
        {
          "actionId": "registrarReembolso",
          "description": "Registrar reembolso quando aplicável."
        }
      ]
    },
    "gestaoZonasEntrega": {
      "description": "Gerenciar zonas e taxas de entrega.",
      "usesRules": [
        "rule-delivery-zones-fees"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "criarZonaEntrega",
          "description": "Cadastrar zona com taxa e prazo estimado."
        },
        {
          "actionId": "atualizarZonaEntrega",
          "description": "Atualizar parâmetros de zona de entrega."
        }
      ]
    },
    "gestaoIndisponibilidadeProdutos": {
      "description": "Bloquear venda de produtos sem estoque disponível.",
      "usesRules": [
        "rule-product-unavailability-by-stock"
      ],
      "actions": [
        {
          "actionId": "marcarIndisponivel",
          "description": "Marcar produto como indisponível por falta de estoque."
        }
      ]
    },
    "painelMonitoramentoPedidos": {
      "description": "Painel único para monitorar todos os pedidos com filtros por status e fluxo.",
      "usesRules": [
        "rule-order-monitoring-dashboard",
        "rule-order-status",
        "rule-order-flow"
      ],
      "actions": [
        {
          "actionId": "visualizarTodosPedidos",
          "description": "Exibir todos os pedidos em um único painel."
        },
        {
          "actionId": "filtrarPorStatus",
          "description": "Filtrar pedidos por status."
        },
        {
          "actionId": "filtrarPorFluxo",
          "description": "Filtrar pedidos por tipo de fluxo (mesa, balcão, delivery)."
        }
      ]
    }
  }
}
