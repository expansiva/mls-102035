/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/hireCandidate.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const hireCandidateJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "hireCandidate",
  "business": {
    "actorRef": "hiringManager",
    "title": "Decide and record a hire",
    "goal": "Confirm that a candidate with an offer is hired.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateOfferApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "Find the application with an offer.",
        "description": "Locate the application, or use the application already in context."
      },
      {
        "stepId": "inspectOfferApplication",
        "kind": "inspect",
        "entity": "Application",
        "title": "Review the offer application.",
        "description": "Inspect the candidate, job position, and offer-stage application."
      },
      {
        "stepId": "inspectPositionCapacity",
        "kind": "inspect",
        "entity": "JobPosition",
        "title": "Review position capacity.",
        "description": "Inspect the position's remaining headcount before confirming the hire."
      },
      {
        "stepId": "decideHire",
        "kind": "decide",
        "entity": "Application",
        "title": "Decide whether to hire the candidate.",
        "description": "Choose to confirm the candidate as hired."
      },
      {
        "stepId": "markHired",
        "kind": "act",
        "entity": "Application",
        "affects": [
          "JobPosition"
        ],
        "effect": "transition",
        "transitionRef": "markHired",
        "title": "Record the hire.",
        "description": "Move the application from offer to hired and update the position's filled headcount."
      }
    ],
    "outcome": {
      "statement": "The candidate is recorded as hired, and the job position reflects the filled headcount.",
      "evidence": [
        "The application shows the hired stage.",
        "The job position's filled headcount reflects the hire.",
        "A position whose headcount is filled is closed automatically."
      ]
    }
  },
  "businessHash": "sha256:c5858de30cd8c89fcddec2e9595acb709352b41d7126a07e0ce7f3b6c13a277b"
} as const satisfies Ns5JourneyArtifact;

export type HireCandidateJourneyType = typeof hireCandidateJourney;

export default hireCandidateJourney;
