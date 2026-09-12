/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/ItemCardapio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityItemCardapio = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante",
  "entityId": "ItemCardapio",
  "title": "Item do cardápio",
  "description": "Produto oferecido no cardápio do restaurante, com informações comerciais específicas do cardápio.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "Product",
  "displayField": "name",
  "fields": [
    {
      "fieldId": "preco",
      "title": "Preço",
      "type": "money",
      "required": true,
      "description": "Preço de venda atual do item no cardápio."
    }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "comandaRestaurante.ItemCardapio"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestauranteEntityItemCardapioType = typeof comandaRestauranteEntityItemCardapio;

export default comandaRestauranteEntityItemCardapio;
