/// <mls fileReference="_102047_/l4/comandaRestaurante5/journeys/lancarItemNaComanda.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const lancarItemNaComandaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "lancarItemNaComanda",
  "business": {
    "actorRef": "garcom",
    "title": "Lançar item pedido na comanda",
    "goal": "Registrar na comanda um item solicitado pela mesa.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarComandaAberta",
        "kind": "locate",
        "entity": "Comanda",
        "title": "Localizar comanda aberta",
        "description": "Localiza a comanda da mesa, usando a comanda já em atendimento quando disponível."
      },
      {
        "stepId": "consultarItemDoCardapio",
        "kind": "inspect",
        "entity": "ItemCardapio",
        "title": "Consultar item do cardápio",
        "description": "Confere o item solicitado no cardápio."
      },
      {
        "stepId": "registrarItemPedido",
        "kind": "act",
        "entity": "ItemComanda",
        "affects": [
          "Comanda",
          "ItemCardapio"
        ],
        "title": "Registrar item pedido",
        "description": "Inclui na comanda o item pedido e sua quantidade."
      }
    ],
    "outcome": {
      "statement": "O item pedido passa a compor a comanda aberta da mesa.",
      "evidence": [
        "Item lançado aparece na comanda.",
        "Quantidade e valor do item lançado ficam registrados."
      ]
    }
  },
  "businessHash": "sha256:f29068e0387174dab9086d0d668a49883fd65919cbdc928d0db6ce5c8fcb618f"
} as const satisfies Ns5JourneyArtifact;

export type LancarItemNaComandaJourneyType = typeof lancarItemNaComandaJourney;

export default lancarItemNaComandaJourney;
