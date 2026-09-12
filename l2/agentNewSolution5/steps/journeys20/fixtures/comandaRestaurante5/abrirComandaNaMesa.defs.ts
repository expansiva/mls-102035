/// <mls fileReference="_102047_/l4/comandaRestaurante5/journeys/abrirComandaNaMesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const abrirComandaNaMesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirComandaNaMesa",
  "business": {
    "actorRef": "garcom",
    "title": "Abrir comanda em uma mesa",
    "goal": "Iniciar o atendimento de uma mesa com uma comanda vinculada.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarMesa",
        "kind": "locate",
        "entity": "Mesa",
        "title": "Localizar mesa",
        "description": "Localiza a mesa que será atendida."
      },
      {
        "stepId": "abrirComanda",
        "kind": "act",
        "entity": "Comanda",
        "affects": [
          "Mesa"
        ],
        "effect": "update",
        "title": "Abrir comanda",
        "description": "Cria uma comanda aberta para a mesa selecionada."
      }
    ],
    "outcome": {
      "statement": "A mesa fica com uma comanda aberta para registrar os pedidos.",
      "evidence": [
        "Comanda identificada como aberta e vinculada à mesa.",
        "Mesa identificada na comanda aberta."
      ]
    }
  },
  "businessHash": "sha256:da6d3ad314adcdbe2648ab84cbb84e40859cb75d3342fd7ed8601f8cfc6b0c33"
} as const satisfies Ns5JourneyArtifact;

export type AbrirComandaNaMesaJourneyType = typeof abrirComandaNaMesaJourney;

export default abrirComandaNaMesaJourney;
