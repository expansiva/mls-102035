/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante",
  "businessDomain": "Operação de comandas, cardápio, mesas e pagamentos de restaurante.",
  "entities": [
    "Mesa",
    "ItemCardapio",
    "Garcom",
    "Comanda",
    "ItemComanda"
  ],
  "relationships": [
    {
      "relationshipId": "comandaMesa",
      "fromEntity": "Comanda",
      "toEntity": "Mesa",
      "type": "manyToOne",
      "required": true,
      "description": "Cada comanda é aberta para uma mesa do restaurante.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Comanda",
        "from": {
          "entityId": "Comanda",
          "fieldIds": [
            "mesaId"
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
      "relationshipId": "comandaGarcom",
      "fromEntity": "Comanda",
      "toEntity": "Garcom",
      "type": "manyToOne",
      "required": true,
      "description": "Cada comanda é aberta por um garçom responsável.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Comanda",
        "from": {
          "entityId": "Comanda",
          "fieldIds": [
            "garcomId"
          ]
        },
        "to": {
          "entityId": "Garcom",
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
      "description": "Cada item lançado pertence a uma comanda.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ItemComanda",
        "from": {
          "entityId": "ItemComanda",
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
      "relationshipId": "itemComandaItemCardapio",
      "fromEntity": "ItemComanda",
      "toEntity": "ItemCardapio",
      "type": "manyToOne",
      "required": true,
      "description": "Cada item lançado referencia um item do cardápio.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ItemComanda",
        "from": {
          "entityId": "ItemComanda",
          "fieldIds": [
            "itemCardapioId"
          ]
        },
        "to": {
          "entityId": "ItemCardapio",
          "fieldIds": [
            "id"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type ComandaRestauranteOntologyIndexType = typeof comandaRestauranteOntologyIndex;

export default comandaRestauranteOntologyIndex;
