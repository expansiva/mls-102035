/// <mls fileReference="_102047_/l4/comandaRestaurante5/journeys/cancelarItemLancadoPorEngano.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cancelarItemLancadoPorEnganoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarItemLancadoPorEngano",
  "business": {
    "actorRef": "garcom",
    "title": "Cancelar item lançado por engano",
    "goal": "Retirar da comanda um item registrado incorretamente.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarComandaParaCorrecao",
        "kind": "locate",
        "entity": "Comanda",
        "title": "Localizar comanda",
        "description": "Localiza a comanda aberta que precisa de correção."
      },
      {
        "stepId": "conferirItemLancado",
        "kind": "inspect",
        "entity": "ItemComanda",
        "title": "Conferir item lançado",
        "description": "Identifica o item que foi lançado por engano."
      },
      {
        "stepId": "cancelarItemLancado",
        "kind": "act",
        "entity": "ItemComanda",
        "affects": [
          "Comanda"
        ],
        "effect": "update",
        "title": "Cancelar item lançado",
        "description": "Cancela o item incorreto na comanda."
      }
    ],
    "outcome": {
      "statement": "O item lançado por engano deixa de ser considerado no valor da comanda.",
      "evidence": [
        "Item com status de cancelado na comanda.",
        "Total da comanda atualizado sem o item cancelado."
      ]
    }
  },
  "businessHash": "sha256:e0e918edb38fcf54da476a4f0c8506be681c4486aea2d6a8ae52cc3e68da91c5"
} as const satisfies Ns5JourneyArtifact;

export type CancelarItemLancadoPorEnganoJourneyType = typeof cancelarItemLancadoPorEnganoJourney;

export default cancelarItemLancadoPorEnganoJourney;
