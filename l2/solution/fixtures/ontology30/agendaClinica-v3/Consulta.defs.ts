/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Consulta.defs.ts" enhancement="_blank"/>
// ESCRITO À MÃO (planner, 15/09/2026) na forma nova — experimento. Tabela do módulo: colunas só onde há índice; o resto em details (jsonb).

export const agendaClinicaEntityConsulta = {
  "schemaVersion": "2026-09-15-ns5-ontology-v3",
  "moduleName": "agendaClinica",
  "entityId": "Consulta",
  "title": "Consulta",
  "description": "Agendamento de atendimento de um paciente com um profissional em data e horário determinados.",
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "agendaClinica_consulta"
  },
  "displayField": "scheduledAt",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Identificador"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "pacienteId": {
        "type": "record",
        "to": [
          "Paciente"
        ],
        "required": true,
        "indexed": true,
        "title": "Paciente",
        "description": "mdmId da pessoa com papel Paciente."
      },
      "profissionalId": {
        "type": "record",
        "to": [
          "Profissional"
        ],
        "required": true,
        "indexed": true,
        "title": "Profissional",
        "description": "mdmId da pessoa com papel Profissional."
      },
      "scheduledAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "Data e horário"
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "title": "Situação",
        "values": [
          {
            "value": "scheduled",
            "title": "Agendada"
          },
          {
            "value": "confirmed",
            "title": "Confirmada"
          },
          {
            "value": "missed",
            "title": "Falta registrada"
          },
          {
            "value": "attended",
            "title": "Atendida"
          }
        ]
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "O que ninguém filtra: fica no jsonb.",
        "fields": {
          "attendanceNote": {
            "type": "text",
            "title": "Anotação do atendimento",
            "description": "Registrada pelo profissional ao marcar atendida; a recepção não a vê (disclosure)."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "profissionalId",
      "scheduledAt"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "scheduled",
      "reachedBy": "actor"
    },
    {
      "state": "confirmed",
      "reachedBy": "actor"
    },
    {
      "state": "missed",
      "reachedBy": "actor"
    },
    {
      "state": "attended",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "confirmarConsulta",
      "from": [
        "scheduled"
      ],
      "to": "confirmed",
      "by": [
        "recepcionista"
      ],
      "description": "Registra a confirmação telefônica pelo paciente."
    },
    {
      "transitionId": "registrarFalta",
      "from": [
        "scheduled",
        "confirmed"
      ],
      "to": "missed",
      "by": [
        "recepcionista"
      ],
      "description": "Registra que o paciente não compareceu."
    },
    {
      "transitionId": "registrarAtendimento",
      "from": [
        "scheduled",
        "confirmed"
      ],
      "to": "attended",
      "by": [
        "profissional"
      ],
      "description": "Registra a realização e a anotação.",
      "ruleRefs": [
        "anotacaoObrigatoriaNoAtendimento"
      ]
    }
  ],
  "relationships": {
    "paciente": {
      "to": "Paciente",
      "via": "pacienteId",
      "mode": "fk",
      "cardinality": "N:1",
      "required": true,
      "title": "Paciente",
      "relationshipId": "consultaPaciente"
    },
    "profissional": {
      "to": "Profissional",
      "via": "profissionalId",
      "mode": "fk",
      "cardinality": "N:1",
      "required": true,
      "title": "Profissional",
      "relationshipId": "consultaProfissional"
    }
  },
  "capabilities": {
    "agendaClinica.agendar": "Recepção marca consulta para um profissional em data e hora; recusa se o horário do profissional já está tomado · insert com uniqueKeys · recepcionista · módulo",
    "agendaClinica.confirmar": "Recepção confirma por telefone (transição confirmarConsulta) · recepcionista · módulo",
    "agendaClinica.registrarFalta": "Recepção registra falta (transição registrarFalta) · recepcionista · módulo",
    "agendaClinica.registrarAtendimento": "Profissional marca atendida com anotação obrigatória (transição registrarAtendimento) · profissional · módulo",
    "agendaClinica.agendaDoDia": "Lista do dia por profissional, ordenada por horário · where profissionalId and date(scheduledAt) · recepcionista (todos), profissional (a própria) · módulo",
    "statusHistory.read": "Histórico de agendada → confirmada → atendida/falta, com quem e quando · mdm_status_history anchored by Consulta · recepcionista, profissional"
  },
  "rules": [
    "horarioProfissionalExclusivo",
    "anotacaoObrigatoriaNoAtendimento",
    "inativoNaoAgenda"
  ]
} as const;

export default agendaClinicaEntityConsulta;
