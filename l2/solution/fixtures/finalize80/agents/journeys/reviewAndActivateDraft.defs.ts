/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/journeys/reviewAndActivateDraft.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reviewAndActivateDraftJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reviewAndActivateDraft",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Review and activate a draft",
    "goal": "Review a ready draft, adjust its tools, simulate it and activate it or discard it.",
    "icon": "bot",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "openReadyDraft",
        "kind": "locate",
        "entity": "AgentDraft",
        "title": "Open ready draft",
        "description": "The admin opens the draft from the notice that it is ready, or finds it on the agent list.",
        "icon": "bell"
      },
      {
        "stepId": "reviewDraft",
        "kind": "inspect",
        "entity": "AgentDraft",
        "title": "Review the draft",
        "description": "The admin reads the proposed agent, its name, who it talks to and the suggested tools from the catalog; a refused draft shows its reason.",
        "icon": "eye"
      },
      {
        "stepId": "adjustDraftTools",
        "kind": "act",
        "entity": "AgentTool",
        "effect": "update",
        "title": "Adjust suggested tools",
        "description": "The admin turns suggested tools on or off in the module / subject / action tree; these choices are kept over the automatic choice.",
        "icon": "wrench"
      },
      {
        "stepId": "simulateDraft",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "Simulate the draft",
        "description": "The admin checks what the draft agent can do for a chosen role and what it understands from a sample sentence.",
        "icon": "play"
      },
      {
        "stepId": "chooseActivateOrDiscard",
        "kind": "decide",
        "entity": "AgentDraft",
        "title": "Activate or discard",
        "description": "The admin decides whether the draft becomes an active agent or is discarded.",
        "icon": "git-branch"
      },
      {
        "stepId": "activateDraft",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "transition",
        "transitionRef": "activate",
        "title": "Activate the agent",
        "description": "The admin activates the draft through the cm; if the name is already used by another active agent the cm refuses and the screen says so.",
        "icon": "check-circle",
        "decisionRef": "chooseActivateOrDiscard"
      },
      {
        "stepId": "discardDraft",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "transition",
        "transitionRef": "discard",
        "title": "Discard the draft",
        "description": "The admin discards the draft and it no longer becomes an agent.",
        "icon": "trash-2",
        "decisionRef": "chooseActivateOrDiscard"
      }
    ],
    "outcome": {
      "statement": "The draft is either an active agent with the chosen tools or discarded.",
      "evidence": [
        "An activated agent appears on the list as on with its responsible person",
        "A discarded draft no longer appears as pending",
        "A refused name is shown with the reason on screen"
      ]
    }
  },
  "businessHash": "sha256:385cce7ca334145b79b8648357494c8d90064a7b9dbb21fbafcc28a7da8a60ce"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReviewAndActivateDraftJourneyType = typeof reviewAndActivateDraftJourney;

export default reviewAndActivateDraftJourney;
