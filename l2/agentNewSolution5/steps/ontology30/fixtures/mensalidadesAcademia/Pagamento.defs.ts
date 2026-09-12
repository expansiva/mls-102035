/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Pagamento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityPagamento = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Pagamento",
  "title": "Pagamento",
  "description": "Registro do pagamento realizado para uma mensalidade.",
  "kind": "event",
  "party": "none",
  "displayField": "dataPagamento",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do registro de pagamento."
    },
    {
      "fieldId": "mensalidadeId",
      "title": "Mensalidade",
      "type": "uuid",
      "required": true,
      "description": "Referência à mensalidade para a qual o pagamento foi registrado."
    },
    {
      "fieldId": "dataPagamento",
      "title": "Data do pagamento",
      "type": "date",
      "required": true,
      "description": "Data em que o pagamento foi realizado."
    },
    {
      "fieldId": "valor",
      "title": "Valor pago",
      "type": "money",
      "required": true,
      "description": "Valor efetivamente pago para a mensalidade."
    },
    {
      "fieldId": "formaPagamento",
      "title": "Forma de pagamento",
      "type": "string",
      "required": true,
      "constraints": {
        "maxLength": 100
      },
      "description": "Forma utilizada para realizar o pagamento."
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

export type MensalidadesAcademiaEntityPagamentoType = typeof mensalidadesAcademiaEntityPagamento;

export default mensalidadesAcademiaEntityPagamento;
