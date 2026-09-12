/// <mls fileReference="_102047_/l4/agendaClinica/journeys/registrarAtendimento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarAtendimentoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarAtendimento",
  "business": {
    "actorRef": "profissional",
    "title": "Registrar atendimento realizado",
    "goal": "Marcar uma consulta como atendida e registrar uma anotação do atendimento.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaParaAtendimento",
        "kind": "locate",
        "entity": "Consulta",
        "title": "Localizar consulta",
        "description": "Localiza a própria consulta que foi realizada."
      },
      {
        "stepId": "consultarConsulta",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "Consultar consulta",
        "description": "Confere os dados da consulta antes de registrar o atendimento."
      },
      {
        "stepId": "registrarAtendimentoRealizado",
        "kind": "act",
        "entity": "Consulta",
        "title": "Registrar atendimento",
        "description": "Marca a consulta como atendida e registra a anotação do atendimento."
      }
    ],
    "outcome": {
      "statement": "A consulta fica registrada como atendida com a anotação do profissional.",
      "evidence": [
        "Consulta marcada como atendida.",
        "Anotação do atendimento registrada na consulta."
      ]
    }
  },
  "businessHash": "sha256:f8dca464a8502acbe31f2e0f27b17e902909fb438904f81ce5bae0ed53f16c7d"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarAtendimentoJourneyType = typeof registrarAtendimentoJourney;

export default registrarAtendimentoJourney;
