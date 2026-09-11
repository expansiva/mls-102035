/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/Diagnostico.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityDiagnostico = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "ordenServicio5",
  "entityId": "Diagnostico",
  "title": "Diagnóstico",
  "description": "Resultado técnico del análisis del aparato y de la causa del defecto reportado.",
  "kind": "supporting",
  "party": "none",
  "displayField": "descripcion",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único del diagnóstico."
    },
    {
      "fieldId": "descripcion",
      "title": "Descripción del diagnóstico",
      "type": "text",
      "required": true,
      "description": "Descripción técnica del análisis realizado y de la causa del defecto informado."
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

export type OrdenServicio5EntityDiagnosticoType = typeof ordenServicio5EntityDiagnostico;

export default ordenServicio5EntityDiagnostico;
