/// <mls fileReference="_102047_/l4/controleEstoque/journeys/tratarAvisoEstoqueBaixo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const tratarAvisoEstoqueBaixoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "tratarAvisoEstoqueBaixo",
  "business": {
    "actorRef": "estoquista",
    "title": "Verificar aviso de estoque baixo",
    "goal": "Identificar o produto que atingiu saldo abaixo do mínimo após receber um aviso.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "inspecionarProdutoEmAlerta",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Consultar produto em alerta",
        "description": "Consultar o produto indicado no aviso, seu saldo atual e sua quantidade mínima."
      }
    ],
    "outcome": {
      "statement": "O estoquista identifica o produto que precisa de reposição.",
      "evidence": [
        "O produto do aviso exibe saldo atual abaixo da quantidade mínima.",
        "A situação de estoque baixo permanece visível na consulta do produto."
      ]
    }
  },
  "businessHash": "sha256:9e2259b4627f2be6aa1b02298eccc60db9dce6634b91ba3067b15f0b53718e66"
} as const satisfies Ns5JourneyArtifact;

export type TratarAvisoEstoqueBaixoJourneyType = typeof tratarAvisoEstoqueBaixoJourney;

export default tratarAvisoEstoqueBaixoJourney;
