/// <mls fileReference="_102047_/l4/ordenServicio5/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5JourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "ordenServicio5",
  "journeys": [
    {
      "journeyId": "registrarRecepcionAparato",
      "actorRef": "recepcionista",
      "title": "Registrar la recepción de un aparato"
    },
    {
      "journeyId": "analizarYpresupuestarOrden",
      "actorRef": "tecnico",
      "title": "Analizar un aparato y preparar el presupuesto"
    },
    {
      "journeyId": "responderPresupuesto",
      "actorRef": "cliente",
      "title": "Responder un presupuesto"
    },
    {
      "journeyId": "repararYmarcarOrdenLista",
      "actorRef": "tecnico",
      "title": "Reparar un aparato y marcar la orden como lista"
    },
    {
      "journeyId": "entregarAparatoYfinalizarOrden",
      "actorRef": "recepcionista",
      "title": "Entregar un aparato y finalizar la orden"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type OrdenServicio5JourneyIndexType = typeof ordenServicio5JourneyIndex;

export default ordenServicio5JourneyIndex;
