/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/simulateAsMyself.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const simulateAsMyselfJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "simulateAsMyself",
  "business": {
    "actorRef": "organizationMember",
    "title": "Simulate an agent for me",
    "goal": "See what an agent can do for me and what it understands",
    "icon": "flask-conical",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForMe",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The member opens the agent's simulation scenario.",
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
        "title": "See what it understands",
        "description": "The member types a sentence and sees whether it asks for an action, the path and the actions.",
        "icon": "message-circle-question"
      }
    ],
    "outcome": {
      "statement": "The member knows what the agent will do when they call it.",
      "evidence": [
        "Tools are listed as usable or not with the reason",
        "The sentence result shows path and actions"
      ]
    }
  },
  "businessHash": "sha256:d8a0047caefe0ee0f34ed07fac995055281e48139f1631339a5d79517e08173b"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type SimulateAsMyselfJourneyType = typeof simulateAsMyselfJourney;

export default simulateAsMyselfJourney;
