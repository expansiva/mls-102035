/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/Agent.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgent = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "Agent",
  "title": "Agent",
  "description": "An AI agent (virtual employee) as the cm keeps it: definition, behavior, on/off, responsible person, limits and version. Read and changed only through the cm.",
  "displayField": "name",
  "relationships": {
    "tools": {
      "relationshipId": "agentToolOfAgent",
      "to": "AgentTool",
      "via": "AgentTool.agentId",
      "cardinality": "1:N",
      "title": "Tools of the agent",
      "description": "The tools turned on or off for this agent.",
      "mode": "fk",
      "direction": "to"
    },
    "executions": {
      "relationshipId": "executionAgent",
      "to": "AgentExecution",
      "via": "AgentExecution.agentId",
      "cardinality": "1:N",
      "title": "Activity",
      "description": "The finished executions the cm reported for this agent, newest first.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {},
  "rules": [
    "agentNameUniqueAmongActive"
  ],
  "kind": "external",
  "connectionId": "cm",
  "record": {
    "fields": {
      "name": {
        "type": "string",
        "required": true,
        "title": "Name",
        "description": "How people call the agent in a chat (@name). The cm refuses a name another active agent already uses, and the screen says so.",
        "maxLength": 60
      },
      "description": {
        "type": "text",
        "title": "What the agent is",
        "description": "The agent's definition in plain language, as the cm keeps it; shown on the overview."
      },
      "talksTo": {
        "type": "text",
        "title": "Who it talks to",
        "description": "The people or groups the agent talks to, as the cm describes them; shown on the card and the overview."
      },
      "actsOnBehalfOf": {
        "type": "text",
        "title": "On whose behalf it acts",
        "description": "Whose behalf the agent acts on, as the cm describes it; shown on the overview. When called by name, it acts in its own name."
      },
      "behavior": {
        "type": "text",
        "title": "Current behavior",
        "description": "The agent's current behavior (role and state texts) rendered in plain language by the cm; changed only by asking the cm for a behavior change."
      },
      "isOn": {
        "type": "boolean",
        "required": true,
        "title": "On",
        "description": "Whether the agent is on; the admin turns it on or off and the cm applies it."
      },
      "responsible": {
        "type": "record",
        "to": [
          "OrganizationMember"
        ],
        "title": "Responsible person",
        "description": "The organization user responsible for the agent, picked from the platform user list."
      },
      "limits": {
        "type": "object",
        "collection": true,
        "title": "Limits",
        "description": "The agent's limits exactly as the cm lists them; read only here.",
        "fields": {
          "label": {
            "type": "string",
            "required": true,
            "title": "Limit",
            "description": "Readable name of the limit as the cm lists it."
          },
          "value": {
            "type": "string",
            "title": "Value",
            "description": "The current value of the limit as the cm reports it."
          }
        }
      },
      "agentVersion": {
        "type": "integer",
        "title": "Version",
        "description": "The version of the agent's definition the cm currently holds; used to keep changes consistent, never shown as a technical id."
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentType = typeof agentsEntityAgent;

export default agentsEntityAgent;
