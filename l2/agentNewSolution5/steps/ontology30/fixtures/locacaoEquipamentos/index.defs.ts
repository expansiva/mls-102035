/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "locacaoEquipamentos",
  "businessDomain": "Locação de equipamentos para construção, incluindo contratos, devoluções e acompanhamento da situação dos equipamentos.",
  "entities": [
    "Cliente",
    "Equipamento",
    "Atendente",
    "ContratoLocacao",
    "RentalItem"
  ],
  "relationships": [
    {
      "relationshipId": "clientHasRentalContracts",
      "fromEntity": "Cliente",
      "toEntity": "ContratoLocacao",
      "type": "oneToMany",
      "required": true,
      "description": "O cliente é titular dos contratos de locação realizados em seu nome.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ContratoLocacao",
        "from": {
          "entityId": "Cliente",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "ContratoLocacao",
          "fieldIds": [
            "clienteId"
          ]
        }
      }
    },
    {
      "relationshipId": "attendantCreatesRentalContracts",
      "fromEntity": "Atendente",
      "toEntity": "ContratoLocacao",
      "type": "oneToMany",
      "required": true,
      "description": "O atendente é responsável pelos contratos de locação que cria.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ContratoLocacao",
        "from": {
          "entityId": "Atendente",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "ContratoLocacao",
          "fieldIds": [
            "atendenteId"
          ]
        }
      }
    },
    {
      "relationshipId": "rentalContractIncludesItems",
      "fromEntity": "ContratoLocacao",
      "toEntity": "RentalItem",
      "type": "oneToMany",
      "required": true,
      "description": "O contrato de locação contém um ou mais itens de locação.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "RentalItem",
        "from": {
          "entityId": "ContratoLocacao",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "RentalItem",
          "fieldIds": [
            "rentalContract"
          ]
        }
      }
    },
    {
      "relationshipId": "rentalItemReservesEquipment",
      "fromEntity": "RentalItem",
      "toEntity": "Equipamento",
      "type": "manyToOne",
      "required": true,
      "description": "O item de locação reserva um equipamento específico para o contrato.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "RentalItem",
        "from": {
          "entityId": "RentalItem",
          "fieldIds": [
            "equipment"
          ]
        },
        "to": {
          "entityId": "Equipamento",
          "fieldIds": [
            "id"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type LocacaoEquipamentosOntologyIndexType = typeof locacaoEquipamentosOntologyIndex;

export default locacaoEquipamentosOntologyIndex;
