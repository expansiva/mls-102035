/// <mls fileReference="_102047_/l4/ordenServicio/journeys/prepararPresupuesto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const prepararPresupuestoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "prepararPresupuesto",
  "business": {
    "actorRef": "tecnico",
    "title": "Analizar aparato y preparar presupuesto",
    "goal": "Diagnosticar el aparato y poner un presupuesto a disposición del cliente.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenAbierta",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar orden abierta",
        "description": "Localiza la orden abierta del aparato recibido."
      },
      {
        "stepId": "inspeccionarOrdenYaparato",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Inspeccionar orden y aparato",
        "description": "Revisa los datos de recepción, el defecto informado, las fotografías y el aparato para realizar el análisis."
      },
      {
        "stepId": "registrarDiagnosticoYpiezas",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "update",
        "title": "Registrar diagnóstico y piezas",
        "description": "Registra el diagnóstico, las piezas necesarias con su costo interno y el valor del presupuesto para el cliente."
      },
      {
        "stepId": "enviarPresupuestoAlCliente",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "enviarPresupuesto",
        "title": "Enviar presupuesto al cliente",
        "description": "Deja el presupuesto disponible para que el cliente lo responda desde el portal."
      }
    ],
    "outcome": {
      "statement": "El cliente tiene un presupuesto disponible para aprobar o rechazar.",
      "evidence": [
        "La orden muestra el diagnóstico y el valor presupuestado para el cliente.",
        "La orden está pendiente de respuesta del presupuesto."
      ]
    }
  },
  "businessHash": "sha256:497523fa22dfba656a9d7e89c00f2dfef3230eae26a0c5ecb02b8d4333d0dd75"
} as const satisfies Ns5JourneyArtifact;

export type PrepararPresupuestoJourneyType = typeof prepararPresupuestoJourney;

export default prepararPresupuestoJourney;
