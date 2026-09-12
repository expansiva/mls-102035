/// <mls fileReference="_102047_/l4/controleEstoque/journeys/cadastrarProdutoEstoque.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarProdutoEstoqueJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarProdutoEstoque",
  "business": {
    "actorRef": "estoquista",
    "title": "Cadastrar produto para controle de estoque",
    "goal": "Disponibilizar um produto no controle de estoque com sua quantidade mínima definida.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "informarProduto",
        "kind": "act",
        "entity": "Produto",
        "effect": "create",
        "title": "Cadastrar produto",
        "description": "Cadastrar ou vincular o produto ao controle de estoque e informar a quantidade mínima desejada."
      }
    ],
    "outcome": {
      "statement": "O produto fica disponível para movimentação e acompanhamento de estoque.",
      "evidence": [
        "O produto aparece no controle de estoque com a quantidade mínima registrada."
      ]
    }
  },
  "businessHash": "sha256:20594ee8f13191707c177bf9a6a5938127d429cb6eac939e39ccf300ff3c0429"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarProdutoEstoqueJourneyType = typeof cadastrarProdutoEstoqueJourney;

export default cadastrarProdutoEstoqueJourney;
