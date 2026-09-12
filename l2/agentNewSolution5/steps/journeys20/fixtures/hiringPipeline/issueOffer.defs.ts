/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/issueOffer.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const issueOfferJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "issueOffer",
  "business": {
    "actorRef": "hiringManager",
    "title": "Decide and issue an offer",
    "goal": "Authorize an offer for an interviewed candidate.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateInterviewApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "Find the interviewed application.",
        "description": "Locate the application, or use the application already in context."
      },
      {
        "stepId": "inspectApplication",
        "kind": "inspect",
        "entity": "Application",
        "title": "Review the application.",
        "description": "Inspect the candidate, job position, and interview-stage application."
      },
      {
        "stepId": "decideOffer",
        "kind": "decide",
        "entity": "Application",
        "title": "Decide whether to authorize an offer.",
        "description": "Choose to authorize an offer for the interviewed candidate."
      },
      {
        "stepId": "moveToOffer",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "issueOffer",
        "title": "Issue the offer.",
        "description": "Move the application from interview to offer."
      }
    ],
    "outcome": {
      "statement": "The selected application has an authorized offer.",
      "evidence": [
        "The application shows the offer stage.",
        "The application remains linked to the candidate and job position."
      ]
    }
  },
  "businessHash": "sha256:0e8ed208f84e85bd5fb24b4ab3f0f8a63add0c87059a89325545bab63f815d4b"
} as const satisfies Ns5JourneyArtifact;

export type IssueOfferJourneyType = typeof issueOfferJourney;

export default issueOfferJourney;
