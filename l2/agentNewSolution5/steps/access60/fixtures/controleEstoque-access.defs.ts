/// <mls fileReference="_102047_/l4/controleEstoque/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const controleEstoqueAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "controleEstoque",
  "actors": [
    {
      "actorId": "estoquista",
      "kind": "internal",
      "origin": "named",
      "title": "Estoquista",
      "description": "Profissional responsável por operar o controle de estoque, registrando entradas e saídas de produtos."
    }
  ],
  "grants": [
    {
      "grantId": "operarEstoque",
      "actorRef": "estoquista",
      "title": "Operar controle de estoque",
      "description": "Permite ao estoquista cadastrar e acompanhar produtos de estoque, definir quantidades mínimas e registrar e consultar movimentações de entrada e saída.",
      "entityRefs": [
        "Produto",
        "MovimentacaoEstoque"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os produtos e as movimentações de estoque de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite visualizar todos os dados dos produtos controlados e das movimentações de estoque."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type ControleEstoqueAccessType = typeof controleEstoqueAccess;

export default controleEstoqueAccess;
