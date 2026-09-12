/// <mls fileReference="_102047_/l4/agendaClinica/journeys/agendarConsulta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const agendarConsultaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "agendarConsulta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Agendar consulta",
    "goal": "Marcar uma consulta para um paciente com um profissional em data e horário disponíveis.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarPaciente",
        "kind": "locate",
        "entity": "Paciente",
        "title": "x",
        "description": "Localiza o paciente que receberá a consulta."
      },
      {
        "stepId": "localizarProfissional",
        "kind": "locate",
        "entity": "Profissional",
        "title": "x",
        "description": "Localiza o profissional que realizará a consulta."
      },
      {
        "stepId": "criarConsulta",
        "kind": "act",
        "entity": "Consulta",
        "effect": "create",
        "title": "x",
        "description": "Registra a consulta com paciente, profissional, data e horário."
      }
    ],
    "outcome": {
      "statement": "A consulta fica agendada para o paciente e o profissional no horário informado.",
      "evidence": [
        "Consulta criada com data, horário, paciente e profissional.",
        "Horário do profissional passa a constar como ocupado."
      ]
    }
  },
  "businessHash": "sha256:6799d2524c273213ff99272987c51f3fd9ac61dc388d0da06f8449f742856c26"
} as const satisfies Ns5JourneyArtifact;

export type AgendarConsultaJourneyType = typeof agendarConsultaJourney;

export default agendarConsultaJourney;
