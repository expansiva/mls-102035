/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "reembolsoDespesas",
  "businessDomain": "Reembolso de despesas de colaboradores, incluindo envio para aprovação, decisão do gestor e registro de pagamento.",
  "entities": [
    "Despesa",
    "Colaborador",
    "GestorEquipe"
  ],
  "relationships": [
    {
      "relationshipId": "despesaPertenceAoColaborador",
      "fromEntity": "Despesa",
      "toEntity": "Colaborador",
      "type": "manyToOne",
      "required": true,
      "description": "Cada despesa é registrada por um colaborador responsável pelo seu reembolso.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Despesa",
        "from": {
          "entityId": "Despesa",
          "fieldIds": [
            "colaboradorId"
          ]
        },
        "to": {
          "entityId": "Colaborador",
          "fieldIds": [
            "colaboradorId"
          ]
        }
      }
    },
    {
      "relationshipId": "despesaAvaliadaPeloGestor",
      "fromEntity": "Despesa",
      "toEntity": "GestorEquipe",
      "type": "manyToOne",
      "required": false,
      "description": "Uma despesa pode ser avaliada pelo gestor responsável pela equipe do colaborador.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Despesa",
        "from": {
          "entityId": "Despesa",
          "fieldIds": [
            "gestorEquipeId"
          ]
        },
        "to": {
          "entityId": "GestorEquipe",
          "fieldIds": [
            "gestorEquipeId"
          ]
        }
      }
    },
    {
      "relationshipId": "colaboradorReportaAoGestor",
      "fromEntity": "Colaborador",
      "toEntity": "GestorEquipe",
      "type": "manyToOne",
      "required": true,
      "description": "Cada colaborador reporta-se a um gestor da equipe para fins de aprovação de despesas.",
      "persistence": {
        "mode": "mdmRelationship"
      },
      "realization": {
        "kind": "mdmRelationship",
        "ownerEntity": "Colaborador",
        "from": {
          "entityId": "Colaborador",
          "fieldIds": [
            "colaboradorId"
          ]
        },
        "to": {
          "entityId": "GestorEquipe",
          "fieldIds": [
            "gestorEquipeId"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type ReembolsoDespesasOntologyIndexType = typeof reembolsoDespesasOntologyIndex;

export default reembolsoDespesasOntologyIndex;
