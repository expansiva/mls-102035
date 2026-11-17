/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/reviewAgentActivity.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reviewAgentActivityJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reviewAgentActivity",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Review agent activity",
    "goal": "See what an agent did, its cost and results.",
    "icon": "activity",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForActivity",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent from the list.",
        "icon": "search"
      },
      {
        "stepId": "readActivity",
        "kind": "inspect",
        "entity": "AgentExecution",
        "title": "Read activity",
        "description": "The admin reads the executions newest first: when, how long, cost, actions and results, whether a person took over, and the link to the conversation.",
        "icon": "history"
      }
    ],
    "outcome": {
      "statement": "The admin knows what the agent did and how it went.",
      "evidence": [
        "Executions are listed newest first, each once",
        "Each execution shows duration, cost, actions, results and the conversation link"
      ]
    }
  },
  "businessHash": "sha256:effc56751210d42568068dd2ce1dc7834e593478f43ef292a5b27841d4f590e7"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReviewAgentActivityJourneyType = typeof reviewAgentActivityJourney;

export default reviewAgentActivityJourney;
