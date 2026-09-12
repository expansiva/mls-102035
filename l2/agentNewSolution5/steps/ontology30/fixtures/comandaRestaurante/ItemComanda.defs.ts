/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/ItemComanda.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityItemComanda = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante",
  "entityId": "ItemComanda",
  "title": "Item da comanda",
  "description": "Lançamento de um item do cardápio em uma comanda, com quantidade e observação.",
  "kind": "supporting",
  "party": "none",
  "displayField": "description",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do lançamento de item na comanda."
    },
    {
      "fieldId": "comandaId",
      "title": "Comanda",
      "type": "uuid",
      "required": true,
      "description": "Referência à comanda à qual o lançamento pertence."
    },
    {
      "fieldId": "itemCardapioId",
      "title": "Item do cardápio",
      "type": "uuid",
      "required": true,
      "description": "Referência ao item do cardápio lançado na comanda."
    },
    {
      "fieldId": "description",
      "title": "Descrição",
      "type": "string",
      "required": true,
      "description": "Descrição do item do cardápio registrada no lançamento para identificação na comanda."
    },
    {
      "fieldId": "quantity",
      "title": "Quantidade",
      "type": "integer",
      "required": true,
      "constraints": {
        "min": 1
      },
      "description": "Quantidade solicitada do item do cardápio."
    },
    {
      "fieldId": "unitPrice",
      "title": "Preço unitário",
      "type": "money",
      "required": true,
      "description": "Preço unitário do item no momento em que foi lançado na comanda."
    },
    {
      "fieldId": "observation",
      "title": "Observação",
      "type": "text",
      "required": false,
      "description": "Orientação ou observação informada para o preparo do item."
    },
    {
      "fieldId": "status",
      "title": "Situação",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "lancado",
          "title": "Lançado"
        },
        {
          "value": "cancelado",
          "title": "Cancelado"
        }
      ],
      "description": "Situação atual do lançamento na comanda."
    }
  ],
  "details": {
    "subtotal": {
      "type": "money",
      "description": "Valor do lançamento calculado pela quantidade multiplicada pelo preço unitário, desconsiderado quando cancelado."
    }
  },
  "lifecycleStates": [
    {
      "state": "lancado",
      "reachedBy": "actor"
    },
    {
      "state": "cancelado",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "cancelarItemComanda",
      "from": [
        "lancado"
      ],
      "to": "cancelado",
      "by": [
        "garcom"
      ],
      "description": "Cancela um item lançado por engano enquanto a comanda permanece aberta."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestauranteEntityItemComandaType = typeof comandaRestauranteEntityItemComanda;

export default comandaRestauranteEntityItemComanda;
