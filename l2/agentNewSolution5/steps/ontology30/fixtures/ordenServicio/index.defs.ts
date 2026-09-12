/// <mls fileReference="_102047_/l4/ordenServicio/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio",
  "businessDomain": "Gestión de órdenes de servicio para diagnóstico, presupuesto, reparación y entrega de aparatos electrónicos.",
  "entities": [
    "Cliente",
    "Aparato",
    "OrdenServicio",
    "BudgetPart"
  ],
  "relationships": [
    {
      "relationshipId": "customerOwnsEquipment",
      "fromEntity": "Cliente",
      "toEntity": "Aparato",
      "type": "oneToMany",
      "required": false,
      "description": "El cliente es propietario del aparato que presenta al servicio técnico.",
      "persistence": {
        "mode": "mdmRelationship"
      },
      "realization": {
        "kind": "mdmRelationship",
        "ownerEntity": "Cliente",
        "from": {
          "entityId": "Cliente",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "Aparato",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "serviceOrderForCustomer",
      "fromEntity": "OrdenServicio",
      "toEntity": "Cliente",
      "type": "manyToOne",
      "required": true,
      "description": "La orden de servicio corresponde al cliente que presentó el aparato.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdenServicio",
        "from": {
          "entityId": "OrdenServicio",
          "fieldIds": [
            "clienteId"
          ]
        },
        "to": {
          "entityId": "Cliente",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "serviceOrderForEquipment",
      "fromEntity": "OrdenServicio",
      "toEntity": "Aparato",
      "type": "manyToOne",
      "required": true,
      "description": "La orden de servicio registra el aparato recibido para su atención.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdenServicio",
        "from": {
          "entityId": "OrdenServicio",
          "fieldIds": [
            "aparatoId"
          ]
        },
        "to": {
          "entityId": "Aparato",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "serviceOrderHasBudgetParts",
      "fromEntity": "OrdenServicio",
      "toEntity": "BudgetPart",
      "type": "oneToMany",
      "required": false,
      "description": "La orden de servicio incluye las piezas necesarias consideradas para el presupuesto.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "BudgetPart",
        "from": {
          "entityId": "OrdenServicio",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "BudgetPart",
          "fieldIds": [
            "ordenServicioId"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type OrdenServicioOntologyIndexType = typeof ordenServicioOntologyIndex;

export default ordenServicioOntologyIndex;
