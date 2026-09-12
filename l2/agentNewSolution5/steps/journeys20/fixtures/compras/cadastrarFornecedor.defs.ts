/// <mls fileReference="_102047_/l4/compras/journeys/cadastrarFornecedor.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarFornecedorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarFornecedor",
  "business": {
    "actorRef": "comprador",
    "title": "Cadastrar fornecedor",
    "goal": "Cadastrar ou vincular um fornecedor da organização a partir de seus dados empresariais.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "informarDadosFornecedor",
        "kind": "act",
        "entity": "Fornecedor",
        "effect": "create",
        "title": "x",
        "description": "Informa CNPJ, razão social e contatos para criar ou vincular o cadastro mestre do fornecedor."
      }
    ],
    "outcome": {
      "statement": "O fornecedor fica disponível para ser utilizado nas compras da organização.",
      "evidence": [
        "Cadastro do fornecedor identificado pelo CNPJ, com razão social e contatos disponíveis."
      ]
    }
  },
  "businessHash": "sha256:44edbdbaec2bd9cdadf04866fce22d2b96f3ecfecaeaf5c4e9e3263a632962b7"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarFornecedorJourneyType = typeof cadastrarFornecedorJourney;

export default cadastrarFornecedorJourney;
