/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/journeys/reviewRefusedDraft.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reviewRefusedDraftJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reviewRefusedDraft",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Understand a refused draft",
    "goal": "See why the cm refused a draft and describe it again",
    "icon": "circle-x",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "openRefusedDraft",
        "kind": "locate",
        "entity": "AgentDraft",
        "title": "Open the refused draft",
        "description": "The admin opens the draft the cm announced as refused.",
        "icon": "bell"
      },
      {
        "stepId": "readRefusalReason",
        "kind": "inspect",
        "entity": "AgentDraft",
        "title": "Read the refusal reason",
        "description": "The admin reads the reason the cm gave for refusing the draft.",
        "icon": "info"
      },
      {
        "stepId": "describeAgain",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "create",
        "title": "Describe the agent again",
        "description": "The admin writes a corrected prompt and sends it to the cm for a new draft.",
        "icon": "refresh-cw"
      }
    ],
    "outcome": {
      "statement": "The admin knows why the draft was refused and a new draft is requested.",
      "evidence": [
        "The refused card shows its reason",
        "A new draft card appears as preparing"
      ]
    }
  },
  "businessHash": "sha256:7b165386cb482ee2d36afc71b69cc7ea1776dbdb4bd49af4abe8f5beffbd9fcc"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReviewRefusedDraftJourneyType = typeof reviewRefusedDraftJourney;

export default reviewRefusedDraftJourney;
