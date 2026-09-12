/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/rejectApplication.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const rejectApplicationJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "rejectApplication",
  "business": {
    "actorRef": "recruiter",
    "title": "Reject an application",
    "goal": "Record that a candidate will not continue in the hiring pipeline.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateActiveApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "Find the application.",
        "description": "Locate the active application, or use the application already in context."
      },
      {
        "stepId": "recordRejection",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "rejectApplication",
        "title": "Record the rejection reason.",
        "description": "Move the application to rejected and record the reason for rejection."
      }
    ],
    "outcome": {
      "statement": "The application is rejected with a recorded reason.",
      "evidence": [
        "The application shows the rejected stage.",
        "The application includes a rejection reason."
      ]
    }
  },
  "businessHash": "sha256:b5dac1ac03246dda1f2974ce96106dc3e432c4bcb466d558014ef566ff5d25f4"
} as const satisfies Ns5JourneyArtifact;

export type RejectApplicationJourneyType = typeof rejectApplicationJourney;

export default rejectApplicationJourney;
