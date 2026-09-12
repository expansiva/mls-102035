/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/registerCandidate.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registerCandidateJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registerCandidate",
  "business": {
    "actorRef": "recruiter",
    "title": "Register a candidate",
    "goal": "Add a candidate to the hiring pipeline.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "captureCandidateDetails",
        "kind": "act",
        "entity": "Candidate",
        "effect": "create",
        "title": "Capture candidate details.",
        "description": "Register the candidate's name, email, resume link, and source."
      }
    ],
    "outcome": {
      "statement": "The candidate is available to be considered for job positions.",
      "evidence": [
        "The candidate record shows the name, email, resume link, and source."
      ]
    }
  },
  "businessHash": "sha256:84d48c38dd2ebd84d6fd485164df286baba6c55f39694db7645b91df1736bf1e"
} as const satisfies Ns5JourneyArtifact;

export type RegisterCandidateJourneyType = typeof registerCandidateJourney;

export default registerCandidateJourney;
