/// <mls fileReference="_102047_/l4/comandaRestaurante5/ontology/Mesa.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5EntityMesa = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante5",
  "entityId": "Mesa",
  "title": "Mesa",
  "description": "Mesa do restaurante onde uma comanda é aberta e atendida.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "Location",
  "displayField": "name",
  "fields": [],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "comandaRestaurante5.Mesa"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestaurante5EntityMesaType = typeof comandaRestaurante5EntityMesa;

export default comandaRestaurante5EntityMesa;
