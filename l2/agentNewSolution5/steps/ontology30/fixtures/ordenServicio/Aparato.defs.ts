/// <mls fileReference="_102047_/l4/ordenServicio/ontology/Aparato.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityAparato = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio",
  "entityId": "Aparato",
  "title": "Aparato",
  "description": "Aparato electrónico recibido para diagnóstico, presupuesto, reparación o retiro.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "AssetEquipment",
  "displayField": "name",
  "fields": [],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "ordenServicio.Aparato"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicioEntityAparatoType = typeof ordenServicioEntityAparato;

export default ordenServicioEntityAparato;
