/// <mls fileReference="_102047_/l4/comandaRestaurante5/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5OntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante5",
  "businessDomain": "Gestão de comandas, itens de cardápio, descontos e pagamentos de restaurante.",
  "entities": [
    "Mesa",
    "ItemCardapio",
    "Comanda",
    "ItemComanda",
    "Desconto",
    "Pagamento"
  ],
  "relationships": [
    {
      "relationshipId": "comandaMesa",
      "fromEntity": "Comanda",
      "toEntity": "Mesa",
      "type": "manyToOne",
      "required": true,
      "description": "A comanda é aberta em uma mesa do restaurante.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Comanda",
        "from": {
          "entityId": "Comanda",
          "fieldIds": [
            "mesa"
          ]
        },
        "to": {
          "entityId": "Mesa",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "itemComandaComanda",
      "fromEntity": "ItemComanda",
      "toEntity": "Comanda",
      "type": "manyToOne",
      "required": true,
      "description": "Cada lançamento pertence a uma comanda aberta.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ItemComanda",
        "from": {
          "entityId": "ItemComanda",
          "fieldIds": [
            "comanda"
          ]
        },
        "to": {
          "entityId": "Comanda",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "itemComandaItemCardapio",
      "fromEntity": "ItemComanda",
      "toEntity": "ItemCardapio",
      "type": "manyToOne",
      "required": true,
      "description": "O lançamento referencia o item do cardápio pedido.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ItemComanda",
        "from": {
          "entityId": "ItemComanda",
          "fieldIds": [
            "itemCardapio"
          ]
        },
        "to": {
          "entityId": "ItemCardapio",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "descontoComanda",
      "fromEntity": "Desconto",
      "toEntity": "Comanda",
      "type": "manyToOne",
      "required": true,
      "description": "O desconto pontual é aplicado a uma comanda.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Desconto",
        "from": {
          "entityId": "Desconto",
          "fieldIds": [
            "comandaId"
          ]
        },
        "to": {
          "entityId": "Comanda",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "pagamentoComanda",
      "fromEntity": "Pagamento",
      "toEntity": "Comanda",
      "type": "manyToOne",
      "required": true,
      "description": "O pagamento quita total ou parcialmente uma comanda.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Pagamento",
        "from": {
          "entityId": "Pagamento",
          "fieldIds": [
            "comanda"
          ]
        },
        "to": {
          "entityId": "Comanda",
          "fieldIds": [
            "id"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type ComandaRestaurante5OntologyIndexType = typeof comandaRestaurante5OntologyIndex;

export default comandaRestaurante5OntologyIndex;
