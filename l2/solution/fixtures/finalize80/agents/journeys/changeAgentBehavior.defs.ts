/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/changeAgentBehavior.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const changeAgentBehaviorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "changeAgentBehavior",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Change an agent's behavior",
    "goal": "Change how an agent behaves by describing the change in plain language.",
    "icon": "message-square",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForBehavior",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent from the list or keeps the agent already open.",
        "icon": "search"
      },
      {
        "stepId": "readBehavior",
        "kind": "inspect",
        "entity": "Agent",
        "title": "Read current behavior",
        "description": "The admin reads the current behavior in plain language and the history of changes with who, when and a summary.",
        "icon": "book-open"
      },
      {
        "stepId": "requestBehaviorChange",
        "kind": "act",
        "entity": "BehaviorChange",
        "effect": "create",
        "title": "Describe what to change",
        "description": "The admin writes in the box what should change and the cm updates the agent behavior, recording the change in the history.",
        "icon": "pencil"
      }
    ],
    "outcome": {
      "statement": "The agent behaves according to the requested change and the change is in the history.",
      "evidence": [
        "The behavior text shows the new behavior",
        "The history lists the change with who, when and a one-line summary"
      ]
    }
  },
  "businessHash": "sha256:64ae6a96442dfd5b67beb1175b42eef5c95794e5e35076ccfa46a8f26b7cb6a3"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ChangeAgentBehaviorJourneyType = typeof changeAgentBehaviorJourney;

export default changeAgentBehaviorJourney;
