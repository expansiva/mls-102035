/// <mls fileReference="_102047_/l4/compras/journeys/definirProdutosDoFornecedor.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const definirProdutosDoFornecedorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "definirProdutosDoFornecedor",
  "business": {
    "actorRef": "comprador",
    "title": "Definir produtos e preços do fornecedor",
    "goal": "Registrar os produtos fornecidos por um fornecedor e o preço comercial combinado.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarFornecedor",
        "kind": "locate",
        "entity": "Fornecedor",
        "title": "x",
        "description": "Localiza o fornecedor já selecionado ou o pesquisa pelo CNPJ ou razão social."
      },
      {
        "stepId": "localizarProdutos",
        "kind": "locate",
        "entity": "Produto",
        "title": "x",
        "description": "Localiza os produtos disponibilizados pelo fornecedor."
      },
      {
        "stepId": "registrarFornecimento",
        "kind": "act",
        "entity": "FornecimentoProduto",
        "affects": [
          "Fornecedor",
          "Produto"
        ],
        "effect": "create",
        "title": "x",
        "description": "Registra cada produto fornecido e seu preço combinado."
      }
    ],
    "outcome": {
      "statement": "Os produtos oferecidos pelo fornecedor e seus preços combinados ficam disponíveis para a abertura de pedidos.",
      "evidence": [
        "Relação de produtos do fornecedor com preços combinados registrada."
      ]
    }
  },
  "businessHash": "sha256:87ced390553b4a46eea3cfd060f2af5a948515e2b393ebddaa72ca650dbdce38"
} as const satisfies Ns5JourneyArtifact;

export type DefinirProdutosDoFornecedorJourneyType = typeof definirProdutosDoFornecedorJourney;

export default definirProdutosDoFornecedorJourney;
