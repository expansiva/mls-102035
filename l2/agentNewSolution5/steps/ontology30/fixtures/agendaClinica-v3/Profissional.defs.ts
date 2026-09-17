/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Profissional.defs.ts" enhancement="_blank"/>
// ESCRITO À MÃO (planner, 15/09/2026) na forma nova — experimento. Papel sobre Person mantido pela recepção (writer crud).

export const agendaClinicaEntityProfissional = {
  "schemaVersion": "2026-09-15-ns5-ontology-v3",
  "moduleName": "agendaClinica",
  "entityId": "Profissional",
  "title": "Profissional",
  "description": "Médico ou terapeuta da clínica. Papel sobre o registro Pessoa; tem login para ver só a própria agenda do dia.",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "agendaClinica.Profissional",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "displayField": "details.identification.name",
  "writer": "crud",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "description": "mdmId; é o que Consulta.profissionalId guarda e o que a sessão do profissional resolve pelo login."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "details": {
        "type": "object",
        "required": true,
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "title": "Nome completo"
              },
              "docType": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "title": "Tipo de documento",
                "values": [
                  "CPF"
                ]
              },
              "docId": {
                "type": "string",
                "required": true,
                "indexed": true,
                "unique": true,
                "title": "CPF",
                "pattern": "^\\d{11}$"
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
                ]
              },
              "tags": {
                "type": "string",
                "collection": true,
                "required": true,
                "derived": true,
                "title": "Papéis",
                "description": "Contém agendaClinica.Profissional."
              }
            }
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contacts": {
                "type": "object",
                "of": "ContactSummary",
                "collection": true,
                "derived": true,
                "title": "Canais de contato",
                "description": "E-mail do login e telefone, como registros ContactChannel."
              }
            }
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "A clínica não usa nenhum campo específico de Pessoa do profissional."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true
          },
          "agendaClinica": {
            "type": "object",
            "owner": "module",
            "description": "O que a clínica sabe do profissional e ninguém mais precisa.",
            "fields": {
              "tipo": {
                "type": "enum",
                "required": true,
                "title": "Tipo",
                "values": [
                  {
                    "value": "medico",
                    "title": "Médico"
                  },
                  {
                    "value": "terapeuta",
                    "title": "Terapeuta"
                  }
                ],
                "description": "Do prompt: a clínica tem médicos e terapeutas."
              }
            }
          }
        }
      }
    }
  },
  "relationships": {
    "consultas": {
      "to": "Consulta",
      "via": "Consulta.profissionalId",
      "mode": "fk",
      "cardinality": "1:N",
      "title": "Agenda",
      "description": "Consultas do profissional; a agenda do dia é este vínculo filtrado por data.",
      "relationshipId": "consultaProfissional"
    },
    "pacientes": {
      "to": "Paciente",
      "via": "Consulta",
      "path": "Consulta.profissionalId = id → Consulta.pacienteId",
      "mode": "throughTable",
      "derived": true,
      "cardinality": "N:N",
      "title": "Pacientes atendidos",
      "relationshipId": "profissionalPacientes"
    }
  },
  "capabilities": {
    "locate.byName": "Recepção localiza o profissional ao agendar · recepcionista",
    "register.createOrAttach": "Recepção cadastra o profissional (cria a pessoa ou anexa o papel) · recepcionista",
    "edit.moduleNamespace": "Recepção mantém o tipo (médico/terapeuta) · recepcionista",
    "inactivate": "Recepção inativa profissional que saiu; agenda futura dele fica bloqueada · recepcionista",
    "invite.login": "Recepção convida o profissional para login; a sessão dele resolve o mdmId e a agenda é só a dele (dataScope own) · recepcionista",
    "agendaClinica.consultarAgendaDiaria": "Profissional vê as consultas do dia dele · Consulta where profissionalId = sessão.person.mdmId and date(scheduledAt) = hoje · profissional · módulo"
  },
  "rules": [
    "rule-person-privacy-consent-required-br-eu",
    "rule-identity-never-in-namespace",
    "inativoNaoAgenda"
  ]
} as const;

export default agendaClinicaEntityProfissional;
