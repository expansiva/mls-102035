/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/corrigirEreenviarDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const corrigirEreenviarDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "corrigirEreenviarDespesa",
  "business": {
    "actorRef": "colaborador",
    "title": "Corrigir e reenviar despesa rejeitada",
    "goal": "Corrigir uma despesa rejeitada e reenviá-la uma única vez para nova aprovação.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesaRejeitada",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesa rejeitada",
        "description": "Localiza uma despesa própria rejeitada que ainda pode ser reenviada."
      },
      {
        "stepId": "consultarMotivoDaRejeicao",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Consultar motivo da rejeição",
        "description": "Consulta o motivo informado pelo gestor para a rejeição."
      },
      {
        "stepId": "corrigirDespesa",
        "kind": "act",
        "entity": "Despesa",
        "title": "Corrigir despesa",
        "description": "Corrige os dados ou o comprovante da despesa rejeitada."
      },
      {
        "stepId": "reenviarParaAprovacao",
        "kind": "act",
        "entity": "Despesa",
        "title": "Reenviar para aprovação",
        "description": "Reenvia a despesa corrigida para nova avaliação, respeitando o único reenvio permitido."
      }
    ],
    "outcome": {
      "statement": "A despesa rejeitada é corrigida e reenviada para nova aprovação.",
      "evidence": [
        "A despesa apresenta os dados corrigidos.",
        "A despesa fica disponível novamente para avaliação do gestor."
      ]
    }
  },
  "businessHash": "sha256:a3c9941d07ee020be411d93eea38945ee977e001b220250419718babf79b7685"
} as const satisfies Ns5JourneyArtifact;

export type CorrigirEreenviarDespesaJourneyType = typeof corrigirEreenviarDespesaJourney;

export default corrigirEreenviarDespesaJourney;
