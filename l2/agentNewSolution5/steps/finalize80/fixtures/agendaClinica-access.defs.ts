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
      "description": "Médico ou terapeuta da clínica que consulta a própria agenda e registra os atendimentos realizados."
    }
  ],
  "grants": [
    {
      "grantId": "recepcionistaGerirPacientes",
      "actorRef": "recepcionista",
      "title": "Gerir pacientes",
      "description": "Cadastrar ou vincular pacientes da clínica e consultar seus registros para o agendamento.",
      "entityRefs": [
        "Paciente"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Pacientes vinculados à clínica."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "A recepcionista acessa integralmente o registro de paciente necessário ao cadastro e agendamento."
      }
    },
    {
      "grantId": "recepcionistaGerirProfissionais",
      "actorRef": "recepcionista",
      "title": "Gerir profissionais",
      "description": "Manter os registros dos médicos e terapeutas que podem realizar consultas na clínica.",
      "entityRefs": [
        "Profissional"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Profissionais vinculados à clínica."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "A recepcionista acessa integralmente os registros de profissionais para mantê-los disponíveis no agendamento."
      }
    },
    {
      "grantId": "recepcionistaGerirConsultas",
      "actorRef": "recepcionista",
      "title": "Gerir consultas",
      "description": "Agendar consultas, consultar seus dados operacionais, registrar confirmações telefônicas e registrar faltas de pacientes.",
      "entityRefs": [
        "Consulta"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Consultas da clínica que a recepcionista agenda, confirma ou registra como falta."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "A recepcionista vê os dados operacionais da consulta, sem acesso à anotação clínica do atendimento.",
        "allowedFields": [
          "Consulta.id",
          "Consulta.pacienteId",
          "Consulta.profissionalId",
          "Consulta.scheduledAt",
          "Consulta.status"
        ],
        "deniedFields": [
          "Consulta.clinicalNote"
        ]
      }
    },
    {
      "grantId": "profissionalConsultarEatenderPropriasConsultas",
      "actorRef": "profissional",
      "title": "Consultar e atender próprias consultas",
      "description": "Consultar a própria agenda e registrar o atendimento realizado com sua anotação.",
      "entityRefs": [
        "Consulta"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente consultas vinculadas ao profissional correspondente à pessoa da sessão.",
        "anchorEntity": "Profissional"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O profissional acessa integralmente suas próprias consultas, inclusive a anotação clínica que registra."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type AgendaClinicaAccessType = typeof agendaClinicaAccess;

export default agendaClinicaAccess;
