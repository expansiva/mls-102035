/// <mls fileReference="_102047_/l4/ordenServicio/journeys/realizarReparacion.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const realizarReparacionJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "realizarReparacion",
  "business": {
    "actorRef": "tecnico",
    "title": "Realizar reparación",
    "goal": "Reparar un aparato con presupuesto aprobado y dejarlo listo para entrega.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenAprobada",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar orden aprobada",
        "description": "Localiza una orden cuyo presupuesto fue aprobado."
      },
      {
        "stepId": "registrarReparacionRealizada",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "update",
        "title": "Registrar reparación realizada",
        "description": "Registra las acciones técnicas realizadas durante la reparación."
      },
      {
        "stepId": "marcarAparatoListo",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "marcarLista",
        "title": "Marcar aparato listo",
        "description": "Marca la orden como lista para entregar el aparato al cliente."
      }
    ],
    "outcome": {
      "statement": "El aparato reparado queda listo para entrega.",
      "evidence": [
        "La orden conserva el registro de la reparación realizada.",
        "El estado de la orden indica que está lista para entrega."
      ]
    }
  },
  "businessHash": "sha256:0b119e26774c79cfd598de5da6947ad7f82cbbeb07ca48d3243e8ffd668309aa"
} as const satisfies Ns5JourneyArtifact;

export type RealizarReparacionJourneyType = typeof realizarReparacionJourney;

export default realizarReparacionJourney;
