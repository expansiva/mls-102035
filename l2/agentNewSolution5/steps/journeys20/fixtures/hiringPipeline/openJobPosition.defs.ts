/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/openJobPosition.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const openJobPositionJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "openJobPosition",
  "business": {
    "actorRef": "recruiter",
    "title": "Open a job position",
    "goal": "Create an open position with its hiring requirements.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "enterPositionDetails",
        "kind": "act",
        "entity": "JobPosition",
        "effect": "create",
        "title": "Enter the position title, department, description, and headcount.",
        "description": "Create the job position with its title, department, description, and required headcount."
      }
    ],
    "outcome": {
      "statement": "An open job position is available for candidate applications.",
      "evidence": [
        "The job position shows its title, department, description, and headcount.",
        "The job position is available in the hiring pipeline."
      ]
    }
  },
  "businessHash": "sha256:d4dabe707059f458dea26e050c4ee82d13c0ec124291bf02d94244ef7951cabc"
} as const satisfies Ns5JourneyArtifact;

export type OpenJobPositionJourneyType = typeof openJobPositionJourney;

export default openJobPositionJourney;
