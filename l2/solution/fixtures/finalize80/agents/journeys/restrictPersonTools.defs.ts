/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/restrictPersonTools.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const restrictPersonToolsJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "restrictPersonTools",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Restrict tools for a person",
    "goal": "Mark the tools a person may not use through any agent.",
    "icon": "shield-ban",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "choosePerson",
        "kind": "locate",
        "entity": "PersonToolRestriction",
        "title": "Choose the person",
        "description": "The admin picks the person from the organization users.",
        "icon": "user-search"
      },
      {
        "stepId": "reviewRestrictions",
        "kind": "inspect",
        "entity": "PersonToolRestriction",
        "title": "Review blocked tools",
        "description": "The admin sees the checkbox list of tools and which ones are already blocked for this person.",
        "icon": "list-checks"
      },
      {
        "stepId": "markRestrictions",
        "kind": "act",
        "entity": "PersonToolRestriction",
        "effect": "update",
        "title": "Mark blocked tools",
        "description": "The admin checks or unchecks the tools this person may not use through any agent.",
        "icon": "check-square"
      }
    ],
    "outcome": {
      "statement": "The person cannot use the marked tools through any agent.",
      "evidence": [
        "The marked tools show as blocked for the person",
        "When the person calls an agent, those tools are not available in that request"
      ]
    }
  },
  "businessHash": "sha256:6b6ff51d590b85b39fbc3a8fce5fedee2e4d54b468226e7eadee0f7da540c2be"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RestrictPersonToolsJourneyType = typeof restrictPersonToolsJourney;

export default restrictPersonToolsJourney;
