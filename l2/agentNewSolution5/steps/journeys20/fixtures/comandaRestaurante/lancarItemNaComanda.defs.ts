/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/lancarItemNaComanda.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const lancarItemNaComandaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "lancarItemNaComanda",
  "business": {
    "actorRef": "garcom",
    "title": "Lançar item na comanda",
    "goal": "Adicionar um item do cardápio à comanda aberta de uma mesa.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarComandaAberta",
        "kind": "locate",
        "entity": "Comanda",
        "title": "x",
        "description": "Localiza a comanda aberta, usando a mesa ou a própria comanda."
      },
      {
        "stepId": "inspecionarComanda",
        "kind": "inspect",
        "entity": "Comanda",
        "title": "x",
        "description": "Confere a comanda aberta e seus lançamentos atuais."
      },
      {
        "stepId": "localizarItemDoCardapio",
        "kind": "locate",
        "entity": "ItemCardapio",
        "title": "x",
        "description": "Localiza o item solicitado no cardápio."
      },
      {
        "stepId": "criarLancamento",
        "kind": "act",
        "entity": "ItemComanda",
        "affects": [
          "Comanda",
          "ItemCardapio"
        ],
        "effect": "create",
        "title": "x",
        "description": "Lança o item com quantidade e observação na comanda aberta."
      }
    ],
    "outcome": {
      "statement": "O item solicitado é registrado na comanda aberta.",
      "evidence": [
        "Lançamento com item, quantidade e observação registrado na comanda.",
        "Comanda apresenta o novo lançamento."
      ]
    }
  },
  "businessHash": "sha256:92cb85895a3d372c0bbbde9897ff23f26dcd141cc1c9ccf9228d061f68a25ba7"
} as const satisfies Ns5JourneyArtifact;

export type LancarItemNaComandaJourneyType = typeof lancarItemNaComandaJourney;

export default lancarItemNaComandaJourney;
