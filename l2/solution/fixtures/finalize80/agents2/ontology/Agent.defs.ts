/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/Agent.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgent = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "Agent",
  "title": "Agent",
  "description": "An AI agent (virtual employee) as the cm keeps it: name, definition, behavior, on or off, responsible person, limits, who it talks to and on whose behalf it acts. Read and changed only through the cm.",
  "displayField": "name",
  "relationships": {
    "agentTools": {
      "relationshipId": "agentToolAgent",
      "to": "AgentTool",
      "via": "AgentTool.agentId",
      "cardinality": "1:N",
      "title": "Tools on or off for this agent",
      "description": "The catalog actions turned on or off for this agent in this module.",
      "mode": "fk",
      "direction": "to"
    },
    "executions": {
      "relationshipId": "executionSummaryAgent",
      "to": "ExecutionSummary",
      "via": "ExecutionSummary.agentId",
      "cardinality": "1:N",
      "title": "What the agent did",
      "description": "Execution summaries the cm sent for this agent, newest first.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "drafts": {
      "relationshipId": "agentDraftAgent",
      "to": "AgentDraft",
      "via": "AgentDraft.agentId",
      "cardinality": "1:N",
      "title": "Drafts that became this agent",
      "description": "The draft that was activated and became this agent.",
      "mode": "fk",
      "direction": "to"
    }
  },
  "capabilities": {},
  "rules": [
    "uniqueActiveAgentName",
    "agentChangedOnlyThroughCm"
  ],
  "kind": "external",
  "source": "/_102034_/l4/ontology/connections/cm.defs.ts",
  "record": {
    "fields": {
      "name": {
        "type": "string",
        "required": true,
        "title": "Chat name",
        "description": "The name people use to call the agent in a chat, shown as @name. The agent then acts in its own name. The cm refuses a name that another active agent already uses.",
        "maxLength": 60
      },
      "definition": {
        "type": "text",
        "title": "What the agent is",
        "description": "The agent's definition as the cm keeps it, shown read only in the overview."
      },
      "talksTo": {
        "type": "string",
        "title": "Talks to",
        "description": "Who the agent talks to, as the cm describes it, shown on the card and in the overview."
      },
      "actsOnBehalfOf": {
        "type": "string",
        "title": "Acts on behalf of",
        "description": "On whose behalf the agent acts, as the cm describes it, shown in the overview."
      },
      "behavior": {
        "type": "text",
        "title": "Current behavior",
        "description": "The agent's current behavior in plain language, built by the cm from its role and state texts. Changed only by asking the cm for a change."
      },
      "isOn": {
        "type": "boolean",
        "required": true,
        "title": "On",
        "description": "Whether the agent is on and answers people in the chats."
      },
      "responsiblePerson": {
        "type": "record",
        "to": [
          "Person"
        ],
        "title": "Responsible person",
        "description": "The organization user responsible for the agent, picked from the users list."
      },
      "limits": {
        "type": "object",
        "collection": true,
        "title": "Limits",
        "description": "The agent's limits exactly as the cm lists them; shown, not edited here.",
        "fields": {
          "label": {
            "type": "string",
            "required": true,
            "title": "Limit",
            "description": "Readable name of the limit as the cm gives it."
          },
          "value": {
            "type": "string",
            "title": "Value",
            "description": "The value of the limit as the cm gives it."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentType = typeof agentsEntityAgent;

export default agentsEntityAgent;
