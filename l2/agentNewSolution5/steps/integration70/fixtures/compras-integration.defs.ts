/// <mls fileReference="_102047_/l4/compras/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const comprasIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "compras",
  "inbound": [],
  "outbound": [
    {
      "id": "registrarRecebimentoParcial",
      "kind": "event",
      "to": "controleEstoque",
      "event": "registrarRecebimentoParcial",
      "on": "PedidoCompra.registrarRecebimentoParcial",
      "description": "Comunica ao módulo de controle de estoque o recebimento parcial do pedido para registrar a entrada das quantidades recebidas.",
      "entityRefs": [
        "PedidoCompra",
        "RecebimentoCompra",
        "ItemRecebimentoCompra"
      ]
    },
    {
      "id": "registrarRecebimentoTotal",
      "kind": "event",
      "to": "controleEstoque",
      "event": "registrarRecebimentoTotal",
      "on": "PedidoCompra.registrarRecebimentoTotal",
      "description": "Comunica ao módulo de controle de estoque o recebimento total do pedido para registrar a entrada dos produtos recebidos.",
      "entityRefs": [
        "PedidoCompra",
        "RecebimentoCompra",
        "ItemRecebimentoCompra"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type ComprasIntegrationType = typeof comprasIntegration;

export default comprasIntegration;
