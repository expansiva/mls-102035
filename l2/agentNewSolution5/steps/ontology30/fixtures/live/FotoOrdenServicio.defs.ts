/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/FotoOrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityFotoOrdenServicio = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "ordenServicio5",
  "entityId": "FotoOrdenServicio",
  "title": "Foto de la orden de servicio",
  "description": "Documento fotográfico tomado o adjuntado durante la recepción del aparato.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "Document",
  "displayField": "fileName",
  "fields": [],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "ordenServicio5.FotoOrdenServicio"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicio5EntityFotoOrdenServicioType = typeof ordenServicio5EntityFotoOrdenServicio;

export default ordenServicio5EntityFotoOrdenServicio;
