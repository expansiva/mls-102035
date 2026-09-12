/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/Comanda.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityComanda = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante",
  "entityId": "Comanda",
  "title": "Comanda",
  "description": "Registro de consumo aberto para uma mesa, encerrado após o pagamento.",
  "kind": "core",
  "party": "none",
  "displayField": "number",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único da comanda."
    },
    {
      "fieldId": "number",
      "title": "Número",
      "type": "string",
      "required": true,
      "unique": true,
      "description": "Número sequencial de identificação da comanda."
    },
    {
      "fieldId": "mesaId",
      "title": "Mesa",
      "type": "uuid",
      "required": true,
      "description": "Referência à mesa para a qual a comanda foi aberta."
    },
    {
      "fieldId": "garcomId",
      "title": "Garçom responsável",
      "type": "uuid",
      "required": true,
      "description": "Referência ao garçom que abriu a comanda."
    },
    {
      "fieldId": "discountAmount",
      "title": "Desconto",
      "type": "money",
      "required": false,
      "description": "Valor opcional de desconto aplicado no fechamento da comanda."
    },
    {
      "fieldId": "paymentMethod",
      "title": "Forma de pagamento",
      "type": "string",
      "required": false,
      "enum": [
        {
          "value": "cash",
          "title": "Dinheiro"
        },
        {
          "value": "creditCard",
          "title": "Cartão de crédito"
        },
        {
          "value": "debitCard",
          "title": "Cartão de débito"
        },
        {
          "value": "pix",
          "title": "Pix"
        }
      ],
      "description": "Forma de pagamento registrada ao fechar a comanda."
    },
    {
      "fieldId": "status",
      "title": "Situação",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "open",
          "title": "Aberta"
        },
        {
          "value": "closed",
          "title": "Fechada"
        }
      ],
      "description": "Situação atual da comanda."
    }
  ],
  "details": {
    "subtotalAmount": {
      "type": "money",
      "description": "Soma dos itens ativos lançados na comanda antes do desconto."
    },
    "totalAmount": {
      "type": "money",
      "description": "Valor total a pagar, calculado pelos itens ativos menos o desconto aplicado."
    }
  },
  "lifecycleStates": [
    {
      "state": "open",
      "reachedBy": "actor"
    },
    {
      "state": "closed",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "fecharComanda",
      "from": [
        "open"
      ],
      "to": "closed",
      "by": [
        "caixa"
      ],
      "description": "Fecha a comanda após registrar o desconto opcional e a forma de pagamento."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestauranteEntityComandaType = typeof comandaRestauranteEntityComanda;

export default comandaRestauranteEntityComanda;
