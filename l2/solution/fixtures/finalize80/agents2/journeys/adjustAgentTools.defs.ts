/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/adjustAgentTools.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const adjustAgentToolsJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "adjustAgentTools",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Adjust an agent's tools",
    "goal": "Choose which catalog actions an agent may use",
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
        "description": "The admin opens the agent and its tools scenario.",
        "icon": "search"
      },
      {
        "stepId": "browseToolTree",
        "kind": "inspect",
        "entity": "Tool",
        "title": "Browse the tool tree",
        "description": "The admin browses module / subject / action with readable names and descriptions, removed tools marked as removed.",
        "icon": "folder-tree"
      },
      {
        "stepId": "toggleTools",
        "kind": "act",
        "entity": "AgentTool",
        "effect": "update",
        "title": "Turn tools on or off",
        "description": "The admin checks or unchecks actions for this agent; the admin's choice is kept over any automatic choice.",
        "icon": "square-check"
      }
    ],
    "outcome": {
      "statement": "The agent has exactly the tools the admin turned on.",
      "evidence": [
        "The checkboxes show the admin's choices",
        "Only tools that are on are offered to the cm for this agent"
      ]
    }
  },
  "businessHash": "sha256:314072f8069d2e1f7fbae591e29ff2a334574c064685557a793c92819be3d341"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AdjustAgentToolsJourneyType = typeof adjustAgentToolsJourney;

export default adjustAgentToolsJourney;
