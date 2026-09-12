/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Consulta.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityConsulta = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "agendaClinica",
  "entityId": "Consulta",
  "title": "Consulta",
  "description": "Agendamento de atendimento de um paciente com um profissional em data e horário determinados.",
  "kind": "core",
  "party": "none",
  "displayField": "scheduledAt",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único da consulta."
    },
    {
      "fieldId": "pacienteId",
      "title": "Paciente",
      "type": "uuid",
      "required": true,
      "description": "Referência ao paciente para o qual a consulta foi agendada."
    },
    {
      "fieldId": "profissionalId",
      "title": "Profissional",
      "type": "uuid",
      "required": true,
      "description": "Referência ao profissional que realizará a consulta."
    },
    {
      "fieldId": "scheduledAt",
      "title": "Data e horário",
      "type": "datetime",
      "required": true,
      "description": "Data e horário agendados para a consulta."
    },
    {
      "fieldId": "status",
      "title": "Situação",
      "type": "string",
      "required": true,
      "enum": [
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
      ],
      "description": "Situação atual da consulta."
    },
    {
      "fieldId": "attendanceNote",
      "title": "Anotação do atendimento",
      "type": "text",
      "required": false,
      "description": "Anotação registrada pelo profissional após o atendimento."
    }
  ],
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
      "description": "Registra a confirmação telefônica da consulta pelo paciente."
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
      "description": "Registra que o paciente não compareceu à consulta."
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
      "description": "Registra a realização da consulta e a anotação do atendimento."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type AgendaClinicaEntityConsultaType = typeof agendaClinicaEntityConsulta;

export default agendaClinicaEntityConsulta;
