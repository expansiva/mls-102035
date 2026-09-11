/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/OrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityOrdenServicio = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "ordenServicio5",
  "entityId": "OrdenServicio",
  "title": "Orden de servicio",
  "description": "Registro central de la recepción, análisis, presupuesto, reparación y entrega de un aparato.",
  "kind": "core",
  "party": "none",
  "displayField": "orderNumber",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único de la orden de servicio."
    },
    {
      "fieldId": "orderNumber",
      "title": "Número de orden",
      "type": "string",
      "required": true,
      "description": "Número visible que identifica la orden de servicio."
    },
    {
      "fieldId": "cliente",
      "title": "Cliente",
      "type": "uuid",
      "required": true,
      "description": "Cliente al que corresponde la orden de servicio."
    },
    {
      "fieldId": "aparato",
      "title": "Aparato",
      "type": "uuid",
      "required": true,
      "description": "Aparato recibido para su análisis, reparación y entrega."
    },
    {
      "fieldId": "reportedDefect",
      "title": "Defecto informado",
      "type": "text",
      "required": true,
      "description": "Descripción del defecto reportado por el cliente al recibir el aparato."
    },
    {
      "fieldId": "receivedAt",
      "title": "Fecha y hora de recepción",
      "type": "datetime",
      "required": true,
      "description": "Fecha y hora en que se recibió el aparato."
    },
    {
      "fieldId": "diagnostico",
      "title": "Diagnóstico",
      "type": "uuid",
      "required": false,
      "description": "Diagnóstico registrado para la orden."
    },
    {
      "fieldId": "presupuesto",
      "title": "Presupuesto",
      "type": "uuid",
      "required": false,
      "description": "Presupuesto preparado para la orden."
    },
    {
      "fieldId": "reparacion",
      "title": "Reparación",
      "type": "uuid",
      "required": false,
      "description": "Reparación realizada sobre el aparato tras la aprobación del presupuesto."
    },
    {
      "fieldId": "entregaAparato",
      "title": "Entrega del aparato",
      "type": "uuid",
      "required": false,
      "description": "Registro de entrega del aparato al cliente."
    },
    {
      "fieldId": "status",
      "title": "Estado",
      "type": "string",
      "required": true,
      "enum": [
        "pendingAnalysis",
        "pendingCustomerApproval",
        "approved",
        "rejected",
        "readyForDelivery",
        "finalized"
      ],
      "description": "Estado actual de la orden de servicio."
    }
  ],
  "lifecycleStates": [
    {
      "state": "pendingAnalysis",
      "reachedBy": "actor"
    },
    {
      "state": "pendingCustomerApproval",
      "reachedBy": "actor"
    },
    {
      "state": "approved",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    },
    {
      "state": "readyForDelivery",
      "reachedBy": "actor"
    },
    {
      "state": "finalized",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "submitQuote",
      "from": [
        "pendingAnalysis"
      ],
      "to": "pendingCustomerApproval",
      "by": [
        "tecnico"
      ],
      "description": "El técnico registra el diagnóstico y el presupuesto, y lo deja disponible para la respuesta del cliente."
    },
    {
      "transitionId": "approveQuote",
      "from": [
        "pendingCustomerApproval"
      ],
      "to": "approved",
      "by": [
        "cliente"
      ],
      "description": "El cliente aprueba el presupuesto desde el portal."
    },
    {
      "transitionId": "rejectQuote",
      "from": [
        "pendingCustomerApproval"
      ],
      "to": "rejected",
      "by": [
        "cliente"
      ],
      "description": "El cliente rechaza el presupuesto y el aparato queda disponible para retiro."
    },
    {
      "transitionId": "completeRepair",
      "from": [
        "approved"
      ],
      "to": "readyForDelivery",
      "by": [
        "tecnico"
      ],
      "description": "El técnico registra la reparación terminada y deja el aparato listo para entrega."
    },
    {
      "transitionId": "deliverRejectedDevice",
      "from": [
        "rejected"
      ],
      "to": "finalized",
      "by": [
        "recepcionista"
      ],
      "description": "El recepcionista entrega al cliente el aparato cuyo presupuesto fue rechazado y finaliza la orden."
    },
    {
      "transitionId": "deliverRepairedDevice",
      "from": [
        "readyForDelivery"
      ],
      "to": "finalized",
      "by": [
        "recepcionista"
      ],
      "description": "El recepcionista entrega al cliente el aparato reparado y finaliza la orden."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicio5EntityOrdenServicioType = typeof ordenServicio5EntityOrdenServicio;

export default ordenServicio5EntityOrdenServicio;
