/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/changeAgentBehavior.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const changeAgentBehaviorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "changeAgentBehavior",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Change an agent's behavior",
    "goal": "Change how an agent behaves in plain language and undo a change if needed",
    "icon": "pencil",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgent",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent from the list or from the card already in hand.",
        "icon": "search"
      },
      {
        "stepId": "readBehavior",
        "kind": "inspect",
        "entity": "Agent",
        "title": "Read current behavior",
        "description": "The admin reads the agent's current behavior in plain language.",
        "icon": "book-open"
      },
      {
        "stepId": "requestChange",
        "kind": "act",
        "entity": "BehaviorChange",
        "effect": "create",
        "title": "Say what to change",
        "description": "The admin writes in the box what to change and the cm applies it to the agent's behavior.",
        "icon": "message-square"
      },
      {
        "stepId": "readHistory",
        "kind": "inspect",
        "entity": "BehaviorChange",
        "title": "See change history",
        "description": "The admin sees the history of changes with who, when and a one-line summary.",
        "icon": "history"
      },
      {
        "stepId": "undoChange",
        "kind": "act",
        "entity": "BehaviorChange",
        "effect": "transition",
        "transitionRef": "undoChange",
        "title": "Undo a change",
        "description": "The admin undoes a previous change and the cm restores the earlier behavior.",
        "icon": "undo-2"
      }
    ],
    "outcome": {
      "statement": "The agent behaves as the admin asked, with every change traceable and reversible.",
      "evidence": [
        "The behavior text shows the new behavior",
        "The history lists the change with who, when and summary"
      ]
    }
  },
  "businessHash": "sha256:4964d73b87fd27524ed1106f6059af573e097b9bca5801e3fcf37b24e5e371a3"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ChangeAgentBehaviorJourneyType = typeof changeAgentBehaviorJourney;

export default changeAgentBehaviorJourney;
