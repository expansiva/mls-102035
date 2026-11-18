/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/browseAgents.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const browseAgentsJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "browseAgents",
  "business": {
    "actorRef": "organizationMember",
    "title": "See the agents",
    "goal": "Know which agents exist and what each one does",
    "icon": "bot",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "openAgents",
        "kind": "locate",
        "entity": "Agent",
        "title": "Open the agents list",
        "description": "The member sees the agent cards with name, who it talks to, on or off and responsible.",
        "icon": "layout-grid"
      },
      {
        "stepId": "readOverview",
        "kind": "inspect",
        "entity": "Agent",
        "title": "Read the overview",
        "description": "The member reads what the agent is, who it talks to and on whose behalf it acts.",
        "icon": "eye"
      }
    ],
    "outcome": {
      "statement": "The member knows the agents and how to call them.",
      "evidence": [
        "Cards show @name, audience, on/off and responsible",
        "No technical ids are shown"
      ]
    }
  },
  "businessHash": "sha256:3d7aca23c4230ca2a3ceeffcffe05cc895eba0238daa3664ca2ad08e0e69d521"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type BrowseAgentsJourneyType = typeof browseAgentsJourney;

export default browseAgentsJourney;
