/// <mls fileReference="_102047_/l4/controleEstoque/journeys/atualizarQuantidadeMinima.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const atualizarQuantidadeMinimaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "atualizarQuantidadeMinima",
  "business": {
    "actorRef": "estoquista",
    "title": "Atualizar quantidade mínima do produto",
    "goal": "Ajustar o nível mínimo usado para acompanhar a necessidade de reposição de um produto.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarProduto",
        "kind": "locate",
        "entity": "Produto",
        "title": "Localizar produto",
        "description": "Localizar o produto que terá a quantidade mínima ajustada."
      },
      {
        "stepId": "inspecionarEstoqueProduto",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Consultar estoque do produto",
        "description": "Consultar o saldo atual e a quantidade mínima configurada para o produto."
      },
      {
        "stepId": "definirQuantidadeMinima",
        "kind": "act",
        "entity": "Produto",
        "effect": "update",
        "title": "Definir quantidade mínima",
        "description": "Atualizar a quantidade mínima do produto."
      }
    ],
    "outcome": {
      "statement": "A quantidade mínima do produto passa a orientar o aviso de estoque baixo.",
      "evidence": [
        "A nova quantidade mínima é exibida nos dados do produto."
      ]
    }
  },
  "businessHash": "sha256:d9e38677f4d28bb4d907b665ef878c2c102fa730413c0cd2d9147edb189c02d6"
} as const satisfies Ns5JourneyArtifact;

export type AtualizarQuantidadeMinimaJourneyType = typeof atualizarQuantidadeMinimaJourney;

export default atualizarQuantidadeMinimaJourney;
