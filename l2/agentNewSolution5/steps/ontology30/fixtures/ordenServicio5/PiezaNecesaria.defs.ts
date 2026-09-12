/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/PiezaNecesaria.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityPiezaNecesaria = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio5",
  "entityId": "PiezaNecesaria",
  "title": "Pieza necesaria",
  "description": "Pieza o insumo identificado para la reparación, incluyendo su costo interno.",
  "kind": "supporting",
  "party": "none",
  "displayField": "nombrePieza",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único de la pieza necesaria."
    },
    {
      "fieldId": "nombrePieza",
      "title": "Nombre de la pieza",
      "type": "string",
      "required": true,
      "description": "Nombre de la pieza o insumo necesario para la reparación."
    },
    {
      "fieldId": "cantidad",
      "title": "Cantidad",
      "type": "integer",
      "required": true,
      "description": "Cantidad requerida de esta pieza o insumo."
    },
    {
      "fieldId": "costoInterno",
      "title": "Costo interno",
      "type": "money",
      "required": true,
      "description": "Costo interno de la pieza o insumo para el servicio técnico."
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

export type OrdenServicio5EntityPiezaNecesariaType = typeof ordenServicio5EntityPiezaNecesaria;

export default ordenServicio5EntityPiezaNecesaria;
