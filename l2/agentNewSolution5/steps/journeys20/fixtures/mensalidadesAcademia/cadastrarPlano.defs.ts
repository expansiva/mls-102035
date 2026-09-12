/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/cadastrarPlano.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarPlanoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPlano",
  "business": {
    "actorRef": "gerencia",
    "title": "Cadastrar plano de academia",
    "goal": "Disponibilizar um plano mensal, trimestral ou anual com valor e dia de vencimento para matrículas.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "informarCondicoesPlano",
        "kind": "act",
        "entity": "Plano",
        "effect": "create",
        "title": "Informar modalidade, valor e dia de vencimento do plano.",
        "description": "Cadastra um plano que poderá ser selecionado nas matrículas."
      }
    ],
    "outcome": {
      "statement": "Um plano com suas condições de cobrança fica disponível para novas matrículas.",
      "evidence": [
        "O plano cadastrado apresenta modalidade, valor e dia de vencimento.",
        "O plano pode ser selecionado ao matricular um aluno."
      ]
    }
  },
  "businessHash": "sha256:d18d870b737f57ba841881bdb2287795223db0c425ee99adab318588fa35f495"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarPlanoJourneyType = typeof cadastrarPlanoJourney;

export default cadastrarPlanoJourney;
