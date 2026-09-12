/// <mls fileReference="_102047_/l4/comandaRestaurante5/ontology/ItemComanda.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5EntityItemComanda = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante5",
  "entityId": "ItemComanda",
  "title": "Item da comanda",
  "description": "Lançamento de um item pedido na comanda, incluindo a possibilidade de cancelamento.",
  "kind": "core",
  "party": "none",
  "displayField": "descricao",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do item da comanda."
    },
    {
      "fieldId": "descricao",
      "title": "Descrição",
      "type": "string",
      "required": true,
      "description": "Descrição do item pedido, registrada conforme o cardápio no momento do lançamento."
    },
    {
      "fieldId": "comanda",
      "title": "Comanda",
      "type": "uuid",
      "required": true,
      "description": "Comanda aberta à qual este lançamento pertence."
    },
    {
      "fieldId": "itemCardapio",
      "title": "Item do cardápio",
      "type": "uuid",
      "required": true,
      "description": "Item do cardápio selecionado para o lançamento."
    },
    {
      "fieldId": "quantidade",
      "title": "Quantidade",
      "type": "integer",
      "required": true,
      "description": "Quantidade solicitada do item do cardápio."
    },
    {
      "fieldId": "precoUnitario",
      "title": "Preço unitário",
      "type": "money",
      "required": true,
      "description": "Preço unitário do item no momento em que foi lançado."
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
      "description": "Situação do lançamento na comanda."
    }
  ],
  "details": {
    "valorTotal": {
      "type": "money",
      "description": "Valor total do lançamento, calculado pela quantidade multiplicada pelo preço unitário e desconsiderado quando cancelado."
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
      "transitionId": "cancelarItem",
      "from": [
        "lancado"
      ],
      "to": "cancelado",
      "by": [
        "garcom"
      ],
      "description": "O garçom cancela um item lançado por engano enquanto a comanda está aberta."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestaurante5EntityItemComandaType = typeof comandaRestaurante5EntityItemComanda;

export default comandaRestaurante5EntityItemComanda;
