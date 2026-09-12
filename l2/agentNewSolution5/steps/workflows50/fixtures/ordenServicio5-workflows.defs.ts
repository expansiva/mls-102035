/// <mls fileReference="_102047_/l4/ordenServicio5/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5Workflows = {
  "schemaVersion": "2026-09-12-ns5-workflows-v2",
  "moduleName": "ordenServicio5",
  "processes": [
    {
      "processId": "gestionarOrdenServicio",
      "title": "Gestionar orden de servicio",
      "description": "Coordinar la recepción, el presupuesto, la respuesta del cliente, la reparación o el retiro y la finalización de una orden de servicio.",
      "trigger": {
        "kind": "manual",
        "actorRef": "recepcionista"
      },
      "tasks": [
        {
          "taskId": "registrarRecepcion",
          "kind": "human",
          "actorRef": "recepcionista",
          "journeyRef": "registrarRecepcionAparato",
          "next": [
            "analizarYpresupuestar"
          ],
          "description": "El recepcionista registra la recepción del aparato y deja la orden disponible para análisis técnico."
        },
        {
          "taskId": "analizarYpresupuestar",
          "kind": "human",
          "actorRef": "tecnico",
          "journeyRef": "analizarYpresupuestarOrden",
          "next": [
            "responderPresupuesto"
          ],
          "description": "El técnico registra el diagnóstico, las piezas y el presupuesto para que el cliente responda."
        },
        {
          "taskId": "responderPresupuesto",
          "kind": "human",
          "actorRef": "cliente",
          "journeyRef": "responderPresupuesto",
          "next": [
            "repararYmarcarLista",
            "entregarAparato"
          ],
          "description": "El cliente decide aprobar o rechazar el presupuesto de su orden."
        },
        {
          "taskId": "repararYmarcarLista",
          "kind": "human",
          "actorRef": "tecnico",
          "journeyRef": "repararYmarcarOrdenLista",
          "next": [
            "entregarAparato"
          ],
          "description": "El técnico repara el aparato y deja la orden lista para entrega."
        },
        {
          "taskId": "entregarAparato",
          "kind": "human",
          "actorRef": "recepcionista",
          "journeyRef": "entregarAparatoYfinalizarOrden",
          "next": [],
          "description": "El recepcionista registra la entrega del aparato y finaliza la orden."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "registrarRecepcionAparato",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "analizarYpresupuestarOrden",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "responderPresupuesto",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "repararYmarcarOrdenLista",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "entregarAparatoYfinalizarOrden",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type OrdenServicio5WorkflowsType = typeof ordenServicio5Workflows;

export default ordenServicio5Workflows;
