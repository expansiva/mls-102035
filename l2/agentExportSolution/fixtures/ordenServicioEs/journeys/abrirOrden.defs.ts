/// <mls fileReference="_102035_/l4/ordenServicioEs/journeys/abrirOrden.defs.ts" enhancement="_blank"/>

import type { Ns4JourneyArtifact } from '/_102035_/l2/agentNewSolution/types.js';

export const abrirOrdenJourney = {
  "schemaVersion": "2026-08-14-ns4-journey-v5",
  "journeyId": "abrirOrden",
  "revision": 1,
  "business": {
    "actorRef": "recepcionista",
    "title": "Abrir orden de servicio",
    "goal": "Registrar la recepción del aparato y dejar la orden disponible.",
    "entry": { "mode": "coldStart" },
    "steps": [
      {
        "stepId": "registrarOrden",
        "kind": "act",
        "entity": "OrdenServicio",
        "title": "Registrar orden",
        "description": "Captura cliente, aparato, defecto informado y fotos.",
        "featureRefs": ["abrirOrden"]
      }
    ],
    "outcome": {
      "statement": "Existe una orden con cliente, aparato y defecto.",
      "evidence": ["La orden queda abierta para diagnóstico."]
    },
    "useRules": ["clienteSoloConsultaSusOrdenes"]
  },
  "policyDecisions": [],
  "businessHash": "sha256:00",
  "resolution": { "status": "pending", "contexts": {} },
  "realization": {
    "status": "pending",
    "compiledFromBusinessHash": "sha256:00",
    "steps": [],
    "transitionRefs": []
  }
} as const satisfies Ns4JourneyArtifact;

export type AbrirOrdenJourneyType = typeof abrirOrdenJourney;

export default abrirOrdenJourney;
