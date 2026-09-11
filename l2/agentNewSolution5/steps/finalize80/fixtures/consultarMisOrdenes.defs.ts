/// <mls fileReference="_102047_/l4/ordenServicio5/journeys/consultarMisOrdenes.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarMisOrdenesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarMisOrdenes",
  "business": {
    "actorRef": "cliente",
    "title": "Consultar mis órdenes de servicio",
    "goal": "Conocer el estado, el diagnóstico y el valor del presupuesto de las propias órdenes.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarMisOrdenes",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar las órdenes propias.",
        "description": "Localizar las órdenes propias."
      },
      {
        "stepId": "consultarDetalleDeMiOrden",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Consultar el estado, el diagnóstico y el valor del presupuesto de una orden propia.",
        "description": "Consultar el estado, el diagnóstico y el valor del presupuesto de una orden propia."
      },
      {
        "stepId": "registrarConsultaDeOrden",
        "kind": "act",
        "entity": "OrdenServicio",
        "title": "Registrar la consulta de la orden.",
        "description": "Registrar la consulta de la orden."
      }
    ],
    "outcome": {
      "statement": "El cliente conoce la información permitida de sus propias órdenes sin acceder a costos internos ni anotaciones técnicas.",
      "evidence": [
        "El cliente visualiza el estado, diagnóstico y valor del presupuesto de su orden.",
        "La consulta no incluye el costo interno de piezas ni las anotaciones del técnico."
      ]
    }
  },
  "businessHash": "sha256:f06acac774dfba3dbbf368b5ebeb3fa48d9c0b147c13556839cd3aec7e3ca283"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarMisOrdenesJourneyType = typeof consultarMisOrdenesJourney;

export default consultarMisOrdenesJourney;
