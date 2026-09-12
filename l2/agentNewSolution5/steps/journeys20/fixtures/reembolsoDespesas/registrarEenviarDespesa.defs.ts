/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/registrarEenviarDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarEenviarDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarEenviarDespesa",
  "business": {
    "actorRef": "colaborador",
    "title": "Registrar e enviar despesa para aprovação",
    "goal": "Registrar uma despesa própria com seus dados e comprovante e encaminhá-la ao gestor da equipe.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "registrarDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "create",
        "title": "Registrar despesa",
        "description": "Informa data, categoria, valor, descrição e comprovante da despesa."
      },
      {
        "stepId": "enviarParaAprovacao",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "submitForApproval",
        "title": "Enviar para aprovação",
        "description": "Encaminha a despesa registrada para avaliação do gestor da equipe."
      },
      {
        "stepId": "encaminharAoGestor",
        "kind": "handoff",
        "entity": "Despesa",
        "title": "Encaminhar ao gestor",
        "description": "A despesa enviada passa para a avaliação do gestor da equipe.",
        "handoffTo": "gestorEquipe"
      }
    ],
    "outcome": {
      "statement": "A despesa própria fica registrada e enviada para aprovação do gestor da equipe.",
      "evidence": [
        "Despesa criada com data, categoria, valor, descrição e comprovante.",
        "Despesa identificada como enviada para aprovação.",
        "Gestor da equipe recebe a responsabilidade de avaliá-la."
      ]
    }
  },
  "businessHash": "sha256:ce14ccc28f1d87c980d7595f2e45d7d6a0674e464c81591c4e11b61a7b90ff5e"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarEenviarDespesaJourneyType = typeof registrarEenviarDespesaJourney;

export default registrarEenviarDespesaJourney;
