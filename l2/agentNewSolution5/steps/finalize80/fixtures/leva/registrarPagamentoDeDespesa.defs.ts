/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/registrarPagamentoDeDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarPagamentoDeDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarPagamentoDeDespesa",
  "business": {
    "actorRef": "financeiro",
    "title": "Registrar pagamento de despesa aprovada",
    "goal": "Consultar uma despesa aprovada e registrar a data de seu pagamento.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesaAprovada",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesa aprovada",
        "description": "Localiza uma despesa aprovada aguardando pagamento."
      },
      {
        "stepId": "consultarDespesaAprovada",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Consultar despesa aprovada",
        "description": "Consulta os dados e o comprovante da despesa aprovada."
      },
      {
        "stepId": "registrarDataDePagamento",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "recordPayment",
        "title": "Registrar pagamento",
        "description": "Registra a data em que a despesa foi paga."
      }
    ],
    "outcome": {
      "statement": "O pagamento da despesa aprovada é registrado.",
      "evidence": [
        "A despesa apresenta a data de pagamento registrada.",
        "A situação da despesa indica que o pagamento foi realizado."
      ]
    }
  },
  "businessHash": "sha256:6682aacb6dd7a957651ff4a2989e3ec729019e8bc17f46f91cd7bba269c58fd6"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarPagamentoDeDespesaJourneyType = typeof registrarPagamentoDeDespesaJourney;

export default registrarPagamentoDeDespesaJourney;
