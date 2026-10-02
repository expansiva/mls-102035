/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Paciente.defs.ts" enhancement="_blank"/>
// ESCRITO À MÃO (planner, 15/09/2026) na forma nova — experimento de leitura antes da tela e do gerador.
// Papel do módulo sobre o registro Person da plataforma: copia de /_102034_/l4/ontology/mdm.defs.ts só o que a clínica usa,
// aperta o que precisa, e acrescenta o ramo details.agendaClinica. Tipo `satisfies` fica para a ns5_39; l4 não é compilado.

export const agendaClinicaEntityPaciente = {
  "schemaVersion": "2026-09-15-ns5-ontology-v3",
  "moduleName": "agendaClinica",
  "entityId": "Paciente",
  "title": "Paciente",
  "description": "Pessoa que recebe consultas na clínica. Não é tabela do módulo: é um papel sobre o registro Pessoa do cadastro mestre; o mesmo ser humano pode ser aluno na academia ou cliente na locadora, um registro só.",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "agendaClinica.Paciente",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "displayField": "details.identification.name",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "description": "mdmId do registro mestre; é o que Consulta.pacienteId guarda."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "description": "Incrementado pelo motor a cada escrita."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento da pessoa como o MDM guarda e devolve. Ramos: identification, base, person, general, agendaClinica.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "description": "Colunas do índice: por onde se localiza e ordena.",
            "fields": {
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "title": "Nome completo",
                "description": "Como a recepção reconhece o paciente; entra na busca por nome."
              },
              "docType": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "title": "Tipo de documento",
                "values": [
                  "CPF"
                ],
                "description": "A clínica só cadastra com CPF (a plataforma aceita outros; aqui apertado)."
              },
              "docId": {
                "type": "string",
                "required": true,
                "indexed": true,
                "unique": true,
                "title": "CPF",
                "pattern": "^\\d{11}$",
                "description": "Chave de deduplicação: duas pessoas com o mesmo CPF são a mesma pessoa."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "title": "País",
                "default": "BR",
                "maxLength": 2
              },
              "status": {
                "type": "enum",
                "required": true,
                "derived": true,
                "indexed": true,
                "title": "Situação",
                "values": [
                  "Active",
                  "Inactive",
                  "Merged",
                  "Blocked"
                ],
                "description": "Situação do registro mestre, não da consulta. Inativo não agenda."
              },
              "tags": {
                "type": "string",
                "collection": true,
                "required": true,
                "derived": true,
                "title": "Papéis",
                "description": "Contém agendaClinica.Paciente quando a pessoa é paciente. Escrito por attachRole."
              }
            }
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "description": "O que toda pessoa tem, independente do módulo.",
            "fields": {
              "aliases": {
                "type": "string",
                "collection": true,
                "title": "Outros nomes",
                "description": "Apelido, nome social. Atenção: hoje a busca por nome (locate.byName) NÃO consulta aliases — plataforma parcial."
              },
              "addresses": {
                "type": "object",
                "of": "Address",
                "collection": true,
                "title": "Endereços",
                "description": "Lista dentro do documento. Subcampos que a clínica usa:",
                "fields": {
                  "type": {
                    "type": "enum",
                    "required": true,
                    "title": "Tipo",
                    "values": [
                      {
                        "value": "Residential",
                        "title": "Residencial"
                      },
                      {
                        "value": "Commercial",
                        "title": "Comercial"
                      }
                    ]
                  },
                  "line1": {
                    "type": "string",
                    "required": true,
                    "title": "Logradouro e número"
                  },
                  "line2": {
                    "type": "string",
                    "title": "Complemento"
                  },
                  "line3": {
                    "type": "string",
                    "title": "Bairro"
                  },
                  "city": {
                    "type": "string",
                    "required": true,
                    "title": "Cidade"
                  },
                  "stateOrProvince": {
                    "type": "string",
                    "required": true,
                    "title": "UF",
                    "maxLength": 2
                  },
                  "postalCode": {
                    "type": "string",
                    "required": true,
                    "title": "CEP",
                    "pattern": "^\\d{5}-?\\d{3}$"
                  },
                  "countryCode": {
                    "type": "string",
                    "required": true,
                    "title": "País",
                    "default": "BR"
                  },
                  "isPrimary": {
                    "type": "boolean",
                    "required": true,
                    "title": "Principal"
                  }
                }
              },
              "contacts": {
                "type": "object",
                "of": "ContactSummary",
                "collection": true,
                "derived": true,
                "title": "Canais de contato",
                "description": "Referências aos registros ContactChannel ligados por HasContact (ver relationships.contatos). O motor preenche; para incluir um, capacidade link.contact."
              },
              "relationshipRefs": {
                "type": "object",
                "derived": true,
                "title": "Vínculos (resumo)",
                "description": "Chaves compactas recalculadas pelo motor a cada link/unlink. Não se edita."
              }
            }
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "description": "Campos que só uma Pessoa tem.",
            "fields": {
              "birthDate": {
                "type": "date",
                "required": true,
                "title": "Data de nascimento",
                "description": "A plataforma trata como opcional; a clínica exige (idade define responsável)."
              },
              "gender": {
                "type": "enum",
                "title": "Sexo",
                "values": [
                  {
                    "value": "Male",
                    "title": "Masculino"
                  },
                  {
                    "value": "Female",
                    "title": "Feminino"
                  },
                  {
                    "value": "NotDisclosed",
                    "title": "Não informado"
                  }
                ],
                "description": "Subconjunto do domínio da plataforma."
              },
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "required": true,
                "title": "Consentimento LGPD",
                "description": "Obrigatório para pessoa no Brasil; sem ele o motor deixa o registro Inativo.",
                "fields": {
                  "consentedAt": {
                    "type": "timestamp",
                    "required": true,
                    "title": "Consentido em"
                  },
                  "consentVersion": {
                    "type": "string",
                    "required": true,
                    "title": "Versão da política"
                  },
                  "channel": {
                    "type": "enum",
                    "required": true,
                    "title": "Canal",
                    "values": [
                      {
                        "value": "paper-form",
                        "title": "Formulário em papel"
                      },
                      {
                        "value": "web-signup",
                        "title": "Cadastro no site"
                      },
                      {
                        "value": "verbal",
                        "title": "Verbal, registrado pela recepção"
                      }
                    ]
                  },
                  "revokedAt": {
                    "type": "timestamp",
                    "title": "Revogado em"
                  }
                }
              }
            }
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização quando dois módulos precisam do mesmo dado. Hoje vazio para a clínica."
          },
          "agendaClinica": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Namespace da clínica dentro do documento da pessoa: só o que ninguém mais precisa saber, e só este módulo escreve. O prompt não pediu dado próprio da clínica sobre a pessoa, então está vazio; se pedir (convênio, prontuário), entra aqui, como árvore."
          }
        }
      }
    }
  },
  "relationships": {
    "contatos": {
      "to": "ContactChannel",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "Telefones e e-mail",
      "description": "Canais do próprio paciente; cada um é um registro ContactChannel. É por eles que a recepção confirma consulta e a plataforma deduplica.",
      "target": {
        "contactType": [
          "Phone",
          "WhatsApp",
          "Email"
        ]
      },
      "relationshipId": "pacienteContatos"
    },
    "responsavel": {
      "to": "Person",
      "via": "GuardianOf",
      "direction": "to",
      "cardinality": "N:1",
      "required": "quando menor de 18 anos",
      "roles": [
        "parent",
        "guardian"
      ],
      "title": "Responsável legal",
      "description": "Pai, mãe ou tutor: outra Pessoa do cadastro mestre. Visto do paciente é N:1 (vários pacientes podem ter o mesmo responsável); no índice o vínculo é GuardianOf de Person para Paciente, oneToMany.",
      "relationshipId": "pacienteResponsavel"
    },
    "contatoEmergencia": {
      "to": "Person",
      "via": "Family",
      "role": "emergency",
      "cardinality": "N:N",
      "title": "Para quem ligar",
      "description": "Pessoa a avisar em emergência; não é telefone, é outro registro Pessoa com os canais dela.",
      "relationshipId": "pacienteContatoEmergencia"
    },
    "consultas": {
      "to": "Consulta",
      "via": "Consulta.pacienteId",
      "mode": "fk",
      "cardinality": "1:N",
      "title": "Consultas",
      "description": "Tabela do módulo com FK para o paciente. Ordenar por scheduledAt desc dá as últimas consultas.",
      "relationshipId": "consultaPaciente"
    },
    "profissionais": {
      "to": "Profissional",
      "via": "Consulta",
      "path": "Consulta.pacienteId = id → Consulta.profissionalId",
      "mode": "throughTable",
      "derived": true,
      "cardinality": "N:N",
      "title": "Profissionais que me atenderam",
      "description": "Derivado pelas consultas com status attended.",
      "relationshipId": "pacienteProfissionais"
    }
  },
  "capabilities": {
    "locate.byName": "Recepção localiza o paciente pelo nome ou apelido ao agendar ou confirmar · busca por nome no índice · recepcionista",
    "locate.byDocument": "Recepção localiza pelo CPF antes de cadastrar, para não duplicar · docType+docId · recepcionista",
    "locate.byContact": "Recepção descobre quem é o paciente pelo telefone de quem ligou · ContactChannel.value · recepcionista",
    "register.createOrAttach": "Cadastrar paciente: cria a pessoa se o CPF não existe, ou só anexa o papel agendaClinica.Paciente · recepcionista",
    "edit.platformFields": "Recepção corrige nome, nascimento, endereço e consentimento · recepcionista",
    "edit.moduleNamespace": "Recepção mantém o convênio (details.agendaClinica) · recepcionista",
    "inactivate": "Recepção inativa o paciente que deixou a clínica; inativo não agenda · recepcionista",
    "link.contact": "Recepção adiciona telefone, WhatsApp ou e-mail do paciente · recepcionista",
    "link": "Recepção registra responsável legal (GuardianOf), familiar e contato de emergência (Family) · recepcionista",
    "listLinks": "Tela do paciente mostra contatos, responsável, família · recepcionista, profissional",
    "attach.document": "Recepção guarda foto, carteirinha do convênio e laudo externo · categorias: foto, carteirinha, laudo · recepcionista, profissional",
    "comment": "Nota da recepção sobre o paciente (não clínica) · recepcionista",
    "statusHistory.read": "Quando ficou ativo ou inativo e por quem · recepcionista",
    "agendaClinica.listarConsultas": "Consultas do paciente por período e situação · Consulta where pacienteId = id order by scheduledAt desc · recepcionista, profissional · módulo",
    "agendaClinica.listarProfissionais": "Médicos e terapeutas que já atenderam o paciente · distinct Consulta.profissionalId where status attended · recepcionista · módulo"
  },
  "rules": [
    "rule-person-privacy-consent-required-br-eu",
    "rule-identity-never-in-namespace",
    "rule-foreign-namespace-refused",
    "menorExigeResponsavel",
    "inativoNaoAgenda",
    "contatoParaConfirmarConsulta"
  ]
} as const;

export default agendaClinicaEntityPaciente;
