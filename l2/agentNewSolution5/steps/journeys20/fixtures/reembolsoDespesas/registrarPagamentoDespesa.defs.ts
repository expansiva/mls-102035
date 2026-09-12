/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/registrarPagamentoDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarPagamentoDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarPagamentoDespesa",
  "business": {
    "actorRef": "financeiro",
    "title": "Registrar pagamento de despesa aprovada",
    "goal": "Consultar despesas aprovadas e registrar a data de pagamento de uma delas.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesasAprovadas",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesas aprovadas",
        "description": "Localiza as despesas aprovadas disponíveis para pagamento."
      },
      {
        "stepId": "consultarDespesaAprovada",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Consultar despesa aprovada",
        "description": "Consulta os dados e o comprovante da despesa aprovada."
      },
      {
        "stepId": "registrarPagamento",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "registerPayment",
        "title": "Registrar pagamento",
        "description": "Registra a data em que a despesa aprovada foi paga."
      }
    ],
    "outcome": {
      "statement": "O pagamento da despesa aprovada fica registrado com sua data.",
      "evidence": [
        "Despesa consultada consta como aprovada.",
        "Data de pagamento fica registrada na despesa.",
        "Despesa é identificada como paga."
      ]
    }
  },
  "businessHash": "sha256:96b2a3dc369f55cd902011a621ad1160228c3443d338e2b0f7eb819d5301fc47"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarPagamentoDespesaJourneyType = typeof registrarPagamentoDespesaJourney;

export default registrarPagamentoDespesaJourney;
