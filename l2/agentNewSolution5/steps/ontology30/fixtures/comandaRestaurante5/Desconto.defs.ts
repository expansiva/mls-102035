/// <mls fileReference="_102047_/l4/comandaRestaurante5/ontology/Desconto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5EntityDesconto = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante5",
  "entityId": "Desconto",
  "title": "Desconto",
  "description": "Concessão pontual de desconto aplicada a uma comanda durante a conferência.",
  "kind": "event",
  "party": "none",
  "displayField": "motivo",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do desconto concedido."
    },
    {
      "fieldId": "comandaId",
      "title": "Comanda",
      "type": "uuid",
      "required": true,
      "description": "Comanda à qual o desconto é aplicado, selecionada durante a conferência."
    },
    {
      "fieldId": "motivo",
      "title": "Motivo",
      "type": "text",
      "required": true,
      "description": "Justificativa para a concessão pontual do desconto."
    },
    {
      "fieldId": "valor",
      "title": "Valor do desconto",
      "type": "money",
      "required": true,
      "description": "Valor monetário abatido do total da comanda."
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

export type ComandaRestaurante5EntityDescontoType = typeof comandaRestaurante5EntityDesconto;

export default comandaRestaurante5EntityDesconto;
