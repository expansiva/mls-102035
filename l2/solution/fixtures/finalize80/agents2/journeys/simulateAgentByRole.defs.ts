/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/simulateAgentByRole.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const simulateAgentByRoleJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "simulateAgentByRole",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Simulate an agent",
    "goal": "Check what an agent can do for a person or role and what it understands",
    "icon": "flask-conical",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentToSimulate",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent's simulation scenario.",
        "icon": "search"
      },
      {
        "stepId": "simulateWhatItCan",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "See what it can",
        "description": "For a chosen person or role, the admin sees which tools can or cannot be used and why.",
        "icon": "shield-check"
      },
      {
        "stepId": "simulateWhatItUnderstands",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "See what it understands",
        "description": "For a sentence, the admin sees whether it asks for an action, the path in the tree and the actions.",
        "icon": "message-circle-question"
      }
    ],
    "outcome": {
      "statement": "The admin knows how the agent would act before relying on it.",
      "evidence": [
        "Allowed and blocked tools are listed with reasons",
        "The sentence result shows path and actions"
      ]
    }
  },
  "businessHash": "sha256:cc350628e183886eb6637819a3713859659af75ed58baf93194485dba69e8c64"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type SimulateAgentByRoleJourneyType = typeof simulateAgentByRoleJourney;

export default simulateAgentByRoleJourney;
