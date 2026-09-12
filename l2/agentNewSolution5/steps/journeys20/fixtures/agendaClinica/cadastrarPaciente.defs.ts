/// <mls fileReference="_102047_/l4/agendaClinica/journeys/cadastrarPaciente.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarPacienteJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPaciente",
  "business": {
    "actorRef": "recepcionista",
    "title": "Cadastrar paciente",
    "goal": "Registrar ou vincular o paciente para permitir seu atendimento na clínica.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "informarDadosPaciente",
        "kind": "act",
        "entity": "Paciente",
        "effect": "create",
        "title": "x",
        "description": "Informa os dados cadastrais do paciente."
      }
    ],
    "outcome": {
      "statement": "O paciente fica cadastrado ou vinculado ao registro mestre existente.",
      "evidence": [
        "Registro de Paciente disponível para agendamento."
      ]
    }
  },
  "businessHash": "sha256:56f79077b7ebd77e004786f5b826983d537ee6300ec9e1bfc5c4209c17e37929"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarPacienteJourneyType = typeof cadastrarPacienteJourney;

export default cadastrarPacienteJourney;
