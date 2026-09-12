/// <mls fileReference="_102047_/l4/hiringPipeline/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "hiringPipeline",
  "actors": [
    {
      "actorId": "recruiter",
      "kind": "internal",
      "origin": "named",
      "title": "Recruiter",
      "description": "Internal staff member who opens job positions, registers candidates, and handles hiring pipeline activities other than offer and hiring decisions."
    },
    {
      "actorId": "hiringManager",
      "kind": "internal",
      "origin": "named",
      "title": "Hiring Manager",
      "description": "Internal manager responsible for deciding offers and hiring for job positions."
    }
  ],
  "grants": [
    {
      "grantId": "recruiterPipelineManagement",
      "actorRef": "recruiter",
      "title": "Manage hiring pipeline",
      "description": "Allows recruiters to open and review job positions, register candidates, create and advance applications, and record application rejections across the organization.",
      "entityRefs": [
        "JobPosition",
        "Candidate",
        "Application"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Applies to all hiring-pipeline records in the organization."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Recruiters may view complete job-position, candidate, and application records needed to manage the pipeline."
      }
    },
    {
      "grantId": "hiringManagerHiringDecisions",
      "actorRef": "hiringManager",
      "title": "Make hiring decisions",
      "description": "Allows hiring managers to review positions, candidates, and applications and to authorize offers and confirm hires across the organization.",
      "entityRefs": [
        "JobPosition",
        "Candidate",
        "Application"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Applies to all hiring-pipeline records in the organization."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Hiring managers may view complete job-position, candidate, and application records needed to make offer and hiring decisions."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type HiringPipelineAccessType = typeof hiringPipelineAccess;

export default hiringPipelineAccess;
