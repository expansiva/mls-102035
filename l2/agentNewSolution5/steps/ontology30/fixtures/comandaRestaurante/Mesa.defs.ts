/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/Mesa.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityMesa = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante",
  "entityId": "Mesa",
  "title": "Mesa",
  "description": "Mesa física do restaurante disponível para receber comandas.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "AssetEquipment",
  "displayField": "name",
  "fields": [],
  "details": {
    "estaDisponivel": {
      "type": "boolean",
      "description": "Indica se a mesa está disponível para receber uma nova comanda, calculado a partir das comandas abertas."
    }
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "comandaRestaurante.Mesa"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestauranteEntityMesaType = typeof comandaRestauranteEntityMesa;

export default comandaRestauranteEntityMesa;
