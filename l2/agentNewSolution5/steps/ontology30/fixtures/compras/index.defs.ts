/// <mls fileReference="_102047_/l4/compras/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const comprasOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "businessDomain": "Gestão de compras, fornecedores, pedidos de compra e recebimentos de produtos.",
  "entities": [
    "Comprador",
    "Fornecedor",
    "Produto",
    "EstoqueProduto",
    "FornecimentoProduto",
    "PedidoCompra",
    "ItemPedidoCompra",
    "RecebimentoCompra",
    "ItemRecebimentoCompra"
  ],
  "relationships": [
    {
      "relationshipId": "compradorGerenciaFornecedor",
      "fromEntity": "Comprador",
      "toEntity": "Fornecedor",
      "type": "manyToMany",
      "required": false,
      "description": "O comprador gerencia os fornecedores que cadastra e acompanha para a organização.",
      "persistence": {
        "mode": "mdmRelationship"
      },
      "realization": {
        "kind": "mdmRelationship",
        "ownerEntity": "Comprador",
        "from": {
          "entityId": "Comprador",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "Fornecedor",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "fornecedorPossuiFornecimentos",
      "fromEntity": "Fornecedor",
      "toEntity": "FornecimentoProduto",
      "type": "oneToMany",
      "required": true,
      "description": "O fornecedor possui condições comerciais para os produtos que fornece.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "FornecimentoProduto",
        "from": {
          "entityId": "Fornecedor",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "FornecimentoProduto",
          "fieldIds": [
            "fornecedor"
          ]
        }
      }
    },
    {
      "relationshipId": "produtoPossuiFornecimentos",
      "fromEntity": "Produto",
      "toEntity": "FornecimentoProduto",
      "type": "oneToMany",
      "required": true,
      "description": "O produto pode ter condições comerciais registradas com diferentes fornecedores.",
      "persistence": {
        "mode": "externalReference"
      },
      "realization": {
        "kind": "externalReference",
        "ownerEntity": "FornecimentoProduto",
        "from": {
          "entityId": "Produto",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "FornecimentoProduto",
          "fieldIds": [
            "produto"
          ]
        }
      }
    },
    {
      "relationshipId": "fornecedorRecebePedidos",
      "fromEntity": "Fornecedor",
      "toEntity": "PedidoCompra",
      "type": "oneToMany",
      "required": true,
      "description": "O fornecedor recebe os pedidos de compra emitidos pela organização.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "PedidoCompra",
        "from": {
          "entityId": "Fornecedor",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "PedidoCompra",
          "fieldIds": [
            "fornecedorId"
          ]
        }
      }
    },
    {
      "relationshipId": "pedidoPossuiItens",
      "fromEntity": "PedidoCompra",
      "toEntity": "ItemPedidoCompra",
      "type": "oneToMany",
      "required": true,
      "description": "O pedido de compra é composto por um ou mais itens.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ItemPedidoCompra",
        "from": {
          "entityId": "PedidoCompra",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "ItemPedidoCompra",
          "fieldIds": [
            "pedidoCompra"
          ]
        }
      }
    },
    {
      "relationshipId": "fornecimentoOriginaItensPedido",
      "fromEntity": "FornecimentoProduto",
      "toEntity": "ItemPedidoCompra",
      "type": "oneToMany",
      "required": true,
      "description": "A condição de fornecimento define o produto e o preço de referência dos itens de pedido.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ItemPedidoCompra",
        "from": {
          "entityId": "FornecimentoProduto",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "ItemPedidoCompra",
          "fieldIds": [
            "fornecimentoProduto"
          ]
        }
      }
    },
    {
      "relationshipId": "produtoComponeItensPedido",
      "fromEntity": "Produto",
      "toEntity": "ItemPedidoCompra",
      "type": "oneToMany",
      "required": true,
      "description": "O produto pode compor itens de diferentes pedidos de compra.",
      "persistence": {
        "mode": "externalReference"
      },
      "realization": {
        "kind": "externalReference",
        "ownerEntity": "ItemPedidoCompra",
        "from": {
          "entityId": "Produto",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "ItemPedidoCompra",
          "fieldIds": [
            "produto"
          ]
        }
      }
    },
    {
      "relationshipId": "pedidoPossuiRecebimentos",
      "fromEntity": "PedidoCompra",
      "toEntity": "RecebimentoCompra",
      "type": "oneToMany",
      "required": true,
      "description": "O pedido de compra pode ter um ou mais recebimentos parciais ou totais.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "RecebimentoCompra",
        "from": {
          "entityId": "PedidoCompra",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "RecebimentoCompra",
          "fieldIds": [
            "pedidoCompraId"
          ]
        }
      }
    },
    {
      "relationshipId": "recebimentoPossuiItens",
      "fromEntity": "RecebimentoCompra",
      "toEntity": "ItemRecebimentoCompra",
      "type": "oneToMany",
      "required": true,
      "description": "O recebimento de compra registra as quantidades recebidas em seus itens.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ItemRecebimentoCompra",
        "from": {
          "entityId": "RecebimentoCompra",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "ItemRecebimentoCompra",
          "fieldIds": [
            "recebimentoCompraId"
          ]
        }
      }
    },
    {
      "relationshipId": "itemPedidoPossuiRecebimentos",
      "fromEntity": "ItemPedidoCompra",
      "toEntity": "ItemRecebimentoCompra",
      "type": "oneToMany",
      "required": true,
      "description": "O item do pedido pode ser recebido em uma ou mais etapas.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ItemRecebimentoCompra",
        "from": {
          "entityId": "ItemPedidoCompra",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "ItemRecebimentoCompra",
          "fieldIds": [
            "itemPedidoCompraId"
          ]
        }
      }
    },
    {
      "relationshipId": "produtoComponeItensRecebimento",
      "fromEntity": "Produto",
      "toEntity": "ItemRecebimentoCompra",
      "type": "oneToMany",
      "required": true,
      "description": "O produto recebido é identificado em cada item de recebimento.",
      "persistence": {
        "mode": "externalReference"
      },
      "realization": {
        "kind": "externalReference",
        "ownerEntity": "ItemRecebimentoCompra",
        "from": {
          "entityId": "Produto",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "ItemRecebimentoCompra",
          "fieldIds": [
            "produto"
          ]
        }
      }
    },
    {
      "relationshipId": "itemRecebimentoAtualizaEstoque",
      "fromEntity": "ItemRecebimentoCompra",
      "toEntity": "EstoqueProduto",
      "type": "manyToOne",
      "required": true,
      "description": "O item recebido gera a entrada na posição de estoque correspondente ao produto.",
      "persistence": {
        "mode": "externalReference"
      },
      "realization": {
        "kind": "externalReference",
        "ownerEntity": "ItemRecebimentoCompra",
        "from": {
          "entityId": "ItemRecebimentoCompra",
          "fieldIds": [
            "estoqueProdutoId"
          ]
        },
        "to": {
          "entityId": "EstoqueProduto",
          "fieldIds": [
            "id"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type ComprasOntologyIndexType = typeof comprasOntologyIndex;

export default comprasOntologyIndex;
