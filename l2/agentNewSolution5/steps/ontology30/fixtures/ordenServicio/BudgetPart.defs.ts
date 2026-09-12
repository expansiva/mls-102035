/// <mls fileReference="_102047_/l4/ordenServicio/ontology/BudgetPart.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityBudgetPart = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio",
  "entityId": "BudgetPart",
  "title": "Pieza presupuestada",
  "description": "Pieza necesaria identificada durante el diagnóstico de una orden, incluyendo su costo interno para el servicio técnico.",
  "kind": "supporting",
  "party": "none",
  "displayField": "descripcion",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único de la pieza presupuestada."
    },
    {
      "fieldId": "ordenServicioId",
      "title": "Orden de servicio",
      "type": "uuid",
      "required": true,
      "description": "Referencia a la orden de servicio a la que pertenece esta pieza presupuestada."
    },
    {
      "fieldId": "descripcion",
      "title": "Descripción",
      "type": "string",
      "required": true,
      "constraints": {
        "maxLength": 500
      },
      "description": "Descripción de la pieza necesaria para la reparación."
    },
    {
      "fieldId": "cantidad",
      "title": "Cantidad",
      "type": "integer",
      "required": true,
      "constraints": {
        "min": 1
      },
      "description": "Cantidad de unidades de la pieza necesarias para la reparación."
    },
    {
      "fieldId": "costoInterno",
      "title": "Costo interno",
      "type": "money",
      "required": true,
      "constraints": {
        "min": 0,
        "precision": 2
      },
      "description": "Costo interno estimado de las piezas para el servicio técnico."
    }
  ],
  "details": {
    "costoInternoTotal": {
      "type": "money",
      "description": "Costo interno total calculado al multiplicar la cantidad por el costo interno de la pieza."
    }
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicioEntityBudgetPartType = typeof ordenServicioEntityBudgetPart;

export default ordenServicioEntityBudgetPart;
