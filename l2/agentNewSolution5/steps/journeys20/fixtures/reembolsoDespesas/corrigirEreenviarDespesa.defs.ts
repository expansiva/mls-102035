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
        "stepId": "consultarMotivoRejeicao",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Consultar motivo da rejeição",
        "description": "Consulta o motivo informado pelo gestor para a rejeição."
      },
      {
        "stepId": "corrigirDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "update",
        "title": "Corrigir despesa",
        "description": "Corrige os dados ou o comprovante da despesa conforme necessário."
      },
      {
        "stepId": "reenviarDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "resubmitForApproval",
        "title": "Reenviar para aprovação",
        "description": "Reenvia a despesa corrigida para nova avaliação do gestor."
      },
      {
        "stepId": "encaminharDespesaReenviada",
        "kind": "handoff",
        "entity": "Despesa",
        "title": "Encaminhar despesa reenviada",
        "description": "A despesa corrigida segue para nova avaliação do gestor da equipe.",
        "handoffTo": "gestorEquipe"
      }
    ],
    "outcome": {
      "statement": "A despesa rejeitada é corrigida e reenviada para uma única nova avaliação.",
      "evidence": [
        "Alterações da despesa ficam registradas.",
        "Despesa passa novamente para aprovação.",
        "Reenvio da despesa é identificado como realizado."
      ]
    }
  },
  "businessHash": "sha256:210ae97b6f01738f5e82d4315051823abd445b362499fcd9e2bdd7f89f91467e"
} as const satisfies Ns5JourneyArtifact;

export type CorrigirEreenviarDespesaJourneyType = typeof corrigirEreenviarDespesaJourney;

export default corrigirEreenviarDespesaJourney;
