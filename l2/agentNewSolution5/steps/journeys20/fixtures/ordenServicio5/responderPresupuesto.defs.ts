/// <mls fileReference="_102047_/l4/ordenServicio5/journeys/responderPresupuesto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const responderPresupuestoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "responderPresupuesto",
  "business": {
    "actorRef": "cliente",
    "title": "Responder un presupuesto",
    "goal": "Aprobar o rechazar desde el portal el presupuesto de una orden propia.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "localizarOrdenPresupuestada",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Abrir la orden propia con presupuesto.",
        "description": "Localizar la orden propia notificada o buscarla entre las órdenes propias."
      },
      {
        "stepId": "revisarPresupuestoYdiagnostico",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Revisar el estado, diagnóstico y valor del presupuesto.",
        "description": "Consultar el diagnóstico y el valor del presupuesto de la orden propia."
      },
      {
        "stepId": "decidirRespuestaPresupuesto",
        "kind": "decide",
        "entity": "Presupuesto",
        "title": "Elegir aprobar o rechazar el presupuesto.",
        "description": "Seleccionar la aprobación para autorizar la reparación o el rechazo para cerrar la orden y retirar el aparato."
      },
      {
        "stepId": "registrarRespuestaPresupuesto",
        "kind": "act",
        "entity": "OrdenServicio",
        "affects": [
          "Presupuesto",
          "Aparato"
        ],
        "title": "Registrar la respuesta al presupuesto.",
        "description": "Registrar la aprobación para dejar la orden disponible para reparación o el rechazo para cerrarla y dejar el aparato disponible para retiro."
      }
    ],
    "outcome": {
      "statement": "La respuesta del cliente queda registrada: la orden queda autorizada para reparación o cerrada como rechazada con el aparato disponible para retiro.",
      "evidence": [
        "El presupuesto registra la aprobación o el rechazo del cliente.",
        "La orden aprobada figura disponible para reparación o la orden rechazada figura cerrada con el aparato disponible para retiro."
      ]
    }
  },
  "businessHash": "sha256:1aa4d61d7234c3de19562c798d6e86fa7727dd4251041967c3917c8706988d57"
} as const satisfies Ns5JourneyArtifact;

export type ResponderPresupuestoJourneyType = typeof responderPresupuestoJourney;

export default responderPresupuestoJourney;
