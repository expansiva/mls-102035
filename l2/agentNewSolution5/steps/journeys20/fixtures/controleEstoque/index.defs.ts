/// <mls fileReference="_102047_/l4/controleEstoque/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const controleEstoqueJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "controleEstoque",
  "journeys": [
    {
      "journeyId": "cadastrarProdutoEstoque",
      "actorRef": "estoquista",
      "title": "Cadastrar produto para controle de estoque"
    },
    {
      "journeyId": "atualizarQuantidadeMinima",
      "actorRef": "estoquista",
      "title": "Atualizar quantidade mínima do produto"
    },
    {
      "journeyId": "registrarMovimentacaoEstoque",
      "actorRef": "estoquista",
      "title": "Registrar movimentação de estoque"
    },
    {
      "journeyId": "consultarSaldoProduto",
      "actorRef": "estoquista",
      "title": "Consultar saldo de produto"
    },
    {
      "journeyId": "tratarAvisoEstoqueBaixo",
      "actorRef": "estoquista",
      "title": "Verificar aviso de estoque baixo"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type ControleEstoqueJourneyIndexType = typeof controleEstoqueJourneyIndex;

export default controleEstoqueJourneyIndex;
