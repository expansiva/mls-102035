/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5OntologyIndex = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "ordenServicio5",
  "businessDomain": "Gestión de órdenes de servicio técnico para aparatos electrónicos, desde la recepción hasta la entrega.",
  "entities": [
    "DefectoInformado",
    "FotoOrden",
    "Diagnostico",
    "PiezaNecesaria",
    "Reparacion",
    "EntregaAparato",
    "Presupuesto",
    "OrdenServicio",
    "Cliente",
    "Aparato"
  ],
  "relationships": [
    {
      "relationshipId": "ordenTieneCliente",
      "fromEntity": "OrdenServicio",
      "toEntity": "Cliente",
      "type": "manyToOne",
      "required": true,
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
      "relationshipId": "ordenTieneAparato",
      "fromEntity": "OrdenServicio",
      "toEntity": "Aparato",
      "type": "manyToOne",
      "required": true,
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
      "relationshipId": "ordenRegistraDefectoInformado",
      "fromEntity": "OrdenServicio",
      "toEntity": "DefectoInformado",
      "type": "oneToOne",
      "required": true,
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdenServicio",
        "from": {
          "entityId": "OrdenServicio",
          "fieldIds": [
            "defectoInformadoId"
          ]
        },
        "to": {
          "entityId": "DefectoInformado",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "ordenIncluyeFotos",
      "fromEntity": "OrdenServicio",
      "toEntity": "FotoOrden",
      "type": "oneToMany",
      "required": false,
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldCollection",
        "ownerEntity": "OrdenServicio",
        "from": {
          "entityId": "OrdenServicio",
          "fieldIds": [
            "fotoOrdenIds"
          ]
        },
        "to": {
          "entityId": "FotoOrden",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "ordenTieneDiagnostico",
      "fromEntity": "OrdenServicio",
      "toEntity": "Diagnostico",
      "type": "oneToOne",
      "required": false,
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdenServicio",
        "from": {
          "entityId": "OrdenServicio",
          "fieldIds": [
            "diagnosticoId"
          ]
        },
        "to": {
          "entityId": "Diagnostico",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "ordenTienePresupuesto",
      "fromEntity": "OrdenServicio",
      "toEntity": "Presupuesto",
      "type": "oneToOne",
      "required": false,
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdenServicio",
        "from": {
          "entityId": "OrdenServicio",
          "fieldIds": [
            "presupuestoId"
          ]
        },
        "to": {
          "entityId": "Presupuesto",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "presupuestoIncluyePiezasNecesarias",
      "fromEntity": "Presupuesto",
      "toEntity": "PiezaNecesaria",
      "type": "oneToMany",
      "required": false,
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldCollection",
        "ownerEntity": "Presupuesto",
        "from": {
          "entityId": "Presupuesto",
          "fieldIds": [
            "piezasNecesarias"
          ]
        },
        "to": {
          "entityId": "PiezaNecesaria",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "ordenRegistraReparacion",
      "fromEntity": "OrdenServicio",
      "toEntity": "Reparacion",
      "type": "oneToOne",
      "required": false,
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdenServicio",
        "from": {
          "entityId": "OrdenServicio",
          "fieldIds": [
            "reparacionId"
          ]
        },
        "to": {
          "entityId": "Reparacion",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "ordenRegistraEntregaAparato",
      "fromEntity": "OrdenServicio",
      "toEntity": "EntregaAparato",
      "type": "oneToOne",
      "required": false,
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdenServicio",
        "from": {
          "entityId": "OrdenServicio",
          "fieldIds": [
            "entregaAparatoId"
          ]
        },
        "to": {
          "entityId": "EntregaAparato",
          "fieldIds": [
            "id"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type OrdenServicio5OntologyIndexType = typeof ordenServicio5OntologyIndex;

export default ordenServicio5OntologyIndex;
