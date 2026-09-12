/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Consulta.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityConsulta = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "agendaClinica",
  "entityId": "Consulta",
  "title": "Consulta",
  "description": "Agendamento clínico de um paciente com um profissional, incluindo sua confirmação e resultado de atendimento.",
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
      "description": "Referência ao paciente para quem a consulta foi agendada."
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
      "description": "Data e horário programados para a consulta."
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
          "value": "noShow",
          "title": "Falta do paciente"
        },
        {
          "value": "attended",
          "title": "Atendida"
        }
      ],
      "description": "Situação atual da consulta."
    },
    {
      "fieldId": "clinicalNote",
      "title": "Anotação do atendimento",
      "type": "text",
      "required": false,
      "description": "Anotação registrada pelo profissional sobre o atendimento realizado."
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
      "state": "noShow",
      "reachedBy": "actor"
    },
    {
      "state": "attended",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "confirmAppointment",
      "from": [
        "scheduled"
      ],
      "to": "confirmed",
      "by": [
        "recepcionista"
      ],
      "description": "Registra a confirmação telefônica da consulta."
    },
    {
      "transitionId": "recordPatientNoShow",
      "from": [
        "scheduled",
        "confirmed"
      ],
      "to": "noShow",
      "by": [
        "recepcionista"
      ],
      "description": "Registra que o paciente não compareceu à consulta."
    },
    {
      "transitionId": "recordAppointmentAttendance",
      "from": [
        "scheduled",
        "confirmed"
      ],
      "to": "attended",
      "by": [
        "profissional"
      ],
      "description": "Registra a realização do atendimento e sua anotação."
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
