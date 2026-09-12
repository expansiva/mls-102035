/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/Garcom.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityGarcom = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante",
  "entityId": "Garcom",
  "title": "Garçom",
  "description": "Profissional do restaurante que abre comandas e registra lançamentos de itens.",
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
    "mdmType": "comandaRestaurante.Garcom"
  },
  "writer": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestauranteEntityGarcomType = typeof comandaRestauranteEntityGarcom;

export default comandaRestauranteEntityGarcom;
