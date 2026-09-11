/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/DefectoInformado.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityDefectoInformado = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "ordenServicio5",
  "entityId": "DefectoInformado",
  "title": "Defecto informado",
  "description": "Manifestación o problema del aparato informado por el cliente al momento de la recepción.",
  "kind": "supporting",
  "party": "none",
  "displayField": "descripcion",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único del defecto informado."
    },
    {
      "fieldId": "descripcion",
      "title": "Descripción",
      "type": "text",
      "required": true,
      "description": "Descripción del problema o manifestación del aparato informada por el cliente."
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

export type OrdenServicio5EntityDefectoInformadoType = typeof ordenServicio5EntityDefectoInformado;

export default ordenServicio5EntityDefectoInformado;
