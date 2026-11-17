/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/adjustAgentTools.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const adjustAgentToolsJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "adjustAgentTools",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Adjust an agent's tools",
    "goal": "Choose which actions an agent may use.",
    "icon": "wrench",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForTools",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent from the list or keeps the agent already open.",
        "icon": "search"
      },
      {
        "stepId": "browseToolTree",
        "kind": "inspect",
        "entity": "AgentTool",
        "title": "Browse tool tree",
        "description": "The admin browses the module / subject / action tree with readable names, descriptions and which actions are on; removed tools are marked as removed.",
        "icon": "folder-tree"
      },
      {
        "stepId": "toggleTools",
        "kind": "act",
        "entity": "AgentTool",
        "effect": "update",
        "title": "Turn tools on or off",
        "description": "The admin checks or unchecks actions for this agent; the automatic choice never changes these admin choices.",
        "icon": "check-square"
      }
    ],
    "outcome": {
      "statement": "The agent has exactly the tools the admin chose turned on.",
      "evidence": [
        "The checked actions show as on for the agent",
        "Only tools that are on are sent to the cm when it asks"
      ]
    }
  },
  "businessHash": "sha256:c31592611a2d430050f4fd126e60eff64cf4bd7dec825723e688a91172f12fd8"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AdjustAgentToolsJourneyType = typeof adjustAgentToolsJourney;

export default adjustAgentToolsJourney;
