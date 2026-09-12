/// <mls fileReference="_102047_/l4/ordenServicio/journeys/rechazarPresupuesto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const rechazarPresupuestoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "rechazarPresupuesto",
  "business": {
    "actorRef": "cliente",
    "title": "Rechazar presupuesto",
    "goal": "Rechazar el presupuesto y dejar el aparato disponible para retiro.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "abrirPresupuestoParaRechazo",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Consultar presupuesto para rechazo",
        "description": "Consulta el estado de la orden, el diagnóstico y el valor del presupuesto recibido."
      },
      {
        "stepId": "decidirRechazo",
        "kind": "decide",
        "entity": "OrdenServicio",
        "title": "Decidir rechazo",
        "description": "Elige rechazar el presupuesto en lugar de aprobarlo."
      },
      {
        "stepId": "confirmarRechazo",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "rechazarPresupuesto",
        "title": "Confirmar rechazo",
        "description": "Registra el rechazo y cierra la orden, dejando el aparato disponible para retiro."
      }
    ],
    "outcome": {
      "statement": "La orden queda cerrada como rechazada y el aparato queda disponible para retiro.",
      "evidence": [
        "La orden registra el rechazo del presupuesto.",
        "El estado de la orden indica que fue rechazada y que el aparato está disponible para retiro."
      ]
    }
  },
  "businessHash": "sha256:fecfc22126ba9f32271d6e21ea2cfaa838354ae1ee600d55768f85fc312d1e89"
} as const satisfies Ns5JourneyArtifact;

export type RechazarPresupuestoJourneyType = typeof rechazarPresupuestoJourney;

export default rechazarPresupuestoJourney;
