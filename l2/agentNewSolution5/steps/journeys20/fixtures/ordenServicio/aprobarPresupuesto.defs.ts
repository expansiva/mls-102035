/// <mls fileReference="_102047_/l4/ordenServicio/journeys/aprobarPresupuesto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const aprobarPresupuestoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "aprobarPresupuesto",
  "business": {
    "actorRef": "cliente",
    "title": "Aprobar presupuesto",
    "goal": "Autorizar la reparación del aparato desde el portal.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "localizarOrdenNotificada",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar orden notificada",
        "description": "Localiza la orden asociada al presupuesto recibido en la notificación."
      },
      {
        "stepId": "abrirPresupuestoRecibido",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Consultar presupuesto recibido",
        "description": "Consulta el estado de la orden, el diagnóstico y el valor del presupuesto recibido."
      },
      {
        "stepId": "decidirAprobacion",
        "kind": "decide",
        "entity": "OrdenServicio",
        "title": "Decidir aprobación",
        "description": "Elige aprobar el presupuesto en lugar de rechazarlo."
      },
      {
        "stepId": "confirmarAprobacion",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "aprobarPresupuesto",
        "title": "Confirmar aprobación",
        "description": "Registra la aprobación del presupuesto y autoriza la reparación."
      }
    ],
    "outcome": {
      "statement": "La orden queda autorizada para reparación.",
      "evidence": [
        "La respuesta del cliente registra la aprobación del presupuesto.",
        "La orden queda disponible para que el técnico realice la reparación."
      ]
    }
  },
  "businessHash": "sha256:39fc6780e33be8217552b0308e8b4a87eb3694073927ff0d682b40929cd1ded1"
} as const satisfies Ns5JourneyArtifact;

export type AprobarPresupuestoJourneyType = typeof aprobarPresupuestoJourney;

export default aprobarPresupuestoJourney;
