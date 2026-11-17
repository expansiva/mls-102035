/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/undoBehaviorChange.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const undoBehaviorChangeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "undoBehaviorChange",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Undo a behavior change",
    "goal": "Return an agent to the behavior it had before a change.",
    "icon": "undo-2",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForUndo",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent whose behavior should be reverted.",
        "icon": "search"
      },
      {
        "stepId": "reviewHistory",
        "kind": "inspect",
        "entity": "BehaviorChange",
        "title": "Review change history",
        "description": "The admin reads the history of behavior changes and picks the one to undo.",
        "icon": "history"
      },
      {
        "stepId": "undoChange",
        "kind": "act",
        "entity": "BehaviorChange",
        "effect": "transition",
        "transitionRef": "undo",
        "title": "Undo the change",
        "description": "The admin undoes the change and the cm restores the previous behavior.",
        "icon": "undo-2"
      }
    ],
    "outcome": {
      "statement": "The agent's behavior is back to what it was before the undone change.",
      "evidence": [
        "The behavior text shows the previous behavior",
        "The history shows the change as undone"
      ]
    }
  },
  "businessHash": "sha256:22fb293ddb3bb62c0de227a12c65fa13971ffeb6eaf0a59f537c839621006bed"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type UndoBehaviorChangeJourneyType = typeof undoBehaviorChangeJourney;

export default undoBehaviorChangeJourney;
