/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "inscricaoEvento",
  "businessDomain": "Gestão de eventos publicados e inscrições públicas, incluindo lista de espera e cancelamentos.",
  "entities": [
    "Evento",
    "Inscricao",
    "Participante"
  ],
  "relationships": [
    {
      "relationshipId": "eventoInscricoes",
      "fromEntity": "Evento",
      "toEntity": "Inscricao",
      "type": "oneToMany",
      "required": true,
      "description": "Um evento possui as inscrições realizadas para sua participação.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Inscricao",
        "from": {
          "entityId": "Evento",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "Inscricao",
          "fieldIds": [
            "eventoId"
          ]
        }
      }
    },
    {
      "relationshipId": "participanteInscricoes",
      "fromEntity": "Participante",
      "toEntity": "Inscricao",
      "type": "oneToMany",
      "required": true,
      "description": "Um participante pode possuir inscrições em eventos.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Inscricao",
        "from": {
          "entityId": "Participante",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "Inscricao",
          "fieldIds": [
            "participanteId"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type InscricaoEventoOntologyIndexType = typeof inscricaoEventoOntologyIndex;

export default inscricaoEventoOntologyIndex;
