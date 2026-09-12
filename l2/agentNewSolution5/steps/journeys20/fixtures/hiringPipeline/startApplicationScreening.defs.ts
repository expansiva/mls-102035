/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/startApplicationScreening.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const startApplicationScreeningJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "startApplicationScreening",
  "business": {
    "actorRef": "recruiter",
    "title": "Start candidate screening",
    "goal": "Record a candidate's application for an open job position and begin screening.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateCandidate",
        "kind": "locate",
        "entity": "Candidate",
        "title": "Find the candidate.",
        "description": "Locate the registered candidate, or use the candidate already in context."
      },
      {
        "stepId": "locateOpenPosition",
        "kind": "locate",
        "entity": "JobPosition",
        "title": "Find the open position.",
        "description": "Locate the open job position for the application."
      },
      {
        "stepId": "createApplication",
        "kind": "act",
        "entity": "Application",
        "effect": "create",
        "title": "Create the application.",
        "description": "Record the candidate's application for the selected job position in screening."
      }
    ],
    "outcome": {
      "statement": "The candidate has an application in the screening stage for the job position.",
      "evidence": [
        "An application links the candidate and job position.",
        "The application shows the screening stage."
      ]
    }
  },
  "businessHash": "sha256:e3b29d46b4de044aaba2fae8ad2b8a046ebaef5cfaf6256c436f67652ee2cf4a"
} as const satisfies Ns5JourneyArtifact;

export type StartApplicationScreeningJourneyType = typeof startApplicationScreeningJourney;

export default startApplicationScreeningJourney;
