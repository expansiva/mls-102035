/// <mls fileReference="_102047_/l4/compras/journeys/acompanharIndicadoresDeCompras.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const acompanharIndicadoresDeComprasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharIndicadoresDeCompras",
  "business": {
    "actorRef": "gerenteCompras",
    "title": "Acompanhar indicadores de compras",
    "goal": "Acompanhar pedidos em aberto, atrasados e o total comprado por fornecedor no mês.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarPedidosParaPainel",
        "kind": "locate",
        "entity": "PedidoCompra",
        "title": "x",
        "description": "Consulta os pedidos em aberto e os pedidos atrasados no período."
      },
      {
        "stepId": "inspecionarIndicadores",
        "kind": "inspect",
        "entity": "PedidoCompra",
        "title": "x",
        "description": "Visualiza os indicadores de pedidos em aberto, atrasados e totais mensais comprados por fornecedor."
      }
    ],
    "outcome": {
      "statement": "O gerente acompanha a situação dos pedidos e o volume mensal comprado de cada fornecedor.",
      "evidence": [
        "Indicadores de pedidos em aberto e atrasados exibidos.",
        "Totais comprados por fornecedor no mês exibidos."
      ]
    }
  },
  "businessHash": "sha256:dba27bd970d952670ddbdea2907a5153022c68b43be857f723256f67cd2a4a0c"
} as const satisfies Ns5JourneyArtifact;

export type AcompanharIndicadoresDeComprasJourneyType = typeof acompanharIndicadoresDeComprasJourney;

export default acompanharIndicadoresDeComprasJourney;
