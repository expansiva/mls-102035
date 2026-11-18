/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/restrictPersonTools.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const restrictPersonToolsJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "restrictPersonTools",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Restrict tools for a person",
    "goal": "Mark the tools a person may not use through any agent",
    "icon": "user-x",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "choosePerson",
        "kind": "locate",
        "entity": "Person",
        "title": "Choose the person",
        "description": "The admin picks the person from the organization users.",
        "icon": "users"
      },
      {
        "stepId": "viewPersonTools",
        "kind": "inspect",
        "entity": "Tool",
        "title": "See tools list",
        "description": "The admin sees the tools as a checkbox list with the ones already blocked for this person.",
        "icon": "list"
      },
      {
        "stepId": "markBlockedTools",
        "kind": "act",
        "entity": "ToolRestriction",
        "effect": "update",
        "title": "Mark blocked tools",
        "description": "The admin checks the tools this person may not use through any agent.",
        "icon": "ban"
      }
    ],
    "outcome": {
      "statement": "The person cannot use the marked tools through any agent.",
      "evidence": [
        "The person's list shows the blocked tools checked",
        "Simulating for that person shows those tools as not usable"
      ]
    }
  },
  "businessHash": "sha256:a20fb4b31cb42a458814873cd84923a36bcf601bf7abceb259fb36ba6de08e15"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RestrictPersonToolsJourneyType = typeof restrictPersonToolsJourney;

export default restrictPersonToolsJourney;
