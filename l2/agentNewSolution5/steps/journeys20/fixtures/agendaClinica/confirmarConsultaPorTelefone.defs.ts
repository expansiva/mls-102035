/// <mls fileReference="_102047_/l4/agendaClinica/journeys/confirmarConsultaPorTelefone.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const confirmarConsultaPorTelefoneJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "confirmarConsultaPorTelefone",
  "business": {
    "actorRef": "recepcionista",
    "title": "Confirmar consulta por telefone",
    "goal": "Registrar a confirmação telefônica de uma consulta agendada.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaAgendada",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza a consulta agendada para contato."
      },
      {
        "stepId": "inspecionarDadosDaConsulta",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "x",
        "description": "Confere os dados da consulta antes do contato telefônico."
      },
      {
        "stepId": "confirmarConsulta",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "confirmarConsulta",
        "title": "x",
        "description": "Registra que o paciente confirmou a consulta por telefone."
      }
    ],
    "outcome": {
      "statement": "A consulta fica registrada como confirmada.",
      "evidence": [
        "Situação da consulta indica confirmação.",
        "Registro da consulta mostra a confirmação telefônica."
      ]
    }
  },
  "businessHash": "sha256:4172afd9d3b870f9c2ff59752c98b18dddf6a822f373846d09d5397f8526616e"
} as const satisfies Ns5JourneyArtifact;

export type ConfirmarConsultaPorTelefoneJourneyType = typeof confirmarConsultaPorTelefoneJourney;

export default confirmarConsultaPorTelefoneJourney;
