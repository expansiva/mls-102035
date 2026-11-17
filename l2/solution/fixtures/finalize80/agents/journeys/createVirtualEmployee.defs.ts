/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/createVirtualEmployee.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const createVirtualEmployeeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "createVirtualEmployee",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Create a virtual employee",
    "goal": "Describe a new agent and its functions in a prompt so the cm prepares a draft.",
    "icon": "sparkles",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "openAgentList",
        "kind": "locate",
        "entity": "Agent",
        "title": "Open agent list",
        "description": "The admin opens the first screen with the agents and drafts and chooses to create a new virtual employee.",
        "icon": "list"
      },
      {
        "stepId": "describeAgent",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "create",
        "title": "Describe the new agent",
        "description": "The admin writes a prompt describing the new agent and its functions and sends it so the cm prepares a draft.",
        "icon": "pencil"
      },
      {
        "stepId": "followDraftSituation",
        "kind": "inspect",
        "entity": "AgentDraft",
        "title": "Follow draft situation",
        "description": "The admin sees the draft on the list as preparing until the cm says it is ready or refused with a reason.",
        "icon": "hourglass"
      }
    ],
    "outcome": {
      "statement": "A draft for the new virtual employee exists and is being prepared by the cm.",
      "evidence": [
        "The draft appears on the agent list with the situation preparing",
        "The prompt the admin wrote is kept with the draft"
      ]
    }
  },
  "businessHash": "sha256:ea38fe6bc5952f953dd0d4f4fb293a3a9330e9a700100bbdecd883f9f12ed595"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CreateVirtualEmployeeJourneyType = typeof createVirtualEmployeeJourney;

export default createVirtualEmployeeJourney;
