/// <mls fileReference="_102047_/l4/ordenServicio5/journeys/repararYmarcarOrdenLista.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const repararYmarcarOrdenListaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "repararYmarcarOrdenLista",
  "business": {
    "actorRef": "tecnico",
    "title": "Reparar un aparato y marcar la orden como lista",
    "goal": "Realizar la reparación autorizada, documentar el trabajo realizado y dejar la orden lista para entrega.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenAprobada",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar la orden aprobada para reparación.",
        "description": "Localizar la orden cuyo presupuesto fue aprobado por el cliente."
      },
      {
        "stepId": "revisarDiagnosticoYpiezas",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Revisar el diagnóstico y las piezas necesarias.",
        "description": "Consultar el diagnóstico y las piezas registradas antes de realizar la reparación."
      },
      {
        "stepId": "registrarReparacionRealizada",
        "kind": "act",
        "entity": "OrdenServicio",
        "affects": [
          "Reparacion"
        ],
        "effect": "update",
        "title": "Registrar la reparación realizada.",
        "description": "Registrar las tareas efectuadas durante la reparación del aparato."
      },
      {
        "stepId": "marcarOrdenLista",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "update",
        "title": "Marcar la orden como lista para entrega.",
        "description": "Actualizar la orden para indicar que el aparato está listo para ser entregado."
      },
      {
        "stepId": "derivarParaEntrega",
        "kind": "handoff",
        "entity": "OrdenServicio",
        "title": "Derivar la orden lista para entrega.",
        "description": "Poner la orden reparada a disposición del recepcionista para entregar el aparato.",
        "handoffTo": "recepcionista"
      }
    ],
    "outcome": {
      "statement": "La reparación queda registrada y la orden queda lista para entrega.",
      "evidence": [
        "La orden contiene el registro de la reparación realizada.",
        "La orden muestra estado lista para entrega."
      ]
    }
  },
  "businessHash": "sha256:9bad719a8e75390134eafef6e5f2d804bdcdabcbf412b8acf66557181ac4d542"
} as const satisfies Ns5JourneyArtifact;

export type RepararYmarcarOrdenListaJourneyType = typeof repararYmarcarOrdenListaJourney;

export default repararYmarcarOrdenListaJourney;
