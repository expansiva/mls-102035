/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/Aparato.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityAparato = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio5",
  "entityId": "Aparato",
  "title": "Aparato",
  "description": "Equipo electrónico recibido para análisis, reparación y posterior entrega o retiro.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "AssetEquipment",
  "displayField": "serialNumber",
  "fields": [],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "ordenServicio5.Aparato"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicio5EntityAparatoType = typeof ordenServicio5EntityAparato;

export default ordenServicio5EntityAparato;
