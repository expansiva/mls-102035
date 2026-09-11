/// <mls fileReference="_102047_/l4/comandaRestaurante5/ontology/Pagamento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5EntityPagamento = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "comandaRestaurante5",
  "entityId": "Pagamento",
  "title": "Pagamento",
  "description": "Recebimento de um valor para quitar total ou parcialmente uma comanda.",
  "kind": "event",
  "party": "none",
  "displayField": "valor",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do pagamento."
    },
    {
      "fieldId": "valor",
      "title": "Valor",
      "type": "money",
      "required": true,
      "description": "Valor recebido neste pagamento."
    },
    {
      "fieldId": "comanda",
      "title": "Comanda",
      "type": "uuid",
      "required": true,
      "description": "Comanda à qual este pagamento é destinado."
    },
    {
      "fieldId": "recebidoEm",
      "title": "Recebido em",
      "type": "datetime",
      "required": true,
      "description": "Data e hora em que o pagamento foi recebido."
    }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestaurante5EntityPagamentoType = typeof comandaRestaurante5EntityPagamento;

export default comandaRestaurante5EntityPagamento;
