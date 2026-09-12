/// <mls fileReference="_102047_/l4/compras/ontology/RecebimentoCompra.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comprasEntityRecebimentoCompra = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "entityId": "RecebimentoCompra",
  "title": "Recebimento de compra",
  "description": "Registro do recebimento total ou parcial de um pedido de compra.",
  "kind": "event",
  "party": "none",
  "displayField": "numeroRecebimento",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do recebimento de compra."
    },
    {
      "fieldId": "numeroRecebimento",
      "title": "Número do recebimento",
      "type": "string",
      "required": true,
      "unique": true,
      "description": "Número sequencial que identifica o recebimento de compra."
    },
    {
      "fieldId": "pedidoCompraId",
      "title": "Pedido de compra",
      "type": "uuid",
      "required": true,
      "description": "Pedido de compra ao qual este recebimento está vinculado."
    },
    {
      "fieldId": "dataRecebimento",
      "title": "Data de recebimento",
      "type": "datetime",
      "required": true,
      "description": "Data e hora em que os produtos foram efetivamente recebidos."
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

export type ComprasEntityRecebimentoCompraType = typeof comprasEntityRecebimentoCompra;

export default comprasEntityRecebimentoCompra;
