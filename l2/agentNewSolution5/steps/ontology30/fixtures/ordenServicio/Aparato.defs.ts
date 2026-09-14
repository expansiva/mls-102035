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
  "fieldsBase": [
    { "fieldId": "name", "title": "Nombre", "type": "string", "required": true, "description": "Nombre del aparato." },
    { "fieldId": "serialNumber", "title": "Número de serie", "type": "string", "required": false, "description": "Número de serie del aparato." },
    { "fieldId": "brand", "title": "Marca", "type": "string", "required": false, "description": "Marca del aparato." },
    { "fieldId": "model", "title": "Modelo", "type": "string", "required": false, "description": "Modelo del aparato." }
  ],
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
