/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/browseAgents.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const browseAgentsJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "browseAgents",
  "business": {
    "actorRef": "organizationMember",
    "title": "See the company's agents",
    "goal": "Know which agents exist, who they talk to and what they did.",
    "icon": "bot",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listAgents",
        "kind": "locate",
        "entity": "Agent",
        "title": "Open agent list",
        "description": "The member opens the list of agents with name, who each talks to, whether it is on and who is responsible.",
        "icon": "list"
      },
      {
        "stepId": "readOverview",
        "kind": "inspect",
        "entity": "Agent",
        "title": "Read agent overview",
        "description": "The member reads what the agent is, who it talks to and on whose behalf it acts.",
        "icon": "eye"
      },
      {
        "stepId": "readAgentActivity",
        "kind": "inspect",
        "entity": "AgentExecution",
        "title": "See what it did",
        "description": "The member reads the agent's activity, newest first.",
        "icon": "activity"
      }
    ],
    "outcome": {
      "statement": "The member knows the agents available and how to call them by name.",
      "evidence": [
        "The agent cards show name, audience, on/off and responsible person",
        "The overview shows on whose behalf the agent acts"
      ]
    }
  },
  "businessHash": "sha256:1da1d592eceef90fc9bf2a0e5dd57cd029eb312198f334d27439b4b92315b566"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type BrowseAgentsJourneyType = typeof browseAgentsJourney;

export default browseAgentsJourney;
