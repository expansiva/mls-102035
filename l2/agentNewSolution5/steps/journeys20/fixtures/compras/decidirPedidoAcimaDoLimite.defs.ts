/// <mls fileReference="_102047_/l4/compras/journeys/decidirPedidoAcimaDoLimite.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const decidirPedidoAcimaDoLimiteJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "decidirPedidoAcimaDoLimite",
  "business": {
    "actorRef": "gerenteCompras",
    "title": "Decidir pedido acima do limite",
    "goal": "Decidir pela aprovação ou rejeição de um pedido de compra que exige autorização.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "localizarPedidoPendente",
        "kind": "locate",
        "entity": "PedidoCompra",
        "title": "x",
        "description": "Abre o pedido indicado pela notificação ou o localiza entre os pedidos pendentes de aprovação."
      },
      {
        "stepId": "inspecionarPedido",
        "kind": "inspect",
        "entity": "PedidoCompra",
        "title": "x",
        "description": "Confere fornecedor, itens, quantidades, preços e valor total do pedido."
      },
      {
        "stepId": "decidirAprovacaoOuRejeicao",
        "kind": "decide",
        "entity": "PedidoCompra",
        "title": "x",
        "description": "Decide entre aprovar ou rejeitar o pedido."
      },
      {
        "stepId": "registrarDecisao",
        "kind": "act",
        "entity": "PedidoCompra",
        "effect": "transition",
        "transitionRef": "decidirPedido",
        "title": "x",
        "description": "Registra a aprovação ou a rejeição escolhida para o pedido."
      }
    ],
    "outcome": {
      "statement": "A decisão de aprovar ou rejeitar o pedido acima do limite é registrada.",
      "evidence": [
        "Situação de aprovação do pedido registrada como aprovada ou rejeitada."
      ]
    }
  },
  "businessHash": "sha256:3b1a3bd7a18697437c74576d4a49775533aed317544715e1be1d99d4bece4dd9"
} as const satisfies Ns5JourneyArtifact;

export type DecidirPedidoAcimaDoLimiteJourneyType = typeof decidirPedidoAcimaDoLimiteJourney;

export default decidirPedidoAcimaDoLimiteJourney;
