/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/EntregaAparato.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityEntregaAparato = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "ordenServicio5",
  "entityId": "EntregaAparato",
  "title": "Entrega de aparato",
  "description": "Constancia de la entrega del aparato al cliente al finalizar la gestión.",
  "kind": "event",
  "party": "none",
  "displayField": "fechaEntrega",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único de la constancia de entrega del aparato."
    },
    {
      "fieldId": "fechaEntrega",
      "title": "Fecha y hora de entrega",
      "type": "datetime",
      "required": true,
      "description": "Fecha y hora en que se entrega el aparato al cliente."
    }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicio5EntityEntregaAparatoType = typeof ordenServicio5EntityEntregaAparato;

export default ordenServicio5EntityEntregaAparato;
