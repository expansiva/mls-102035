/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/configureAgent.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const configureAgentJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "configureAgent",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Configure an agent",
    "goal": "Set the agent's chat name, on or off and responsible person",
    "icon": "settings",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForConfig",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent's configuration scenario.",
        "icon": "search"
      },
      {
        "stepId": "readConfiguration",
        "kind": "inspect",
        "entity": "Agent",
        "title": "Read configuration",
        "description": "The admin sees the @name, whether it is on, the responsible person and the limits as the cm lists them.",
        "icon": "sliders-horizontal"
      },
      {
        "stepId": "changeConfiguration",
        "kind": "act",
        "entity": "Agent",
        "effect": "update",
        "title": "Change configuration",
        "description": "The admin changes the name, turns the agent on or off or picks the responsible person from the users; the screen says when the cm refuses a name used by another active agent.",
        "icon": "save"
      }
    ],
    "outcome": {
      "statement": "The agent's configuration in the cm reflects the admin's choices.",
      "evidence": [
        "The card shows the new @name, on/off and responsible",
        "A refused name shows a clear message"
      ]
    }
  },
  "businessHash": "sha256:a141fa7c882d835e42da8238a17113aea15636bc711132f0df9e087e0e4e5f82"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConfigureAgentJourneyType = typeof configureAgentJourney;

export default configureAgentJourney;
