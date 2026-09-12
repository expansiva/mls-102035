/// <mls fileReference="_102047_/l4/controleEstoque/journeys/consultarSaldoProduto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarSaldoProdutoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarSaldoProduto",
  "business": {
    "actorRef": "estoquista",
    "title": "Consultar saldo de produto",
    "goal": "Verificar o saldo atual e a situação de estoque de um produto.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarProdutoSaldo",
        "kind": "locate",
        "entity": "Produto",
        "title": "Localizar produto",
        "description": "Localizar o produto cujo estoque será consultado."
      },
      {
        "stepId": "inspecionarSaldoProduto",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Consultar saldo do produto",
        "description": "Consultar o saldo atual, a quantidade mínima e a situação de estoque do produto."
      }
    ],
    "outcome": {
      "statement": "O estoquista conhece o saldo disponível e identifica se o produto está abaixo do mínimo.",
      "evidence": [
        "O saldo atual e a quantidade mínima são exibidos para o produto.",
        "A situação de estoque baixo é indicada quando o saldo está abaixo da quantidade mínima."
      ]
    }
  },
  "businessHash": "sha256:1e9f59426697c4ef7fc5868f102a3d24e62f5990c2e03766499373b14bfcc138"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarSaldoProdutoJourneyType = typeof consultarSaldoProdutoJourney;

export default consultarSaldoProdutoJourney;
