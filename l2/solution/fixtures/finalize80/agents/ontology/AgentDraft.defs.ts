/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/AgentDraft.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentDraft = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentDraft",
  "title": "Agent draft",
  "description": "A new agent the cm is preparing from the admin's prompt; preparing, ready or refused with a reason, then activated or discarded through the cm.",
  "displayField": "name",
  "relationships": {
    "suggestedTools": {
      "relationshipId": "agentToolOfDraft",
      "to": "AgentTool",
      "via": "AgentTool.draftId",
      "cardinality": "1:N",
      "title": "Suggested tools",
      "description": "The tools of the catalog suggested for this draft, each on or off before activation.",
      "mode": "fk",
      "direction": "to"
    },
    "notices": {
      "relationshipId": "noticeDraft",
      "to": "DraftNotice",
      "via": "DraftNotice.draftId",
      "cardinality": "1:N",
      "title": "Notices from the cm",
      "description": "The notices the cm sent saying this draft is ready or refused.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {},
  "rules": [
    "agentNameUniqueAmongActiveAgents",
    "draftActivateOnlyWhenReady",
    "draftNoticeAppliedOnce",
    "adminToolChoiceKeptOverAutomatic"
  ],
  "kind": "external",
  "connectionId": "cm",
  "record": {
    "fields": {
      "name": {
        "type": "string",
        "title": "Name",
        "description": "The name the cm proposes for the new agent; people will call it in a chat as @name. Empty while the draft is still being prepared."
      },
      "prompt": {
        "type": "text",
        "required": true,
        "title": "Description prompt",
        "description": "What the company admin wrote to describe the new agent and its functions; the cm prepares the draft from it."
      },
      "situation": {
        "type": "enum",
        "required": true,
        "values": [
          {
            "value": "preparing",
            "title": "Preparing"
          },
          {
            "value": "ready",
            "title": "Ready"
          },
          {
            "value": "refused",
            "title": "Refused"
          },
          {
            "value": "activated",
            "title": "Activated"
          },
          {
            "value": "discarded",
            "title": "Discarded"
          }
        ],
        "title": "Situation",
        "description": "Where the draft stands in the cm, as shown on the agent list."
      },
      "refusalReason": {
        "type": "text",
        "title": "Reason for refusal",
        "description": "Why the cm refused to prepare this draft; shown when the draft is refused."
      },
      "summary": {
        "type": "text",
        "title": "What the agent is",
        "description": "The proposed agent's definition in plain language, prepared by the cm."
      },
      "talksTo": {
        "type": "string",
        "title": "Talks to",
        "description": "Who the proposed agent talks to, as the cm describes it."
      },
      "onBehalfOf": {
        "type": "string",
        "title": "Acts on behalf of",
        "description": "On whose behalf the proposed agent acts, as the cm describes it."
      },
      "activationRefusal": {
        "type": "text",
        "title": "Activation refused",
        "description": "The cm's message when activation was refused, for example because the name is already used by another active agent; the screen shows it to the admin."
      },
      "requestedBy": {
        "type": "record",
        "to": [
          "OrganizationMember"
        ],
        "title": "Requested by",
        "description": "The company admin who described the new agent."
      },
      "requestedAt": {
        "type": "timestamp",
        "title": "Requested at",
        "description": "When the admin sent the prompt to the cm."
      },
      "preparedAt": {
        "type": "timestamp",
        "title": "Ready or refused at",
        "description": "When the cm said the draft was ready or refused."
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentDraftType = typeof agentsEntityAgentDraft;

export default agentsEntityAgentDraft;
