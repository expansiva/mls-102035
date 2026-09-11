/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/Presupuesto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityPresupuesto = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "ordenServicio5",
  "entityId": "Presupuesto",
  "title": "Presupuesto",
  "description": "Propuesta económica comunicada al cliente para autorizar o rechazar la reparación.",
  "kind": "core",
  "party": "none",
  "displayField": "valorCliente",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único del presupuesto."
    },
    {
      "fieldId": "valorCliente",
      "title": "Valor del presupuesto",
      "type": "money",
      "required": true,
      "description": "Importe propuesto al cliente por la reparación."
    },
    {
      "fieldId": "piezasNecesarias",
      "title": "Piezas necesarias",
      "type": "json",
      "required": false,
      "description": "Referencias a las piezas necesarias incluidas en el presupuesto."
    },
    {
      "fieldId": "status",
      "title": "Estado",
      "type": "string",
      "required": true,
      "enum": [
        "pendingResponse",
        "approved",
        "rejected"
      ],
      "description": "Estado de la respuesta del cliente al presupuesto."
    }
  ],
  "lifecycleStates": [
    {
      "state": "pendingResponse",
      "reachedBy": "actor"
    },
    {
      "state": "approved",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "aprobarPresupuesto",
      "from": [
        "pendingResponse"
      ],
      "to": "approved",
      "by": [
        "cliente"
      ],
      "description": "El cliente aprueba el presupuesto desde el portal y autoriza la reparación."
    },
    {
      "transitionId": "rechazarPresupuesto",
      "from": [
        "pendingResponse"
      ],
      "to": "rejected",
      "by": [
        "cliente"
      ],
      "description": "El cliente rechaza el presupuesto desde el portal; la orden queda cerrada como rechazada y el aparato disponible para retiro."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicio5EntityPresupuestoType = typeof ordenServicio5EntityPresupuesto;

export default ordenServicio5EntityPresupuesto;
