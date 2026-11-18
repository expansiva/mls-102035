/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/AgentTool.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentTool = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentTool",
  "title": "Agent tool",
  "description": "Whether one tool is on or off for one agent or draft, and whether the choice was made by the admin or by the automatic choice. An admin choice is never changed by the automatic choice.",
  "displayField": "details.toolName",
  "relationships": {
    "agent": {
      "relationshipId": "agentToolAgent",
      "to": "Agent",
      "via": "AgentTool.agentId",
      "cardinality": "N:1",
      "title": "Agent",
      "mode": "fk",
      "required": "when the choice is not for a draft"
    },
    "draft": {
      "relationshipId": "agentToolDraft",
      "to": "AgentDraft",
      "via": "AgentTool.draftId",
      "cardinality": "N:1",
      "title": "Draft",
      "mode": "fk",
      "required": "when the choice is not for an active agent"
    },
    "tool": {
      "relationshipId": "agentToolTool",
      "to": "Tool",
      "via": "AgentTool.toolId",
      "cardinality": "N:1",
      "title": "Tool",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads one tool choice by its id when the admin opens a checkbox detail in the tools tree.",
    "locate.byColumn": "Lists the choices of an agent or draft filtered by on/off and by who chose them, for the tools scenario and the draft review.",
    "listByForeignKey": "Lists all tool choices of one agent or draft, or of one tool across agents, to fill the module / subject / action tree in one query.",
    "count": "Counts how many tools are on for an agent, shown on the tools scenario header.",
    "create": "Writes the suggested tool choices when the cm prepares a draft or when the catalog refresh brings new tools for an agent.",
    "update": "Turns a tool on or off for an agent or draft, by the admin from the tree or by the automatic choice during the catalog refresh, never over an admin choice.",
    "uniqueKey": "Refuses a second choice for the same tool on the same agent or the same draft.",
    "transaction": "Moves all choices of a draft to the active agent at once when the draft is activated.",
    "read.mdmRecord": "Reads the name of the admin who made the choice, shown next to the checkbox.",
    "agents.toolsForAgentAndPerson": "Answers the cm, for an agent and a calling person, which tools are on and not removed and which of them that person may use now, removing the tools restricted for that person; used with no screen open."
  },
  "rules": [
    "adminChoiceNeverOverriddenByAutomatic",
    "agentToolBelongsToAgentOrDraft",
    "onlyEnabledToolsSent",
    "removedToolNeverSent",
    "personRestrictionAppliesOnCall"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_agenttool",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "agentId": {
        "type": "record",
        "indexed": true,
        "to": [
          "Agent"
        ],
        "title": "Agent",
        "description": "The active agent in the cm this tool choice belongs to. Empty while the choice belongs to a draft."
      },
      "draftId": {
        "type": "record",
        "indexed": true,
        "to": [
          "AgentDraft"
        ],
        "title": "Draft",
        "description": "The draft this tool is suggested for, before the agent is activated. Empty once the choice belongs to an active agent."
      },
      "toolId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Tool"
        ],
        "title": "Tool",
        "description": "The catalog action this choice is about."
      },
      "enabled": {
        "type": "boolean",
        "required": true,
        "indexed": true,
        "title": "On",
        "description": "Whether the tool is on for this agent or draft. Only tools that are on are sent to the cm."
      },
      "choiceSource": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "admin",
            "title": "Admin"
          },
          {
            "value": "automatic",
            "title": "Automatic choice"
          }
        ],
        "title": "Chosen by",
        "description": "Whether the current on/off choice was made by the admin or by the automatic choice. An admin choice is never changed by the automatic choice."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Everything about the choice that nobody filters by.",
        "fields": {
          "chosenAt": {
            "type": "timestamp",
            "title": "Chosen on",
            "description": "When the current on/off choice was made, by the admin or by the automatic choice."
          },
          "chosenBy": {
            "type": "record",
            "to": [
              "Person"
            ],
            "title": "Chosen by (person)",
            "description": "The admin who checked or unchecked the tool; empty when the automatic choice made it."
          },
          "automaticReason": {
            "type": "text",
            "title": "Why it was suggested",
            "description": "A short plain-language reason the automatic choice gave when it suggested this tool from the agent description.",
            "maxLength": 500
          },
          "toolName": {
            "type": "string",
            "derived": true,
            "title": "Tool",
            "description": "The readable name of the catalog action this choice is about, read from the tool catalog."
          },
          "toolRemoved": {
            "type": "boolean",
            "derived": true,
            "title": "Removed from the release",
            "description": "True when the catalog tool this choice is about has left the release and is marked removed; such a tool is never sent to the cm even if it is on."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "agentId",
      "toolId"
    ],
    [
      "draftId",
      "toolId"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentToolType = typeof agentsEntityAgentTool;

export default agentsEntityAgentTool;
