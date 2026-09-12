/// <mls fileReference="_102047_/l4/compras/journeys/registrarRecebimentoDePedido.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarRecebimentoDePedidoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarRecebimentoDePedido",
  "business": {
    "actorRef": "almoxarife",
    "title": "Registrar recebimento de pedido",
    "goal": "Registrar o recebimento total ou parcial de produtos de um pedido e dar entrada no estoque.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPedidoParaRecebimento",
        "kind": "locate",
        "entity": "PedidoCompra",
        "title": "x",
        "description": "Abre o pedido recebido em contexto ou o localiza para conferência."
      },
      {
        "stepId": "inspecionarItensDoPedido",
        "kind": "inspect",
        "entity": "PedidoCompra",
        "title": "x",
        "description": "Confere os itens e as quantidades previstas no pedido."
      },
      {
        "stepId": "registrarRecebimento",
        "kind": "act",
        "entity": "RecebimentoCompra",
        "affects": [
          "PedidoCompra",
          "Produto",
          "EstoqueProduto"
        ],
        "effect": "create",
        "title": "x",
        "description": "Registra as quantidades efetivamente recebidas, total ou parcialmente, e a entrada correspondente no estoque."
      }
    ],
    "outcome": {
      "statement": "O recebimento é registrado e o estoque dos produtos recebidos é atualizado.",
      "evidence": [
        "Registro de recebimento com quantidades recebidas.",
        "Saldo de estoque dos produtos recebidos atualizado."
      ]
    }
  },
  "businessHash": "sha256:bfdfbdffdf87c9f9e90ad1b66f3de8b5ebe1ebf125a1c01ac19b5e39604f5d9f"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarRecebimentoDePedidoJourneyType = typeof registrarRecebimentoDePedidoJourney;

export default registrarRecebimentoDePedidoJourney;
