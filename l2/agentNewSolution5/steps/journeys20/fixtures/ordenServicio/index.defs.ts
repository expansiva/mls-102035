/// <mls fileReference="_102047_/l4/ordenServicio/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "ordenServicio",
  "journeys": [
    {
      "journeyId": "abrirOrdenServicio",
      "actorRef": "recepcionista",
      "title": "Abrir orden de servicio"
    },
    {
      "journeyId": "prepararPresupuesto",
      "actorRef": "tecnico",
      "title": "Analizar aparato y preparar presupuesto"
    },
    {
      "journeyId": "aprobarPresupuesto",
      "actorRef": "cliente",
      "title": "Aprobar presupuesto"
    },
    {
      "journeyId": "rechazarPresupuesto",
      "actorRef": "cliente",
      "title": "Rechazar presupuesto"
    },
    {
      "journeyId": "realizarReparacion",
      "actorRef": "tecnico",
      "title": "Realizar reparación"
    },
    {
      "journeyId": "entregarAparatoReparado",
      "actorRef": "recepcionista",
      "title": "Entregar aparato reparado"
    },
    {
      "journeyId": "consultarMisOrdenes",
      "actorRef": "cliente",
      "title": "Consultar mis órdenes de servicio"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type OrdenServicioJourneyIndexType = typeof ordenServicioJourneyIndex;

export default ordenServicioJourneyIndex;
