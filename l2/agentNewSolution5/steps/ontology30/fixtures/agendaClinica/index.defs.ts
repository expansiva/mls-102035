/// <mls fileReference="_102047_/l4/agendaClinica/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "agendaClinica",
  "businessDomain": "Agendamento e registro de consultas clínicas",
  "entities": [
    "Paciente",
    "Profissional",
    "Consulta"
  ],
  "relationships": [
    {
      "relationshipId": "consultaPaciente",
      "fromEntity": "Consulta",
      "toEntity": "Paciente",
      "type": "manyToOne",
      "required": true,
      "description": "Cada consulta é agendada para um paciente.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Consulta",
        "from": {
          "entityId": "Consulta",
          "fieldIds": [
            "pacienteId"
          ]
        },
        "to": {
          "entityId": "Paciente",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "consultaProfissional",
      "fromEntity": "Consulta",
      "toEntity": "Profissional",
      "type": "manyToOne",
      "required": true,
      "description": "Cada consulta é realizada por um profissional.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Consulta",
        "from": {
          "entityId": "Consulta",
          "fieldIds": [
            "profissionalId"
          ]
        },
        "to": {
          "entityId": "Profissional",
          "fieldIds": [
            "id"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type AgendaClinicaOntologyIndexType = typeof agendaClinicaOntologyIndex;

export default agendaClinicaOntologyIndex;
