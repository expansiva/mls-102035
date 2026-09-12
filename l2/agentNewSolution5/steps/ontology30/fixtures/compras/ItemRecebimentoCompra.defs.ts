/// <mls fileReference="_102047_/l4/compras/ontology/ItemRecebimentoCompra.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comprasEntityItemRecebimentoCompra = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "entityId": "ItemRecebimentoCompra",
  "title": "Item do recebimento de compra",
  "description": "Quantidade efetivamente recebida de um item de pedido e destinada à entrada no estoque.",
  "kind": "supporting",
  "party": "none",
  "displayField": "produto",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do item de recebimento de compra."
    },
    {
      "fieldId": "recebimentoCompraId",
      "title": "Recebimento de compra",
      "type": "uuid",
      "required": true,
      "description": "Recebimento de compra ao qual este item pertence."
    },
    {
      "fieldId": "itemPedidoCompraId",
      "title": "Item do pedido de compra",
      "type": "uuid",
      "required": true,
      "description": "Item do pedido de compra recebido nesta etapa."
    },
    {
      "fieldId": "produto",
      "title": "Produto",
      "type": "uuid",
      "required": true,
      "description": "Produto efetivamente recebido e destinado à entrada no estoque."
    },
    {
      "fieldId": "estoqueProdutoId",
      "title": "Posição de estoque",
      "type": "uuid",
      "required": true,
      "description": "Posição de estoque que recebe a entrada deste produto."
    },
    {
      "fieldId": "quantidadeRecebida",
      "title": "Quantidade recebida",
      "type": "number",
      "required": true,
      "constraints": {
        "min": 0,
        "precision": 3
      },
      "description": "Quantidade do produto efetivamente recebida neste item."
    }
  ],
  "uniqueKeys": [
    [
      "recebimentoCompraId",
      "itemPedidoCompraId"
    ]
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

export type ComprasEntityItemRecebimentoCompraType = typeof comprasEntityItemRecebimentoCompra;

export default comprasEntityItemRecebimentoCompra;
