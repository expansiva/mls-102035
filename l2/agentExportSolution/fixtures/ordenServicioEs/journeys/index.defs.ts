/// <mls fileReference="_102035_/l4/ordenServicioEs/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns4JourneyIndex } from '/_102035_/l2/agentNewSolution/types.js';

export const ordenServicioEsJourneyIndex = {
  "schemaVersion": "2026-08-15-ns4-journey-index-v7",
  "moduleName": "ordenServicioEs",
  "approvedAt": "2026-09-09T00:00:00.000Z",
  "approvedBy": "auto",
  "journeys": [
    {
      "journeyId": "abrirOrden",
      "actorRef": "recepcionista",
      "title": "Abrir orden de servicio",
      "goal": "Registrar la recepción del aparato y dejar la orden disponible.",
      "entryMode": "coldStart",
      "businessHash": "sha256:00",
      "artifactPath": "l4/ordenServicioEs/journeys/abrirOrden.defs.ts"
    }
  ],
  "features": [
    { "featureId": "abrirOrden", "title": "Abrir orden", "priority": "now", "journeyStepRefs": ["abrirOrden.registrarOrden"] }
  ],
  "systemDecisions": [
    {
      "decisionId": "keepReceptionPhotos",
      "stage": "e2",
      "question": "¿Las fotos de recepción son obligatorias?",
      "chosen": "Sí, al menos una foto del aparato.",
      "alternatives": ["Sí, al menos una foto del aparato.", "Opcional"],
      "decidedBy": "system",
      "findingRef": "photos",
      "changeHint": "Pida no exigir fotos si el taller no las usa."
    }
  ]
} as const satisfies Ns4JourneyIndex;

export type OrdenServicioEsJourneyIndexType = typeof ordenServicioEsJourneyIndex;

export default ordenServicioEsJourneyIndex;
