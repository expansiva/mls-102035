/// <mls fileReference="_102047_/l4/ordenServicio/journeys/consultarMisOrdenes.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarMisOrdenesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarMisOrdenes",
  "business": {
    "actorRef": "cliente",
    "title": "Consultar mis órdenes de servicio",
    "goal": "Ver el seguimiento de las órdenes propias desde el portal.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarMisOrdenes",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar mis órdenes",
        "description": "Localiza únicamente las órdenes de servicio propias."
      },
      {
        "stepId": "consultarEstadoYpresupuesto",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Consultar estado y presupuesto",
        "description": "Consulta el estado, el diagnóstico y el valor del presupuesto de una orden propia, sin acceder al costo interno de las piezas ni a las anotaciones técnicas."
      }
    ],
    "outcome": {
      "statement": "El cliente conoce el estado y la información visible de sus propias órdenes.",
      "evidence": [
        "El portal muestra las órdenes asociadas al cliente autenticado.",
        "Cada orden consultada muestra su estado, diagnóstico y valor del presupuesto."
      ]
    }
  },
  "businessHash": "sha256:bd87b28d25b94db61e9e7fb91b919f885a4123f47dd772248414141744adc90b"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarMisOrdenesJourneyType = typeof consultarMisOrdenesJourney;

export default consultarMisOrdenesJourney;
