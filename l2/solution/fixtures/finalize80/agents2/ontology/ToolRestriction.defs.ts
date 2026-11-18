/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/ToolRestriction.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityToolRestriction = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "ToolRestriction",
  "title": "Tool restriction",
  "description": "A tool that one person may not use through any agent, marked by the company admin.",
  "displayField": "details.toolName",
  "relationships": {
    "person": {
      "relationshipId": "toolRestrictionPerson",
      "to": "Person",
      "via": "ToolRestriction.personId",
      "cardinality": "N:1",
      "title": "Restricted person",
      "description": "The person who may not use the tool through any agent.",
      "mode": "fk",
      "required": true
    },
    "tool": {
      "relationshipId": "toolRestrictionTool",
      "to": "Tool",
      "via": "ToolRestriction.toolId",
      "cardinality": "N:1",
      "title": "Blocked tool",
      "description": "The catalog tool the person may not use.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "listByForeignKey": "Lists the tools already blocked for the chosen person, by person, so the admin's checkbox list shows them checked; also answers the cm, for the person who called an agent, which tools must be withheld in that request.",
    "locate.byColumn": "Lists restrictions filtered by person or by tool, for the admin's people restrictions screen and for the 'what it can' simulation that explains why a tool cannot be used.",
    "read.byId": "Reads one restriction when its id is known, for the admin screen after a change.",
    "count": "Counts the tools blocked for a person, shown as a total next to the person in the admin list.",
    "create": "Writes a restriction when the company admin checks a tool the person may not use through any agent.",
    "delete": "Removes the restriction when the company admin unchecks the tool for that person.",
    "uniqueKey": "Refuses a second restriction for the same person and tool, by the unique key person + tool, enforced by the engine on write.",
    "transaction": "Saves all the checks and unchecks the admin made for one person in one go, all or nothing.",
    "read.mdmRecord": "Reads the person's name from the master record the person column points at, so the screens never show an id.",
    "agents.blockedToolsForRequest": "Answers the cm, for an agent and the person who called it, the tools that are on for the agent minus the ones this person may not use; runs with no screen open."
  },
  "rules": [
    "oneRestrictionPerPersonAndTool",
    "restrictionAppliesToEveryAgent",
    "blockedToolsWithheldFromRequest",
    "onlyCompanyAdminRestrictsTools",
    "removedToolNeverDeleted"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_toolrestriction",
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
      "personId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Person"
        ],
        "title": "Person",
        "description": "The organization user who may not use this tool through any agent. Picked from the platform user list."
      },
      "toolId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Tool"
        ],
        "title": "Tool",
        "description": "The catalog tool this person may not use through any agent."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "What is kept about the restriction besides the person and the tool.",
        "fields": {
          "markedAt": {
            "type": "timestamp",
            "required": true,
            "derived": true,
            "title": "Marked on",
            "description": "When the company admin checked this tool as blocked for the person; filled by the system."
          },
          "toolName": {
            "type": "string",
            "derived": true,
            "title": "Tool",
            "description": "The readable name of the blocked tool, read from the tool catalog; never typed here."
          },
          "toolRemoved": {
            "type": "boolean",
            "derived": true,
            "title": "Tool removed",
            "description": "True when the blocked tool has left the release and is marked removed in the tool catalog; the restriction is kept."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "personId",
      "toolId"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityToolRestrictionType = typeof agentsEntityToolRestriction;

export default agentsEntityToolRestriction;
