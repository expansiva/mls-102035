/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/simulateAgentByRole.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const simulateAgentByRoleJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "simulateAgentByRole",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Simulate an agent by role",
    "goal": "Check what an agent can do for a person or role and what it understands from a sentence.",
    "icon": "play",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentToSimulate",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent to simulate.",
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
        "description": "For a sentence, the admin sees whether it asks for an action, which path of the tree and which actions.",
        "icon": "message-circle-question"
      }
    ],
    "outcome": {
      "statement": "The admin knows what the agent can do for that role and how it interprets the sentence.",
      "evidence": [
        "The list of usable and blocked tools with reasons is shown",
        "The interpreted path and actions for the sentence are shown"
      ]
    }
  },
  "businessHash": "sha256:f348039d2a45e37c2e0550ebdb39070c7959daaebee3142c1ddc4512e7d8eb5e"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type SimulateAgentByRoleJourneyType = typeof simulateAgentByRoleJourney;

export default simulateAgentByRoleJourney;
