/// <mls fileReference="_102047_/l4/ordenServicio5/journeys/entregarAparatoYfinalizarOrden.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const entregarAparatoYfinalizarOrdenJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "entregarAparatoYfinalizarOrden",
  "business": {
    "actorRef": "recepcionista",
    "title": "Entregar un aparato y finalizar la orden",
    "goal": "Entregar al cliente un aparato cuya orden está lista o quedó rechazada y finalizar la gestión correspondiente.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenParaEntrega",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar la orden disponible para entrega.",
        "description": "Localizar la orden lista para entrega o cerrada como rechazada cuyo aparato está disponible para retiro."
      },
      {
        "stepId": "verificarOrdenYaparato",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Verificar la orden y el aparato a entregar.",
        "description": "Revisar la identificación del cliente, el estado de la orden y el aparato disponible."
      },
      {
        "stepId": "registrarEntregaYfinalizacion",
        "kind": "act",
        "entity": "OrdenServicio",
        "affects": [
          "EntregaAparato",
          "Aparato"
        ],
        "title": "Registrar la entrega y finalizar la orden.",
        "description": "Registrar la entrega del aparato al cliente y finalizar la orden correspondiente."
      }
    ],
    "outcome": {
      "statement": "El aparato queda entregado al cliente y la orden queda finalizada.",
      "evidence": [
        "Existe un registro de entrega del aparato.",
        "La orden muestra estado finalizada."
      ]
    }
  },
  "businessHash": "sha256:d6ae6dd00e1b4f6f53d4771440c4f86279079ff2d6d4f51fe525ce0cf40df226"
} as const satisfies Ns5JourneyArtifact;

export type EntregarAparatoYfinalizarOrdenJourneyType = typeof entregarAparatoYfinalizarOrdenJourney;

export default entregarAparatoYfinalizarOrdenJourney;
