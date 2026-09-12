/// <mls fileReference="_102047_/l4/ordenServicio/journeys/entregarYfinalizarOrden.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const entregarYfinalizarOrdenJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "entregarYfinalizarOrden",
  "business": {
    "actorRef": "recepcionista",
    "title": "Entregar el aparato y finalizar una orden",
    "goal": "Entregar al cliente un aparato listo o disponible tras el rechazo y finalizar la orden correspondiente.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenParaEntrega",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar la orden lista o rechazada.",
        "description": "Abrir la orden del aparato disponible para retiro o entrega."
      },
      {
        "stepId": "verificarDisponibilidad",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Verificar la disponibilidad del aparato.",
        "description": "Comprobar que la orden está lista para entrega o cerrada como rechazada y disponible para retiro."
      },
      {
        "stepId": "registrarEntregaYfinalizacion",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "registrarEntregaYfinalizacion",
        "title": "Registrar la entrega y finalizar la orden.",
        "description": "Registrar la entrega del aparato al cliente y finalizar la orden."
      }
    ],
    "outcome": {
      "statement": "El aparato queda entregado al cliente y la orden queda finalizada.",
      "evidence": [
        "La entrega del aparato está registrada en la orden.",
        "La orden figura como finalizada."
      ]
    }
  },
  "businessHash": "sha256:3dd46694fdd743bc9f207e4cbb543331ad4c171104417108d4f45b86e8694b7b"
} as const satisfies Ns5JourneyArtifact;

export type EntregarYfinalizarOrdenJourneyType = typeof entregarYfinalizarOrdenJourney;

export default entregarYfinalizarOrdenJourney;
