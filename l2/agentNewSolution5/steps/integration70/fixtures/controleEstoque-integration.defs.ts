/// <mls fileReference="_102047_/l4/controleEstoque/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const controleEstoqueIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "controleEstoque",
  "inbound": [],
  "outbound": [
    {
      "id": "estoqueAbaixoDoMinimo",
      "kind": "event",
      "to": "any",
      "event": "estoqueAbaixoDoMinimo",
      "on": "MovimentacaoEstoque.create",
      "description": "Publica um aviso para módulos interessados quando uma movimentação registrada deixar o saldo do produto abaixo do estoque mínimo.",
      "entityRefs": [
        "Produto",
        "MovimentacaoEstoque"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type ControleEstoqueIntegrationType = typeof controleEstoqueIntegration;

export default controleEstoqueIntegration;
