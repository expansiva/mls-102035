/// <mls fileReference="_102035_/l2/locadora/module.defs.ts" enhancement="_blank"/>


export const ontology = {
  "meta": {
    "userLanguage": "pt",
    "moduleName": "locadora",
    "userPromptOriginal": "Criar novo módulo para locadora.",
    "userPromptFinal": "Criar módulo para locadora com foco no uso interno. Sistema em português do Brasil, tom profissional e conciso. Apenas papel admin, que cadastra e consulta. Cadastro de frota com placa, modelo, ano, categoria, status e quilometragem. Cadastro de clientes com nome, CPF, CNH, telefone e e-mail. Inclusão de locação com datas de retirada e devolução, valor diário, seguro opcional, forma de pagamento e devolução prevista."
  },
  "ui": {
    "visualStyle": "Corporate & professional"
  },
  "ontology": {
    "entities": {
      "veiculo": {
        "description": "Veículo da frota da locadora.",
        "fields": {
          "placa": {
            "type": "string",
            "required": true
          },
          "modelo": {
            "type": "string",
            "required": true
          },
          "ano": {
            "type": "number",
            "required": true
          },
          "categoria": {
            "type": "string",
            "required": true
          },
          "status": {
            "type": "string",
            "required": true,
            "values": [
              "disponível",
              "locado",
              "manutenção"
            ]
          },
          "quilometragem": {
            "type": "number",
            "required": true
          }
        },
        "rules": [
          "rule_frota_campos_obrigatorios",
          "rule_status_veiculo_valores"
        ]
      },
      "cliente": {
        "description": "Cliente cadastrado para locações.",
        "fields": {
          "nome": {
            "type": "string",
            "required": true
          },
          "cpf": {
            "type": "string",
            "required": true,
            "constraints": "CPF deve ser válido para permitir cadastro e locação."
          },
          "cnh": {
            "type": "string",
            "required": true,
            "constraints": "CNH deve ser válida e não vencida para permitir cadastro e locação."
          },
          "telefone": {
            "type": "string",
            "required": true
          },
          "email": {
            "type": "string",
            "required": true
          }
        },
        "rules": [
          "rule_cliente_campos_obrigatorios",
          "rule_bloqueio_cliente_cpf_cnh_invalidos",
          "rule_cpf_cnh_formato_mascara"
        ]
      },
      "locacao": {
        "description": "Registro de locação de veículo.",
        "fields": {
          "dataRetirada": {
            "type": "string",
            "required": true
          },
          "dataDevolucao": {
            "type": "string",
            "required": true
          },
          "valorDiario": {
            "type": "number",
            "required": true
          },
          "seguroOpcional": {
            "type": "boolean",
            "required": false
          },
          "formaPagamento": {
            "type": "string",
            "required": true
          },
          "devolucaoPrevista": {
            "type": "string",
            "required": true
          },
          "placaVeiculo": {
            "type": "string",
            "required": true
          }
        },
        "rules": [
          "rule_locacao_campos_obrigatorios",
          "rule_bloqueio_cliente_cpf_cnh_invalidos",
          "rule_alerta_veiculo_indisponivel"
        ]
      },
      "usuarioAdmin": {
        "description": "Usuário administrador que acessa o sistema interno.",
        "fields": {
          "id": {
            "type": "string",
            "required": true
          },
          "usuario": {
            "type": "string",
            "required": true
          },
          "senha": {
            "type": "string",
            "required": true,
            "constraints": "Senha deve ser armazenada de forma segura (hash)."
          }
        },
        "rules": [
          "rule_papel_admin_unico",
          "rule_publico_interno"
        ]
      }
    }
  },
  "rules": {
    "rule_publico_interno": {
      "kind": "domain",
      "description": "O sistema é voltado principalmente para uso interno da locadora.",
      "scope": [
        "global"
      ]
    },
    "rule_papel_admin_unico": {
      "kind": "policy",
      "description": "Existe apenas o papel de usuário admin, responsável por cadastrar e consultar.",
      "scope": [
        "global"
      ]
    },
    "rule_idioma_pt_br": {
      "kind": "policy",
      "description": "O sistema deve suportar apenas português do Brasil.",
      "scope": [
        "global"
      ]
    },
    "rule_tom_profissional_conciso": {
      "kind": "policy",
      "description": "O tom de comunicação da interface deve ser profissional e conciso.",
      "scope": [
        "ui"
      ]
    },
    "rule_frota_campos_obrigatorios": {
      "kind": "domain",
      "description": "Cadastro de frota deve conter placa, modelo, ano, categoria, status e quilometragem.",
      "scope": [
        "entity.veiculo"
      ],
      "acceptanceCriteria": [
        "Todos os campos listados são obrigatórios no cadastro de veículo."
      ]
    },
    "rule_cliente_campos_obrigatorios": {
      "kind": "domain",
      "description": "Cadastro de cliente deve conter nome, CPF, CNH, telefone e e-mail.",
      "scope": [
        "entity.cliente"
      ],
      "acceptanceCriteria": [
        "Todos os campos listados são obrigatórios no cadastro de cliente."
      ]
    },
    "rule_locacao_campos_obrigatorios": {
      "kind": "domain",
      "description": "Inclusão de locação deve conter datas de retirada e devolução, valor diário, seguro opcional, forma de pagamento e devolução prevista.",
      "scope": [
        "entity.locacao"
      ],
      "acceptanceCriteria": [
        "Campos obrigatórios: datas de retirada e devolução, valor diário, forma de pagamento e devolução prevista.",
        "Seguro é opcional."
      ]
    },
    "rule_bloqueio_cliente_cpf_cnh_invalidos": {
      "kind": "policy",
      "description": "Clientes com CPF inválido ou CNH inválida/vencida devem ser bloqueados para cadastro e locação.",
      "scope": [
        "entity.cliente",
        "entity.locacao",
        "capability.gestaoClientes",
        "capability.gestaoLocacoes"
      ],
      "acceptanceCriteria": [
        "Cadastro de cliente é impedido quando CPF é inválido.",
        "Cadastro de cliente é impedido quando CNH é inválida ou vencida.",
        "Registro de locação é impedido para cliente com CPF inválido ou CNH inválida/vencida."
      ]
    },
    "rule_cpf_cnh_formato_mascara": {
      "kind": "policy",
      "description": "CPF e CNH devem seguir máscara e validação de formato.",
      "scope": [
        "entity.cliente",
        "capability.gestaoClientes"
      ],
      "acceptanceCriteria": [
        "CPF é registrado apenas quando respeita máscara e formato válido.",
        "CNH é registrada apenas quando respeita máscara e formato válido."
      ]
    },
    "rule_status_veiculo_valores": {
      "kind": "domain",
      "description": "Status de veículo deve ser um dentre disponível, locado ou manutenção.",
      "scope": [
        "entity.veiculo",
        "capability.gestaoFrota",
        "capability.gestaoLocacoes"
      ],
      "acceptanceCriteria": [
        "Somente os valores disponível, locado e manutenção são aceitos para status."
      ]
    },
    "rule_alerta_veiculo_indisponivel": {
      "kind": "policy",
      "description": "Ao tentar locar veículo com status diferente de disponível, deve ser exibido alerta.",
      "scope": [
        "capability.gestaoLocacoes",
        "entity.locacao"
      ],
      "acceptanceCriteria": [
        "Ao registrar locação, se o status do veículo não for disponível, o sistema exibe alerta."
      ]
    }
  },
  "capabilities": {
    "gestaoFrota": {
      "description": "Cadastrar e consultar veículos da frota.",
      "usesRules": [
        "rule_papel_admin_unico",
        "rule_frota_campos_obrigatorios",
        "rule_status_veiculo_valores"
      ],
      "actions": [
        {
          "actionId": "cadastrarVeiculo",
          "description": "Cadastrar veículo com todos os campos obrigatórios."
        },
        {
          "actionId": "consultarVeiculo",
          "description": "Consultar veículos cadastrados."
        },
        {
          "actionId": "filtrarVeiculoPorStatus",
          "description": "Filtrar veículos por status (disponível, locado, manutenção)."
        }
      ]
    },
    "gestaoClientes": {
      "description": "Cadastrar e consultar clientes.",
      "usesRules": [
        "rule_papel_admin_unico",
        "rule_cliente_campos_obrigatorios",
        "rule_bloqueio_cliente_cpf_cnh_invalidos",
        "rule_cpf_cnh_formato_mascara"
      ],
      "actions": [
        {
          "actionId": "cadastrarCliente",
          "description": "Cadastrar cliente com todos os campos obrigatórios."
        },
        {
          "actionId": "consultarCliente",
          "description": "Consultar clientes cadastrados."
        }
      ]
    },
    "gestaoLocacoes": {
      "description": "Registrar e consultar locações.",
      "usesRules": [
        "rule_papel_admin_unico",
        "rule_locacao_campos_obrigatorios",
        "rule_bloqueio_cliente_cpf_cnh_invalidos",
        "rule_alerta_veiculo_indisponivel",
        "rule_status_veiculo_valores"
      ],
      "actions": [
        {
          "actionId": "registrarLocacao",
          "description": "Registrar locação com campos obrigatórios e seguro opcional."
        },
        {
          "actionId": "consultarLocacao",
          "description": "Consultar locações registradas."
        }
      ]
    }
  }
}
