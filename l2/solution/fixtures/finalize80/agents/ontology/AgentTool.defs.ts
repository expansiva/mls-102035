/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/AgentTool.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentTool = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentTool",
  "title": "Agent tool",
  "description": "Whether one tool is on for one agent or draft, and whether that choice was made by the admin (never overridden by the automatic choice) or automatically from the agent description.",
  "displayField": "details.title",
  "relationships": {
    "agent": {
      "relationshipId": "agentToolOfAgent",
      "to": "Agent",
      "via": "AgentTool.agentId",
      "cardinality": "N:1",
      "title": "Agent",
      "mode": "fk",
      "required": "when the choice does not belong to a draft"
    },
    "draft": {
      "relationshipId": "agentToolOfDraft",
      "to": "AgentDraft",
      "via": "AgentTool.draftId",
      "cardinality": "N:1",
      "title": "Draft",
      "mode": "fk",
      "required": "when the choice does not belong to an active agent"
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
    "read.byId": "Reads one tool choice by its id when the admin opens it in the tool tree of an agent or a draft.",
    "locate.byColumn": "Lists the tool choices of an agent or draft filtered by on/off and by who chose them, for the tools scenario and for the review of a draft.",
    "listByForeignKey": "Lists all tool choices of one agent, one draft or one catalog tool at once, to fill the module / subject / action tree without one query per action.",
    "count": "Counts how many tools are on for an agent or a draft, shown on the tools scenario header.",
    "create": "Writes a tool choice when the automatic choice suggests tools for a new draft or a new catalog tool arrives, or when the admin checks an action that had no choice yet.",
    "update": "Turns a tool on or off when the admin checks or unchecks it, marking the choice as made by the admin.",
    "uniqueKey": "Refuses a second choice for the same tool on the same agent or the same draft; the engine enforces it on write.",
    "transaction": "Moves all tool choices of a draft to the agent in one all-or-nothing write when the admin activates the draft.",
    "agents.toolsForAgentAndPerson": "Answers the cm, for an agent and a person, which tools the agent has on and which of them that person may use now, leaving out removed tools and the person's restrictions; works with no screen open.",
    "agents.automaticToolChoice": "Chooses new catalog tools per agent from the agent description after a catalog rebuild, never touching a choice the admin made."
  },
  "rules": [
    "adminChoiceNeverOverridden",
    "belongsToAgentOrDraft",
    "onlyEnabledToolsSent",
    "removedToolNeverSent",
    "oneChoicePerToolAndAgent"
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
        "description": "The agent in the cm for which this tool is on or off. Empty while the choice belongs to a draft that has not been activated yet."
      },
      "draftId": {
        "type": "record",
        "indexed": true,
        "to": [
          "AgentDraft"
        ],
        "title": "Draft",
        "description": "The draft in the cm whose suggested tool is on or off before activation. Empty for the tools of an active agent."
      },
      "toolId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Tool"
        ],
        "title": "Tool",
        "description": "The catalog action (of an app module or of the cm) that is turned on or off."
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
            "title": "The admin"
          },
          {
            "value": "automatic",
            "title": "Automatic, from the agent description"
          }
        ],
        "title": "Chosen by",
        "description": "Who made the current choice: the admin, whose choice the automatic choice never changes, or the automatic choice from the agent description."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "What is shown about this choice and nobody filters by.",
        "fields": {
          "suggestionReason": {
            "type": "text",
            "title": "Why it was suggested",
            "description": "A short plain-language reason the automatic choice gave for turning this tool on or off from the agent description."
          },
          "choiceChangedAt": {
            "type": "timestamp",
            "title": "Last changed",
            "description": "When the tool was last turned on or off for this agent or draft."
          },
          "title": {
            "type": "string",
            "derived": true,
            "title": "Action",
            "description": "The readable name of the catalog tool this choice is about, as shown in the module / subject / action tree."
          },
          "toolRemoved": {
            "type": "boolean",
            "derived": true,
            "title": "Removed from the release",
            "description": "The catalog tool behind this choice has left the release and is marked removed; it is shown as removed and is never sent to the cm."
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
