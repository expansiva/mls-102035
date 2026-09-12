/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/Application.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityApplication = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "hiringPipeline",
  "entityId": "Application",
  "title": "Application",
  "description": "A candidate's application for a job position, tracked through the hiring pipeline.",
  "kind": "core",
  "party": "none",
  "displayField": "id",
  "fields": [
    {
      "fieldId": "id",
      "title": "Application ID",
      "type": "uuid",
      "required": true,
      "description": "Unique identifier for the application."
    },
    {
      "fieldId": "candidateId",
      "title": "Candidate",
      "type": "uuid",
      "required": true,
      "description": "Reference to the candidate who submitted the application."
    },
    {
      "fieldId": "jobPositionId",
      "title": "Job Position",
      "type": "uuid",
      "required": true,
      "description": "Reference to the job position the candidate applied for."
    },
    {
      "fieldId": "status",
      "title": "Application Status",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "screening",
          "title": "Screening"
        },
        {
          "value": "interview",
          "title": "Interview"
        },
        {
          "value": "offer",
          "title": "Offer"
        },
        {
          "value": "hired",
          "title": "Hired"
        },
        {
          "value": "rejected",
          "title": "Rejected"
        }
      ],
      "description": "Current stage of the application in the hiring pipeline."
    },
    {
      "fieldId": "rejectionReason",
      "title": "Rejection Reason",
      "type": "text",
      "required": false,
      "description": "Reason recorded when the application is rejected."
    }
  ],
  "lifecycleStates": [
    {
      "state": "screening",
      "reachedBy": "actor"
    },
    {
      "state": "interview",
      "reachedBy": "actor"
    },
    {
      "state": "offer",
      "reachedBy": "actor"
    },
    {
      "state": "hired",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "advanceToInterview",
      "from": [
        "screening"
      ],
      "to": "interview",
      "by": [
        "recruiter"
      ],
      "description": "Advance a screened application to the interview stage."
    },
    {
      "transitionId": "issueOffer",
      "from": [
        "interview"
      ],
      "to": "offer",
      "by": [
        "hiringManager"
      ],
      "description": "Authorize and issue an offer for an interviewed candidate."
    },
    {
      "transitionId": "markHired",
      "from": [
        "offer"
      ],
      "to": "hired",
      "by": [
        "hiringManager"
      ],
      "description": "Confirm that a candidate with an offer has been hired."
    },
    {
      "transitionId": "rejectApplication",
      "from": [
        "screening",
        "interview",
        "offer"
      ],
      "to": "rejected",
      "by": [
        "recruiter"
      ],
      "description": "Reject an active application and record the reason for rejection."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type HiringPipelineEntityApplicationType = typeof hiringPipelineEntityApplication;

export default hiringPipelineEntityApplication;
