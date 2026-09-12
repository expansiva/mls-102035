/// <mls fileReference="_102047_/l4/controleEstoque/journeys/registrarMovimentacaoEstoque.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarMovimentacaoEstoqueJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarMovimentacaoEstoque",
  "business": {
    "actorRef": "estoquista",
    "title": "Registrar movimentação de estoque",
    "goal": "Registrar uma entrada ou saída de unidades de um produto e manter seu saldo disponível atualizado.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarProdutoMovimentacao",
        "kind": "locate",
        "entity": "Produto",
        "title": "Localizar produto",
        "description": "Localizar o produto que receberá uma entrada ou terá unidades retiradas."
      },
      {
        "stepId": "inspecionarProdutoMovimentacao",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Consultar produto",
        "description": "Consultar o saldo atual do produto antes do registro da movimentação."
      },
      {
        "stepId": "registrarMovimentacao",
        "kind": "act",
        "entity": "MovimentacaoEstoque",
        "affects": [
          "Produto"
        ],
        "effect": "create",
        "title": "Registrar movimentação",
        "description": "Registrar a movimentação, informando se é entrada ou saída, o produto, a quantidade e os dados do registro."
      }
    ],
    "outcome": {
      "statement": "A movimentação fica registrada de forma imutável e o saldo do produto é atualizado conforme o tipo informado.",
      "evidence": [
        "Uma movimentação de entrada ou saída é exibida no histórico do produto.",
        "O saldo atual do produto aumenta para entradas e diminui para saídas pela quantidade registrada."
      ]
    }
  },
  "businessHash": "sha256:38ddcf66d42e3c143d43f7bc3d342a73dd19f6906118877f1e452b5a92e8d2bf"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarMovimentacaoEstoqueJourneyType = typeof registrarMovimentacaoEstoqueJourney;

export default registrarMovimentacaoEstoqueJourney;
