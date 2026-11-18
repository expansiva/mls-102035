/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/changeMyConduct.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const changeMyConductJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "changeMyConduct",
  "business": {
    "actorRef": "organizationMember",
    "title": "Change my agent's conduct",
    "goal": "Adjust how an agent acting on my behalf behaves with me",
    "icon": "user-cog",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findMyAgent",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find my agent",
        "description": "The member opens an agent that acts on their behalf.",
        "icon": "search"
      },
      {
        "stepId": "readMyConduct",
        "kind": "inspect",
        "entity": "Agent",
        "title": "Read my conduct",
        "description": "The member reads how the agent currently behaves on their behalf.",
        "icon": "book-open"
      },
      {
        "stepId": "requestMyChange",
        "kind": "act",
        "entity": "BehaviorChange",
        "effect": "create",
        "title": "Say what to change",
        "description": "The member writes what to change in their own conduct and the cm applies it only for them.",
        "icon": "message-square"
      },
      {
        "stepId": "undoMyChange",
        "kind": "act",
        "entity": "BehaviorChange",
        "effect": "transition",
        "transitionRef": "undoChange",
        "title": "Undo my change",
        "description": "The member undoes one of their own previous changes.",
        "icon": "undo-2"
      }
    ],
    "outcome": {
      "statement": "The agent acts on the member's behalf as the member asked.",
      "evidence": [
        "The member's conduct shows the new text",
        "The history shows the member's change with when and summary"
      ]
    }
  },
  "businessHash": "sha256:3be2ede01d4f1e6b41fcfd5f914ce5bf3b4dd0770a89827d6d6e2225ba11e547"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ChangeMyConductJourneyType = typeof changeMyConductJourney;

export default changeMyConductJourney;
