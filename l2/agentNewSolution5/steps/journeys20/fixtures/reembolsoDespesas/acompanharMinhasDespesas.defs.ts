/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/acompanharMinhasDespesas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const acompanharMinhasDespesasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharMinhasDespesas",
  "business": {
    "actorRef": "colaborador",
    "title": "Acompanhar minhas despesas",
    "goal": "Consultar as próprias despesas e verificar sua situação de aprovação ou pagamento.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarMinhasDespesas",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar minhas despesas",
        "description": "Localiza as despesas vinculadas ao próprio colaborador."
      },
      {
        "stepId": "consultarSituacaoDespesa",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Consultar situação da despesa",
        "description": "Verifica os dados da despesa, a decisão do gestor, o motivo de rejeição quando existir e a data de pagamento quando registrada."
      }
    ],
    "outcome": {
      "statement": "O colaborador acompanha a situação de suas próprias despesas.",
      "evidence": [
        "Lista de despesas do colaborador é apresentada.",
        "Situação de aprovação, motivo de rejeição e pagamento podem ser consultados."
      ]
    }
  },
  "businessHash": "sha256:02c034c15d4142b6a905fc2ebdc527135d86404df5ea00886401ee53051e1c02"
} as const satisfies Ns5JourneyArtifact;

export type AcompanharMinhasDespesasJourneyType = typeof acompanharMinhasDespesasJourney;

export default acompanharMinhasDespesasJourney;
