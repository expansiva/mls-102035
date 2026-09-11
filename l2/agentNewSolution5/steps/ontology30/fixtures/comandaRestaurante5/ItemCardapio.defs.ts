/// <mls fileReference="_102047_/l4/comandaRestaurante5/ontology/ItemCardapio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5EntityItemCardapio = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "comandaRestaurante5",
  "entityId": "ItemCardapio",
  "title": "Item do cardápio",
  "description": "Produto oferecido no cardápio do restaurante que pode ser lançado em uma comanda.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "Product",
  "displayField": "name",
  "fields": [
    {
      "fieldId": "price",
      "title": "Preço",
      "type": "money",
      "required": true,
      "description": "Preço de venda do item no cardápio."
    }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "comandaRestaurante5.ItemCardapio"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestaurante5EntityItemCardapioType = typeof comandaRestaurante5EntityItemCardapio;

export default comandaRestaurante5EntityItemCardapio;
