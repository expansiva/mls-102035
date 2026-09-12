/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "hiringPipeline",
  "journeys": [
    {
      "journeyId": "openJobPosition",
      "actorRef": "recruiter",
      "title": "Open a job position"
    },
    {
      "journeyId": "registerCandidate",
      "actorRef": "recruiter",
      "title": "Register a candidate"
    },
    {
      "journeyId": "startApplicationScreening",
      "actorRef": "recruiter",
      "title": "Start candidate screening"
    },
    {
      "journeyId": "advanceApplicationToInterview",
      "actorRef": "recruiter",
      "title": "Advance an application to interview"
    },
    {
      "journeyId": "issueOffer",
      "actorRef": "hiringManager",
      "title": "Decide and issue an offer"
    },
    {
      "journeyId": "hireCandidate",
      "actorRef": "hiringManager",
      "title": "Decide and record a hire"
    },
    {
      "journeyId": "rejectApplication",
      "actorRef": "recruiter",
      "title": "Reject an application"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type HiringPipelineJourneyIndexType = typeof hiringPipelineJourneyIndex;

export default hiringPipelineJourneyIndex;
