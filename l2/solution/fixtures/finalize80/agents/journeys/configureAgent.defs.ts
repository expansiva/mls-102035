/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/configureAgent.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const configureAgentJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "configureAgent",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Configure an agent",
    "goal": "Turn an agent on or off and set its responsible person.",
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
        "description": "The admin opens the agent from the list or keeps the agent already open.",
        "icon": "search"
      },
      {
        "stepId": "readConfiguration",
        "kind": "inspect",
        "entity": "Agent",
        "title": "Read configuration",
        "description": "The admin sees whether the agent is on, the responsible person and the limits as the cm lists them.",
        "icon": "eye"
      },
      {
        "stepId": "updateConfiguration",
        "kind": "act",
        "entity": "Agent",
        "effect": "update",
        "title": "Change on/off and responsible",
        "description": "The admin turns the agent on or off and picks the responsible person from the organization users, and the cm applies it.",
        "icon": "toggle-right"
      }
    ],
    "outcome": {
      "statement": "The agent is on or off and has the responsible person the admin chose.",
      "evidence": [
        "The agent card shows the new on/off situation",
        "The card shows the chosen responsible person"
      ]
    }
  },
  "businessHash": "sha256:1c35d5681c1c9ddf80ac123d076d2bea5b37096f46730d9e713d755c7b162f39"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConfigureAgentJourneyType = typeof configureAgentJourney;

export default configureAgentJourney;
