/// <mls fileReference="_102047_/l4/agendaClinica/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "agendaClinica",
  "actors": [
    {
      "actorId": "recepcionista",
      "kind": "internal",
      "origin": "named",
      "title": "Recepcionista",
      "description": "Profissional da clínica que cadastra pacientes, agenda e confirma consultas e registra faltas."
    },
    {
      "actorId": "profissional",
      "kind": "internal",
      "origin": "named",
      "title": "Profissional",
      "description": "Médico ou terapeuta da clínica que consulta sua agenda diária e registra os atendimentos realizados."
    }
  ],
  "grants": [
    {
      "grantId": "gestaoAgendaRecepcionista",
      "actorRef": "recepcionista",
      "title": "Gestão de pacientes, profissionais e agenda",
      "description": "Permite cadastrar pacientes, manter o cadastro de profissionais e agendar, confirmar ou registrar faltas em consultas de toda a clínica, sem acesso às anotações de atendimento.",
      "entityRefs": [
        "Paciente",
        "Profissional",
        "Consulta"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os cadastros e as consultas de toda a clínica."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza os dados necessários para cadastro e gestão da agenda, preservando a anotação clínica do atendimento.",
        "allowedFields": [
          "Paciente.id",
          "Profissional.id",
          "Consulta.id",
          "Consulta.pacienteId",
          "Consulta.profissionalId",
          "Consulta.scheduledAt",
          "Consulta.status"
        ],
        "deniedFields": [
          "Consulta.attendanceNote"
        ]
      }
    },
    {
      "grantId": "agendaPropriaProfissional",
      "actorRef": "profissional",
      "title": "Agenda e atendimentos próprios",
      "description": "Permite consultar as próprias consultas agendadas e registrar o atendimento realizado com sua anotação.",
      "entityRefs": [
        "Consulta"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente as consultas vinculadas ao profissional autenticado.",
        "anchorEntity": "Profissional"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Disponibiliza todos os campos da consulta vinculada ao próprio profissional, incluindo a anotação de atendimento."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type AgendaClinicaAccessType = typeof agendaClinicaAccess;

export default agendaClinicaAccess;
