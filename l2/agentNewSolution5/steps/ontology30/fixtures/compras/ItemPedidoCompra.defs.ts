/// <mls fileReference="_102047_/l4/compras/ontology/ItemPedidoCompra.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comprasEntityItemPedidoCompra = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "entityId": "ItemPedidoCompra",
  "title": "Item do pedido de compra",
  "description": "Produto, quantidade e preço que compõem um pedido de compra.",
  "kind": "supporting",
  "party": "none",
  "displayField": "produto",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do item do pedido de compra."
    },
    {
      "fieldId": "pedidoCompra",
      "title": "Pedido de compra",
      "type": "uuid",
      "required": true,
      "description": "Pedido de compra ao qual este item pertence."
    },
    {
      "fieldId": "fornecimentoProduto",
      "title": "Condição de fornecimento",
      "type": "uuid",
      "required": true,
      "description": "Condição de fornecimento que define o preço de referência do produto."
    },
    {
      "fieldId": "produto",
      "title": "Produto",
      "type": "uuid",
      "required": true,
      "description": "Produto solicitado neste item do pedido de compra."
    },
    {
      "fieldId": "quantidade",
      "title": "Quantidade",
      "type": "number",
      "required": true,
      "constraints": {
        "min": 0
      },
      "description": "Quantidade do produto solicitada no pedido."
    },
    {
      "fieldId": "precoUnitario",
      "title": "Preço unitário",
      "type": "money",
      "required": true,
      "constraints": {
        "min": 0,
        "precision": 2
      },
      "description": "Preço unitário combinado para o produto neste pedido."
    }
  ],
  "details": {
    "valorTotal": {
      "type": "money",
      "description": "Valor total do item, calculado pela multiplicação da quantidade pelo preço unitário."
    },
    "quantidadeRecebida": {
      "type": "number",
      "description": "Quantidade total já recebida para este item, calculada a partir dos recebimentos registrados."
    },
    "quantidadePendente": {
      "type": "number",
      "description": "Quantidade ainda pendente de recebimento, calculada pela diferença entre a quantidade solicitada e a recebida."
    }
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type ComprasEntityItemPedidoCompraType = typeof comprasEntityItemPedidoCompra;

export default comprasEntityItemPedidoCompra;
