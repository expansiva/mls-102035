/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "agents",
  "journeys": [
    {
      "journeyId": "createVirtualEmployee",
      "actorRef": "companyAdmin",
      "title": "Create a virtual employee"
    },
    {
      "journeyId": "reviewAndActivateDraft",
      "actorRef": "companyAdmin",
      "title": "Review and activate a draft"
    },
    {
      "journeyId": "reviewRefusedDraft",
      "actorRef": "companyAdmin",
      "title": "Understand a refused draft"
    },
    {
      "journeyId": "changeAgentBehavior",
      "actorRef": "companyAdmin",
      "title": "Change an agent's behavior"
    },
    {
      "journeyId": "adjustAgentTools",
      "actorRef": "companyAdmin",
      "title": "Adjust an agent's tools"
    },
    {
      "journeyId": "configureAgent",
      "actorRef": "companyAdmin",
      "title": "Configure an agent"
    },
    {
      "journeyId": "reviewAgentActivity",
      "actorRef": "companyAdmin",
      "title": "Review agent activity"
    },
    {
      "journeyId": "simulateAgentByRole",
      "actorRef": "companyAdmin",
      "title": "Simulate an agent"
    },
    {
      "journeyId": "restrictPersonTools",
      "actorRef": "companyAdmin",
      "title": "Restrict tools for a person"
    },
    {
      "journeyId": "browseAgents",
      "actorRef": "organizationMember",
      "title": "See the agents"
    },
    {
      "journeyId": "simulateAsMyself",
      "actorRef": "organizationMember",
      "title": "Simulate an agent for me"
    },
    {
      "journeyId": "changeMyConduct",
      "actorRef": "organizationMember",
      "title": "Change my agent's conduct"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type AgentsJourneyIndexType = typeof agentsJourneyIndex;

export default agentsJourneyIndex;
