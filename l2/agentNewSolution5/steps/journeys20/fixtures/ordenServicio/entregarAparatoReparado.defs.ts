/// <mls fileReference="_102047_/l4/ordenServicio/journeys/entregarAparatoReparado.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const entregarAparatoReparadoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "entregarAparatoReparado",
  "business": {
    "actorRef": "recepcionista",
    "title": "Entregar aparato reparado",
    "goal": "Entregar al cliente un aparato listo y finalizar la orden.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenLista",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar orden lista",
        "description": "Localiza la orden marcada como lista para entrega."
      },
      {
        "stepId": "verificarEntrega",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Verificar entrega",
        "description": "Verifica la identidad del cliente, el aparato y que la orden está lista para entrega."
      },
      {
        "stepId": "entregarYfinalizarOrden",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "entregarYfinalizar",
        "title": "Entregar y finalizar orden",
        "description": "Entrega el aparato reparado al cliente y finaliza la orden."
      }
    ],
    "outcome": {
      "statement": "El aparato reparado fue entregado y la orden quedó finalizada.",
      "evidence": [
        "La orden registra la entrega al cliente.",
        "El estado de la orden indica que está finalizada."
      ]
    }
  },
  "businessHash": "sha256:0d94a48b9c01e5a64a58a0e8cf7503c25c0541914925e562f48d5cbc5d39c60d"
} as const satisfies Ns5JourneyArtifact;

export type EntregarAparatoReparadoJourneyType = typeof entregarAparatoReparadoJourney;

export default entregarAparatoReparadoJourney;
