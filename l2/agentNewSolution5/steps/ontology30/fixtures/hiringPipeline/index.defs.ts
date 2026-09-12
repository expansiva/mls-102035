/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "hiringPipeline",
  "businessDomain": "Hiring pipeline management",
  "entities": [
    "JobPosition",
    "Candidate",
    "Application"
  ],
  "relationships": [
    {
      "relationshipId": "candidateApplications",
      "fromEntity": "Candidate",
      "toEntity": "Application",
      "type": "oneToMany",
      "required": true,
      "description": "A candidate submits one or more applications.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Application",
        "from": {
          "entityId": "Candidate",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "Application",
          "fieldIds": [
            "candidateId"
          ]
        }
      }
    },
    {
      "relationshipId": "jobPositionApplications",
      "fromEntity": "JobPosition",
      "toEntity": "Application",
      "type": "oneToMany",
      "required": true,
      "description": "A job position receives one or more candidate applications.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Application",
        "from": {
          "entityId": "JobPosition",
          "fieldIds": [
            "id"
          ]
        },
        "to": {
          "entityId": "Application",
          "fieldIds": [
            "jobPositionId"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type HiringPipelineOntologyIndexType = typeof hiringPipelineOntologyIndex;

export default hiringPipelineOntologyIndex;
