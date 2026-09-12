/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/Reparacion.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityReparacion = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio5",
  "entityId": "Reparacion",
  "title": "Reparación",
  "description": "Registro de las tareas técnicas efectivamente realizadas sobre el aparato autorizado.",
  "kind": "event",
  "party": "none",
  "displayField": "detalleTrabajo",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único del registro de reparación."
    },
    {
      "fieldId": "detalleTrabajo",
      "title": "Detalle del trabajo realizado",
      "type": "text",
      "required": true,
      "description": "Describe las tareas técnicas efectuadas durante la reparación del aparato."
    }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly",
  "maintenance": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicio5EntityReparacionType = typeof ordenServicio5EntityReparacion;

export default ordenServicio5EntityReparacion;
