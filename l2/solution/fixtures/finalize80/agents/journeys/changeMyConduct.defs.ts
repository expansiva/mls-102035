/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/changeMyConduct.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const changeMyConductJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "changeMyConduct",
  "business": {
    "actorRef": "organizationMember",
    "title": "Change my conduct with an agent",
    "goal": "Adjust how an agent that acts on my behalf behaves for me.",
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
        "entity": "MemberConduct",
        "title": "Read my conduct",
        "description": "The member reads how the agent currently behaves for them in plain language.",
        "icon": "book-open"
      },
      {
        "stepId": "requestConductChange",
        "kind": "act",
        "entity": "MemberConduct",
        "effect": "update",
        "title": "Describe what to change",
        "description": "The member writes what should change in the agent's conduct with them and the cm applies it only to their own conduct.",
        "icon": "pencil"
      }
    ],
    "outcome": {
      "statement": "The agent behaves for the member as the member asked, without changing it for others.",
      "evidence": [
        "The member's conduct text shows the change",
        "Other people's conduct with the agent is unchanged"
      ]
    }
  },
  "businessHash": "sha256:0c9d6078b996a3cf753e4691a0e48cf26add7641b3c8aaa24fb2a15992a4858a"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ChangeMyConductJourneyType = typeof changeMyConductJourney;

export default changeMyConductJourney;
