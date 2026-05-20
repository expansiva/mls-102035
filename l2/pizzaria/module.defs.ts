/// <mls fileReference="_102035_/l2/pizzaria/module.defs.ts" enhancement="_blank"/>


export const ontology = {
  "meta": {
    "userLanguage": "pt",
    "moduleName": "pizzaria",
    "userPromptOriginal": "{\"taskId\":\"20260520203001.1001\",\"stepId\":0,\"title\":\"Clarification 1/2\",\"legends\":[\"This is the first clarification \",\"before creating somethings\"],\"userLanguage\":\"pt\",\"questions\":{\"roles\":{\"type\":\"open\",\"question\":\"Quais perfis de usuário vão usar o módulo (ex.: admin, atendente, pizzaiolo, entregador, financeiro)?\",\"answer\":\"Vou precisar de admin, atendente, pizzaiolo e entregador.\"},\"publicTarget\":{\"type\":\"open\",\"question\":\"O módulo é para uso interno da pizzaria ou terá uma parte pública para clientes?\",\"answer\":\"Será principalmente interno, sem área pública por enquanto.\"},\"tone\":{\"type\":\"open\",\"question\":\"Qual tom de comunicação você prefere nas telas e mensagens?\",\"answer\":\"Profissional e claro, direto ao ponto.\"},\"languages\":{\"type\":\"open\",\"question\":\"Quais idiomas o módulo deve suportar?\",\"answer\":\"Apenas português.\"},\"moduleName\":{\"type\":\"open\",\"question\":\"Qual nome você quer para o módulo? Sugestão: “Controle de Pizzaria”.\",\"answer\":\"Pode ser “pizzaria”.\"},\"openQuestion1\":{\"type\":\"open\",\"question\":\"Quais funcionalidades principais você precisa (ex.: cadastro de produtos, pedidos, mesas, delivery, estoque, financeiro)?\",\"answer\":\"Preciso de cadastro de produtos, pedidos, delivery e controle de estoque.\"},\"openQuestion2\":{\"type\":\"open\",\"question\":\"Como deve funcionar o fluxo de pedidos (ex.: balcão, telefone, app, tempo de preparo, status)?\",\"answer\":\"Pedidos entram pelo balcão e telefone, com status: recebido, em preparo, pronto e entregue.\"},\"openQuestion3\":{\"type\":\"open\",\"question\":\"Você precisa de relatórios específicos (ex.: vendas por período, itens mais vendidos, desempenho por entregador)?\",\"answer\":\"Sim, vendas por período e itens mais vendidos.\"}}}",
    "userPromptFinal": "Criar módulo interno para pizzaria com perfis admin, atendente, pizzaiolo e entregador. Tom profissional e claro, direto ao ponto. Suporte apenas ao idioma português. Funcionalidades: cadastro de produtos, pedidos, delivery e controle de estoque. Pedidos entram via balcão e telefone, com status recebido, em preparo, pronto e entregue. Relatórios: vendas por período e itens mais vendidos. Incluir registro de clientes com histórico de pedidos. Definir metas de tempo de preparo e entrega por status. Incluir controle de estoque mínimo e alertas de reposição. Padronizar roteiro de atendimento telefônico. Incluir checklist de confirmação no atendimento telefônico (endereço, forma de pagamento, observações)."
  },
  "ontology": {
    "entities": {
      "Customer": {
        "description": "Cliente registrado para histórico de pedidos.",
        "fields": {
          "customerId": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "phone": {
            "type": "string"
          },
          "notes": {
            "type": "string",
            "required": false
          }
        }
      },
      "CustomerOrderHistory": {
        "description": "Histórico de pedidos por cliente.",
        "fields": {
          "customerId": {
            "type": "string"
          },
          "orderId": {
            "type": "string"
          },
          "orderDate": {
            "type": "date"
          }
        }
      },
      "ServiceTimeTarget": {
        "description": "Metas de tempo por status do pedido.",
        "fields": {
          "status": {
            "type": "string",
            "values": [
              "recebido",
              "em preparo",
              "pronto",
              "entregue"
            ]
          },
          "targetMinutes": {
            "type": "number"
          }
        }
      },
      "InventoryReplenishmentRule": {
        "description": "Definição de estoque mínimo e alerta de reposição.",
        "fields": {
          "productId": {
            "type": "string"
          },
          "minimumStock": {
            "type": "number"
          },
          "replenishmentAlert": {
            "type": "string",
            "values": [
              "ativo",
              "inativo"
            ]
          }
        }
      },
      "PhoneOrderScript": {
        "description": "Roteiro padronizado para atendimento telefônico.",
        "fields": {
          "scriptId": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "content": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "values": [
              "ativo",
              "inativo"
            ]
          }
        }
      },
      "PhoneOrderChecklist": {
        "description": "Checklist de confirmação no atendimento telefônico.",
        "fields": {
          "checklistId": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "items": {
            "type": "string",
            "constraints": "Lista de itens de confirmação, ex.: endereço, forma de pagamento, observações."
          },
          "status": {
            "type": "string",
            "values": [
              "ativo",
              "inativo"
            ]
          }
        }
      }
    }
  },
  "rules": {
    "rule1": {
      "kind": "policy",
      "description": "O módulo deve ser de uso interno, sem área pública para clientes.",
      "scope": [
        "global"
      ]
    },
    "rule2": {
      "kind": "policy",
      "description": "O tom de comunicação nas telas e mensagens deve ser profissional, claro e direto ao ponto.",
      "scope": [
        "global"
      ]
    },
    "rule3": {
      "kind": "platform",
      "description": "O módulo deve suportar apenas o idioma português.",
      "scope": [
        "global"
      ]
    },
    "rule4": {
      "kind": "domain",
      "description": "Perfis de usuário obrigatórios: admin, atendente, pizzaiolo e entregador.",
      "scope": [
        "global"
      ]
    },
    "rule5": {
      "kind": "domain",
      "description": "Deve haver cadastro de produtos.",
      "scope": [
        "capability:productCatalog"
      ]
    },
    "rule6": {
      "kind": "domain",
      "description": "Deve haver gestão de pedidos.",
      "scope": [
        "capability:orderManagement"
      ]
    },
    "rule7": {
      "kind": "domain",
      "description": "Deve haver gestão de delivery.",
      "scope": [
        "capability:deliveryManagement"
      ]
    },
    "rule8": {
      "kind": "domain",
      "description": "Deve haver controle de estoque.",
      "scope": [
        "capability:inventoryControl"
      ]
    },
    "rule9": {
      "kind": "domain",
      "description": "Pedidos devem ser criados via balcão e telefone.",
      "scope": [
        "capability:orderManagement"
      ]
    },
    "rule10": {
      "kind": "domain",
      "description": "Status de pedido permitidos: recebido, em preparo, pronto, entregue.",
      "scope": [
        "capability:orderManagement"
      ],
      "acceptanceCriteria": [
        "O sistema deve validar que o status do pedido é um dos valores permitidos."
      ]
    },
    "rule11": {
      "kind": "domain",
      "description": "Relatórios obrigatórios: vendas por período e itens mais vendidos.",
      "scope": [
        "capability:reporting"
      ]
    },
    "rule12": {
      "kind": "domain",
      "description": "Deve haver registro de clientes com histórico de pedidos.",
      "scope": [
        "capability:customerManagement"
      ]
    },
    "rule13": {
      "kind": "domain",
      "description": "Metas de tempo de preparo e entrega devem ser definidas por status do pedido.",
      "scope": [
        "capability:serviceTimeManagement"
      ]
    },
    "rule14": {
      "kind": "domain",
      "description": "Deve existir controle de estoque mínimo e alertas de reposição.",
      "scope": [
        "capability:inventoryControl"
      ]
    },
    "rule15": {
      "kind": "policy",
      "description": "Deve haver roteiro padronizado de atendimento telefônico para pedidos.",
      "scope": [
        "capability:orderManagement"
      ]
    },
    "rule16": {
      "kind": "domain",
      "description": "Deve existir checklist de confirmação no atendimento telefônico (endereço, forma de pagamento, observações).",
      "scope": [
        "capability:phoneOrderChecklist"
      ],
      "acceptanceCriteria": [
        "O atendimento telefônico deve registrar confirmação dos itens do checklist para cada pedido por telefone."
      ]
    }
  },
  "capabilities": {
    "productCatalog": {
      "description": "Cadastro e manutenção de produtos.",
      "usesRules": [
        "rule5"
      ],
      "actions": [
        {
          "actionId": "createProduct",
          "description": "Criar produto."
        },
        {
          "actionId": "updateProduct",
          "description": "Atualizar produto."
        },
        {
          "actionId": "listProducts",
          "description": "Listar produtos."
        }
      ]
    },
    "orderManagement": {
      "description": "Registro e acompanhamento de pedidos.",
      "usesRules": [
        "rule6",
        "rule9",
        "rule10",
        "rule15"
      ],
      "actions": [
        {
          "actionId": "createOrderCounter",
          "description": "Criar pedido no balcão."
        },
        {
          "actionId": "createOrderPhone",
          "description": "Criar pedido por telefone."
        },
        {
          "actionId": "updateOrderStatus",
          "description": "Atualizar status do pedido."
        },
        {
          "actionId": "listOrders",
          "description": "Listar pedidos."
        },
        {
          "actionId": "managePhoneOrderScript",
          "description": "Manter roteiro de atendimento telefônico."
        }
      ]
    },
    "deliveryManagement": {
      "description": "Gestão de entregas.",
      "usesRules": [
        "rule7"
      ],
      "actions": [
        {
          "actionId": "assignDelivery",
          "description": "Atribuir pedido a entregador."
        },
        {
          "actionId": "trackDelivery",
          "description": "Acompanhar entrega."
        }
      ]
    },
    "inventoryControl": {
      "description": "Controle de estoque de produtos e insumos.",
      "usesRules": [
        "rule8",
        "rule14"
      ],
      "actions": [
        {
          "actionId": "adjustStock",
          "description": "Ajustar quantidade em estoque."
        },
        {
          "actionId": "viewStock",
          "description": "Consultar estoque."
        },
        {
          "actionId": "setMinimumStock",
          "description": "Definir estoque mínimo por produto."
        },
        {
          "actionId": "manageReplenishmentAlerts",
          "description": "Gerenciar alertas de reposição."
        }
      ]
    },
    "reporting": {
      "description": "Geração de relatórios de vendas.",
      "usesRules": [
        "rule11"
      ],
      "actions": [
        {
          "actionId": "salesByPeriod",
          "description": "Relatório de vendas por período."
        },
        {
          "actionId": "topSellingItems",
          "description": "Relatório de itens mais vendidos."
        }
      ]
    },
    "customerManagement": {
      "description": "Cadastro de clientes e histórico de pedidos.",
      "usesRules": [
        "rule12"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "createCustomer",
          "description": "Cadastrar cliente."
        },
        {
          "actionId": "updateCustomer",
          "description": "Atualizar dados do cliente."
        },
        {
          "actionId": "viewCustomerHistory",
          "description": "Consultar histórico de pedidos do cliente."
        },
        {
          "actionId": "listCustomers",
          "description": "Listar clientes."
        }
      ]
    },
    "serviceTimeManagement": {
      "description": "Definição e acompanhamento de metas de tempo por status de pedido.",
      "usesRules": [
        "rule13"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "defineServiceTimeTargets",
          "description": "Definir metas de tempo por status."
        },
        {
          "actionId": "viewServiceTimeTargets",
          "description": "Consultar metas de tempo por status."
        }
      ]
    },
    "phoneOrderChecklist": {
      "description": "Gestão do checklist de confirmação no atendimento telefônico.",
      "usesRules": [
        "rule16"
      ],
      "isOptional": true,
      "actions": [
        {
          "actionId": "defineChecklistItems",
          "description": "Definir itens do checklist de confirmação."
        },
        {
          "actionId": "activateChecklist",
          "description": "Ativar ou desativar checklist."
        },
        {
          "actionId": "recordChecklistConfirmation",
          "description": "Registrar confirmação do checklist no pedido por telefone."
        }
      ]
    }
  }
}
