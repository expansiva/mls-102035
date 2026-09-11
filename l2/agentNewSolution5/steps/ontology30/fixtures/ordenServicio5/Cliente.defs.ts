/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/Cliente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityCliente = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "ordenServicio5",
  "entityId": "Cliente",
  "title": "Cliente",
  "description": "Persona que presenta el aparato, consulta su orden en el portal y responde al presupuesto.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "ordenServicio5.Cliente"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicio5EntityClienteType = typeof ordenServicio5EntityCliente;

export default ordenServicio5EntityCliente;
