/// <mls fileReference="_102047_/l4/controleEstoque/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const controleEstoqueWorkflows = {
  "schemaVersion": "2026-09-12-ns5-workflows-v2",
  "moduleName": "controleEstoque",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarProdutoEstoque",
      "inProcess": false
    },
    {
      "journeyId": "atualizarQuantidadeMinima",
      "inProcess": false
    },
    {
      "journeyId": "registrarMovimentacaoEstoque",
      "inProcess": false
    },
    {
      "journeyId": "consultarSaldoProduto",
      "inProcess": false
    },
    {
      "journeyId": "tratarAvisoEstoqueBaixo",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type ControleEstoqueWorkflowsType = typeof controleEstoqueWorkflows;

export default controleEstoqueWorkflows;
