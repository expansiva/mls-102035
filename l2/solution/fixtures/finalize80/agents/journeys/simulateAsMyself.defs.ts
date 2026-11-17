/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/simulateAsMyself.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const simulateAsMyselfJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "simulateAsMyself",
  "business": {
    "actorRef": "organizationMember",
    "title": "Simulate an agent for myself",
    "goal": "Check what an agent can do for me and what it understands from my sentence.",
    "icon": "play",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForSelf",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The member opens the agent to simulate.",
        "icon": "search"
      },
      {
        "stepId": "seeWhatItCanForMe",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "See what it can for me",
        "description": "The member sees which tools the agent can or cannot use for them and why.",
        "icon": "shield-check"
      },
      {
        "stepId": "seeWhatItUnderstandsForMe",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "Test a sentence",
        "description": "The member writes a sentence and sees whether it asks for an action, which path and which actions.",
        "icon": "message-circle-question"
      }
    ],
    "outcome": {
      "statement": "The member knows what the agent will do for them before using it.",
      "evidence": [
        "Usable and blocked tools for the member are shown with reasons",
        "The interpretation of the sentence is shown"
      ]
    }
  },
  "businessHash": "sha256:0eac776c3ecc7bf7591e4df8e1d434962fd49826b597b8ca93c8b93d00f76b5d"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type SimulateAsMyselfJourneyType = typeof simulateAsMyselfJourney;

export default simulateAsMyselfJourney;
