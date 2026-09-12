/// <mls fileReference="_102047_/l4/agendaClinica/journeys/registrarFaltaPaciente.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarFaltaPacienteJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarFaltaPaciente",
  "business": {
    "actorRef": "recepcionista",
    "title": "Registrar falta do paciente",
    "goal": "Registrar que o paciente não compareceu à consulta.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaDoPaciente",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza a consulta em que o paciente não compareceu."
      },
      {
        "stepId": "registrarFalta",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "registrarFalta",
        "title": "x",
        "description": "Marca a consulta como falta do paciente."
      }
    ],
    "outcome": {
      "statement": "A ausência do paciente fica registrada na consulta.",
      "evidence": [
        "Situação da consulta indica falta.",
        "Consulta permanece disponível no histórico do paciente e do profissional."
      ]
    }
  },
  "businessHash": "sha256:7bc5e90e6b1f478bb7841c1ee551d593c82221774efe834cb4605f2d4c7ef094"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarFaltaPacienteJourneyType = typeof registrarFaltaPacienteJourney;

export default registrarFaltaPacienteJourney;
