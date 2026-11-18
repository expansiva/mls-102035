/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/reviewAndActivateDraft.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reviewAndActivateDraftJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reviewAndActivateDraft",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Review and activate a draft",
    "goal": "Review a ready draft, adjust its tools, simulate it and activate or discard it",
    "icon": "clipboard-check",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "openReadyDraft",
        "kind": "locate",
        "entity": "AgentDraft",
        "title": "Open the ready draft",
        "description": "The admin opens the draft the cm announced as ready.",
        "icon": "bell"
      },
      {
        "stepId": "reviewDraft",
        "kind": "inspect",
        "entity": "AgentDraft",
        "title": "Review the draft",
        "description": "The admin reads the proposed name, behavior, who it talks to and the suggested tools from the catalog.",
        "icon": "file-search"
      },
      {
        "stepId": "adjustDraftTools",
        "kind": "act",
        "entity": "AgentTool",
        "effect": "update",
        "title": "Adjust the draft tools",
        "description": "The admin turns suggested tools on or off in the module / subject / action tree; these choices are never changed by the automatic choice.",
        "icon": "wrench"
      },
      {
        "stepId": "simulateDraft",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "Simulate the draft",
        "description": "The admin checks what the draft can do for a person or role and what it understands from a sample sentence.",
        "icon": "flask-conical"
      },
      {
        "stepId": "chooseActivateOrDiscard",
        "kind": "decide",
        "entity": "AgentDraft",
        "title": "Activate or discard",
        "description": "The admin chooses whether the draft becomes an active agent or is discarded.",
        "icon": "split"
      },
      {
        "stepId": "activateDraft",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "transition",
        "transitionRef": "activateDraft",
        "title": "Activate the agent",
        "description": "The admin activates the draft through the cm; if the name is already used by another active agent, the screen says so.",
        "icon": "power",
        "decisionRef": "chooseActivateOrDiscard"
      },
      {
        "stepId": "discardDraft",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "transition",
        "transitionRef": "discardDraft",
        "title": "Discard the draft",
        "description": "The admin discards the draft through the cm.",
        "icon": "trash-2",
        "decisionRef": "chooseActivateOrDiscard"
      }
    ],
    "outcome": {
      "statement": "The draft is either an active agent with its chosen tools or discarded.",
      "evidence": [
        "The agents list shows the agent as on, or the draft no longer appears",
        "The agent tools show the admin's choices"
      ]
    }
  },
  "businessHash": "sha256:fb173187b12f14a8cddf0ee3d36f11f548ed4636ae56139005a191bb58cd396a"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReviewAndActivateDraftJourneyType = typeof reviewAndActivateDraftJourney;

export default reviewAndActivateDraftJourney;
