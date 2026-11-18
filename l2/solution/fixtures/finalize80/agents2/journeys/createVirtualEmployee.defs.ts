/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/createVirtualEmployee.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const createVirtualEmployeeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "createVirtualEmployee",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Create a virtual employee",
    "goal": "Describe a new agent and its functions so the cm prepares a draft",
    "icon": "user-plus",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "openAgentList",
        "kind": "locate",
        "entity": "Agent",
        "title": "Open the agents list",
        "description": "The admin opens the first screen with the agents and drafts from the cm.",
        "icon": "list"
      },
      {
        "stepId": "describeAgent",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "create",
        "title": "Describe the new agent",
        "description": "The admin writes in a prompt what the new agent is and its functions, and sends it to the cm to prepare a draft.",
        "icon": "message-square-plus"
      },
      {
        "stepId": "followDraftSituation",
        "kind": "inspect",
        "entity": "AgentDraft",
        "title": "Follow the draft situation",
        "description": "The admin sees the draft card as preparing until the cm says it is ready or refused with the reason.",
        "icon": "hourglass"
      }
    ],
    "outcome": {
      "statement": "A draft of the new virtual employee is requested from the cm and shown in the list.",
      "evidence": [
        "The agents list shows a new draft card in the preparing situation",
        "The draft card later shows ready, or refused with the reason"
      ]
    }
  },
  "businessHash": "sha256:0304c4daa83e4a35101a5770beb88f574286654a16810ff7926caf02f5efe94e"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CreateVirtualEmployeeJourneyType = typeof createVirtualEmployeeJourney;

export default createVirtualEmployeeJourney;
