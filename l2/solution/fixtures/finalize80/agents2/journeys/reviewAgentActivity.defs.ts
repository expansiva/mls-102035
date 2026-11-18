/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/reviewAgentActivity.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reviewAgentActivityJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reviewAgentActivity",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Review agent activity",
    "goal": "See what an agent did and how it went",
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
        "description": "The admin opens the agent's activity scenario.",
        "icon": "search"
      },
      {
        "stepId": "readExecutions",
        "kind": "inspect",
        "entity": "ExecutionSummary",
        "title": "Read executions",
        "description": "The admin sees executions newest first with when, how long, cost, actions and results, takeover by a person and the link to the conversation.",
        "icon": "list-checks"
      }
    ],
    "outcome": {
      "statement": "The admin knows what the agent did, at what cost and with what results.",
      "evidence": [
        "Each execution appears once, newest first",
        "Each line links to its conversation"
      ]
    }
  },
  "businessHash": "sha256:1653af8c6ad9c044881511f152dd40a36fff9b56a1e6630adf4c74d9afe28fb1"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReviewAgentActivityJourneyType = typeof reviewAgentActivityJourney;

export default reviewAgentActivityJourney;
