/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/cancelarInscricao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cancelarInscricaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarInscricao",
  "business": {
    "actorRef": "publico",
    "title": "Cancelar inscrição",
    "goal": "Cancelar a própria inscrição em um evento e liberar a vaga quando houver uma confirmação.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarInscricao",
        "kind": "locate",
        "entity": "Inscricao",
        "title": "Localizar inscrição",
        "description": "Localiza a própria inscrição do evento."
      },
      {
        "stepId": "consultarInscricao",
        "kind": "inspect",
        "entity": "Inscricao",
        "title": "Consultar inscrição",
        "description": "Confere os dados e a situação da inscrição antes do cancelamento."
      },
      {
        "stepId": "cancelarInscricao",
        "kind": "act",
        "entity": "Inscricao",
        "effect": "transition",
        "transitionRef": "cancelarInscricao",
        "title": "Cancelar inscrição",
        "description": "Cancela a inscrição; caso uma vaga seja liberada, o primeiro participante da lista de espera é promovido automaticamente."
      }
    ],
    "outcome": {
      "statement": "A inscrição é cancelada e uma eventual vaga liberada é destinada ao primeiro participante da lista de espera.",
      "evidence": [
        "Situação da inscrição alterada para cancelada.",
        "Próxima inscrição em lista de espera promovida quando aplicável."
      ]
    }
  },
  "businessHash": "sha256:89447bf01d13332f5d9bd061692e3917620ec4f2283b9e9b7295a057215b3462"
} as const satisfies Ns5JourneyArtifact;

export type CancelarInscricaoJourneyType = typeof cancelarInscricaoJourney;

export default cancelarInscricaoJourney;
