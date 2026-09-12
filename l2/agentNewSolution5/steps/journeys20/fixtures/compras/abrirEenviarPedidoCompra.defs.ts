/// <mls fileReference="_102047_/l4/compras/journeys/abrirEenviarPedidoCompra.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const abrirEenviarPedidoCompraJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirEenviarPedidoCompra",
  "business": {
    "actorRef": "comprador",
    "title": "Abrir e enviar pedido de compra",
    "goal": "Criar um pedido para um fornecedor com os produtos, quantidades e preços acordados e enviá-lo.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarFornecedorDoPedido",
        "kind": "locate",
        "entity": "Fornecedor",
        "title": "x",
        "description": "Localiza o fornecedor para o qual o pedido será aberto."
      },
      {
        "stepId": "selecionarProdutosDoFornecedor",
        "kind": "locate",
        "entity": "FornecimentoProduto",
        "title": "x",
        "description": "Consulta os produtos e preços combinados disponíveis para o fornecedor."
      },
      {
        "stepId": "abrirPedido",
        "kind": "act",
        "entity": "PedidoCompra",
        "affects": [
          "Fornecedor",
          "Produto"
        ],
        "effect": "create",
        "title": "x",
        "description": "Cria o pedido com um ou mais produtos, suas quantidades e preços."
      },
      {
        "stepId": "enviarPedido",
        "kind": "act",
        "entity": "PedidoCompra",
        "effect": "transition",
        "transitionRef": "enviarPedido",
        "title": "x",
        "description": "Envia o pedido de compra para processamento."
      },
      {
        "stepId": "encaminharParaAprovacao",
        "kind": "handoff",
        "entity": "PedidoCompra",
        "title": "x",
        "description": "Encaminha ao gerente de compras os pedidos cujo valor exige aprovação.",
        "handoffTo": "gerenteCompras"
      }
    ],
    "outcome": {
      "statement": "O pedido é enviado e, quando ultrapassa o valor limite, fica disponível para decisão do gerente de compras.",
      "evidence": [
        "Pedido de compra com fornecedor, itens, quantidades, preços e situação de envio registrada."
      ]
    }
  },
  "businessHash": "sha256:561721ec07a3e2088e1ef2ff99b385f72b30a649621b3792a07ed535dfb7476e"
} as const satisfies Ns5JourneyArtifact;

export type AbrirEenviarPedidoCompraJourneyType = typeof abrirEenviarPedidoCompraJourney;

export default abrirEenviarPedidoCompraJourney;
