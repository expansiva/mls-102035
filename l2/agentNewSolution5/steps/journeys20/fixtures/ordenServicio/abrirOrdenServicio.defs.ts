/// <mls fileReference="_102047_/l4/ordenServicio/journeys/abrirOrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const abrirOrdenServicioJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirOrdenServicio",
  "business": {
    "actorRef": "recepcionista",
    "title": "Abrir orden de servicio",
    "goal": "Registrar la recepción del aparato y abrir su orden de servicio.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "identificarClienteYaparato",
        "kind": "locate",
        "entity": "Cliente",
        "title": "Identificar cliente y aparato",
        "description": "Identifica al cliente y su aparato; si no existen previamente, los datos aportados permiten crear o asociar sus registros maestros."
      },
      {
        "stepId": "registrarRecepcion",
        "kind": "act",
        "entity": "OrdenServicio",
        "affects": [
          "Cliente",
          "Aparato"
        ],
        "effect": "create",
        "title": "Registrar recepción",
        "description": "Abre la orden con el defecto informado, los datos de recepción y las fotografías del aparato."
      }
    ],
    "outcome": {
      "statement": "La orden queda abierta y el aparato queda registrado para su análisis técnico.",
      "evidence": [
        "Existe una orden de servicio asociada al cliente y al aparato.",
        "La orden conserva el defecto informado y las fotografías de recepción."
      ]
    }
  },
  "businessHash": "sha256:82405cf01c03119c7ef464c7b7c34bb46af25bd566b8e13bafb0ccb2a765488d"
} as const satisfies Ns5JourneyArtifact;

export type AbrirOrdenServicioJourneyType = typeof abrirOrdenServicioJourney;

export default abrirOrdenServicioJourney;
