/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/atualizarPlano.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const atualizarPlanoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "atualizarPlano",
  "business": {
    "actorRef": "gerencia",
    "title": "Atualizar condições de um plano",
    "goal": "Manter o valor e o dia de vencimento de um plano de academia atualizados.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPlano",
        "kind": "locate",
        "entity": "Plano",
        "title": "Localizar o plano a ser alterado.",
        "description": "Busca o plano a partir do contexto disponível ou da lista de planos."
      },
      {
        "stepId": "inspecionarCondicoesPlano",
        "kind": "inspect",
        "entity": "Plano",
        "title": "Conferir as condições atuais do plano.",
        "description": "Visualiza modalidade, valor e dia de vencimento cadastrados."
      },
      {
        "stepId": "alterarCondicoesPlano",
        "kind": "act",
        "entity": "Plano",
        "effect": "update",
        "title": "Alterar as condições do plano.",
        "description": "Atualiza o valor e/ou o dia de vencimento do plano."
      }
    ],
    "outcome": {
      "statement": "As condições do plano foram atualizadas para uso nas cobranças aplicáveis.",
      "evidence": [
        "O plano exibe o novo valor ou dia de vencimento.",
        "A alteração fica registrada no plano."
      ]
    }
  },
  "businessHash": "sha256:8313981a46af047a3194325af6ac1397da277ed16690686c4adbbaeb99b00e4a"
} as const satisfies Ns5JourneyArtifact;

export type AtualizarPlanoJourneyType = typeof atualizarPlanoJourney;

export default atualizarPlanoJourney;
