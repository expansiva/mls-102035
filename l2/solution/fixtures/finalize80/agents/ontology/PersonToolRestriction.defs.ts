/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/PersonToolRestriction.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityPersonToolRestriction = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "PersonToolRestriction",
  "title": "Tool blocked for a person",
  "description": "A tool a given person may not use through any agent; removed from the agent's tools whenever that person calls the agent.",
  "displayField": "details.title",
  "relationships": {
    "person": {
      "relationshipId": "restrictionPerson",
      "to": "OrganizationMember",
      "via": "PersonToolRestriction.personId",
      "cardinality": "N:1",
      "title": "Person who may not use the tool",
      "description": "The person who may not use the tool through any agent.",
      "mode": "fk",
      "required": true
    },
    "tool": {
      "relationshipId": "restrictionTool",
      "to": "Tool",
      "via": "PersonToolRestriction.toolId",
      "cardinality": "N:1",
      "title": "Blocked tool",
      "description": "The tool blocked for the person.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads one blocked tool for a person by its id, when the restrictions screen already holds it; used by the company admin.",
    "locate.byColumn": "Lists the tools blocked for a chosen person, filtering by person and ordered by tool, so the admin sees the checkbox list already marked.",
    "listByForeignKey": "Lists all blocks of one person, or of several people at once, so the cm question 'which tools may this person use now' is answered with one query when an agent is called by name.",
    "count": "Counts how many tools are blocked for a person, shown as a badge next to the person on the restrictions screen.",
    "create": "Writes a block when the company admin checks a tool for a person; upsert by person and tool so the same check never makes two rows.",
    "delete": "Removes a block when the company admin unchecks a tool for a person, giving the tool back to that person.",
    "uniqueKey": "Refuses a second block for the same person and the same tool, enforced by the engine on write.",
    "transaction": "Saves all checks and unchecks the admin made for one person all or nothing, so the list is never left half applied.",
    "read.mdmRecord": "Reads the name of the person behind each block from the master record, so the screen never shows a technical id."
  },
  "rules": [
    "restrictionUniquePerPersonTool",
    "restrictedToolUnavailableOnCall",
    "onlyAdminRestrictsTools",
    "restrictionPersonIsOrganizationUser",
    "removedToolNeverDeleted"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_persontoolrestriction",
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
          "OrganizationMember"
        ],
        "title": "Person",
        "description": "The organization user who may not use this tool through any agent. Chosen from the platform user list."
      },
      "toolId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Tool"
        ],
        "title": "Tool",
        "description": "The tool from the catalog that is blocked for this person."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "What the admin recorded when blocking the tool for this person.",
        "fields": {
          "markedBy": {
            "type": "record",
            "to": [
              "OrganizationMember"
            ],
            "title": "Marked by",
            "description": "The company admin who checked this tool as blocked for the person."
          },
          "markedAt": {
            "type": "timestamp",
            "title": "Marked on",
            "description": "When the admin checked this tool as blocked for the person."
          },
          "title": {
            "type": "string",
            "derived": true,
            "title": "Blocked tool",
            "description": "The readable name of the blocked tool followed by the name of the person it is blocked for, read from the tool catalog and the person's record; never a technical id."
          },
          "toolRemoved": {
            "type": "boolean",
            "derived": true,
            "title": "Tool removed from the release",
            "description": "True when the blocked tool has been marked removed in the tool catalog because it left the release; the block is kept but has no effect."
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

export type AgentsEntityPersonToolRestrictionType = typeof agentsEntityPersonToolRestriction;

export default agentsEntityPersonToolRestriction;
