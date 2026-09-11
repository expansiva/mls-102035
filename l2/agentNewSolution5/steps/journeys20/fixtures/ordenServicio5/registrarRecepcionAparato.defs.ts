/// <mls fileReference="_102047_/l4/ordenServicio5/journeys/registrarRecepcionAparato.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarRecepcionAparatoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarRecepcionAparato",
  "business": {
    "actorRef": "recepcionista",
    "title": "Registrar la recepción de un aparato",
    "goal": "Abrir una orden de servicio con la información aportada por el cliente y el aparato recibido.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "capturarDatosRecepcion",
        "kind": "act",
        "entity": "OrdenServicio",
        "affects": [
          "Cliente",
          "Aparato",
          "DefectoInformado",
          "FotoOrden"
        ],
        "title": "Registrar los datos del cliente, del aparato, el defecto informado y las fotos.",
        "description": "Registrar los datos del cliente, del aparato, el defecto informado y las fotos."
      }
    ],
    "outcome": {
      "statement": "La orden de servicio queda abierta con el aparato y la información de recepción registrados.",
      "evidence": [
        "Existe una orden de servicio con los datos del cliente, del aparato, el defecto informado y las fotos.",
        "La orden queda disponible para el análisis técnico."
      ]
    }
  },
  "businessHash": "sha256:66c30f0884980a5fb666929ddb57e61dacc0c97d690906794aabb1c009455fc9"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarRecepcionAparatoJourneyType = typeof registrarRecepcionAparatoJourney;

export default registrarRecepcionAparatoJourney;
