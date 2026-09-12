/// <mls fileReference="_102047_/l4/controleEstoque/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const controleEstoqueOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "controleEstoque",
  "businessDomain": "Controle de estoque de produtos, movimentações de entrada e saída, saldo disponível e alerta de estoque baixo.",
  "entities": [
    "Produto",
    "MovimentacaoEstoque"
  ],
  "relationships": [
    {
      "relationshipId": "movimentacaoEstoqueProduto",
      "fromEntity": "MovimentacaoEstoque",
      "toEntity": "Produto",
      "type": "manyToOne",
      "required": true,
      "description": "Cada movimentação de estoque registra a entrada ou saída de um produto.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "MovimentacaoEstoque",
        "from": {
          "entityId": "MovimentacaoEstoque",
          "fieldIds": [
            "produtoId"
          ]
        },
        "to": {
          "entityId": "Produto",
          "fieldIds": [
            "id"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type ControleEstoqueOntologyIndexType = typeof controleEstoqueOntologyIndex;

export default controleEstoqueOntologyIndex;
