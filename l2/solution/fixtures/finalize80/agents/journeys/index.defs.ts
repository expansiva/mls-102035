/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/index.defs.ts" enhancement="_blank"/>

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
      "journeyId": "changeAgentBehavior",
      "actorRef": "companyAdmin",
      "title": "Change an agent's behavior"
    },
    {
      "journeyId": "undoBehaviorChange",
      "actorRef": "companyAdmin",
      "title": "Undo a behavior change"
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
      "journeyId": "simulateAgentByRole",
      "actorRef": "companyAdmin",
      "title": "Simulate an agent by role"
    },
    {
      "journeyId": "restrictPersonTools",
      "actorRef": "companyAdmin",
      "title": "Restrict tools for a person"
    },
    {
      "journeyId": "reviewAgentActivity",
      "actorRef": "companyAdmin",
      "title": "Review agent activity"
    },
    {
      "journeyId": "browseAgents",
      "actorRef": "organizationMember",
      "title": "See the company's agents"
    },
    {
      "journeyId": "simulateAsMyself",
      "actorRef": "organizationMember",
      "title": "Simulate an agent for myself"
    },
    {
      "journeyId": "changeMyConduct",
      "actorRef": "organizationMember",
      "title": "Change my conduct with an agent"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type AgentsJourneyIndexType = typeof agentsJourneyIndex;

export default agentsJourneyIndex;
