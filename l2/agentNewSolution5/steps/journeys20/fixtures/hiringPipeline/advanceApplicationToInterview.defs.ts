/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/advanceApplicationToInterview.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const advanceApplicationToInterviewJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "advanceApplicationToInterview",
  "business": {
    "actorRef": "recruiter",
    "title": "Advance an application to interview",
    "goal": "Move a screened application to the interview stage.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "Find the application.",
        "description": "Locate the application, or use the application already in context."
      },
      {
        "stepId": "inspectScreening",
        "kind": "inspect",
        "entity": "Application",
        "title": "Review screening details.",
        "description": "Inspect the application and its current screening stage."
      },
      {
        "stepId": "moveToInterview",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "advanceToInterview",
        "title": "Move the application to interview.",
        "description": "Advance the application from screening to interview."
      }
    ],
    "outcome": {
      "statement": "The application is ready for the interview stage.",
      "evidence": [
        "The application shows the interview stage."
      ]
    }
  },
  "businessHash": "sha256:3a3f768e869ef28e2d3a95f61415a4804b048a7434d3b0c2ed9197d21832b816"
} as const satisfies Ns5JourneyArtifact;

export type AdvanceApplicationToInterviewJourneyType = typeof advanceApplicationToInterviewJourney;

export default advanceApplicationToInterviewJourney;
