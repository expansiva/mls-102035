/// <mls fileReference="_102047_/l4/ordenServicio5/journeys/analizarYpresupuestarOrden.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const analizarYpresupuestarOrdenJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "analizarYpresupuestarOrden",
  "business": {
    "actorRef": "tecnico",
    "title": "Analizar un aparato y preparar el presupuesto",
    "goal": "Registrar el diagnóstico, las piezas necesarias con su costo interno y el presupuesto que verá el cliente.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenPendiente",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar la orden pendiente de análisis.",
        "description": "Localizar la orden recibida que requiere análisis técnico."
      },
      {
        "stepId": "inspeccionarAparatoYrecepcion",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Revisar el aparato y los datos de recepción.",
        "description": "Revisar el aparato, el defecto informado y las fotos asociados a la orden."
      },
      {
        "stepId": "registrarDiagnosticoYpresupuesto",
        "kind": "act",
        "entity": "OrdenServicio",
        "affects": [
          "Diagnostico",
          "PiezaNecesaria",
          "Presupuesto"
        ],
        "title": "Registrar el diagnóstico, las piezas necesarias y el presupuesto.",
        "description": "Registrar el diagnóstico, las piezas necesarias con costo interno y el valor del presupuesto para el cliente."
      },
      {
        "stepId": "registrarPresupuesto",
        "kind": "act",
        "entity": "Presupuesto",
        "title": "Registrar el presupuesto.",
        "description": "Registrar el presupuesto comunicado al cliente."
      }
    ],
    "outcome": {
      "statement": "La orden queda diagnosticada y el presupuesto queda disponible para la respuesta del cliente.",
      "evidence": [
        "La orden contiene un diagnóstico registrado.",
        "Las piezas necesarias incluyen su costo interno.",
        "La orden contiene un valor de presupuesto para el cliente."
      ]
    }
  },
  "businessHash": "sha256:bbaf50642752b85499c176ebfd1d78e97082f3aea0e59b98a5bc04f6ca9f6461"
} as const satisfies Ns5JourneyArtifact;

export type AnalizarYpresupuestarOrdenJourneyType = typeof analizarYpresupuestarOrdenJourney;

export default analizarYpresupuestarOrdenJourney;
