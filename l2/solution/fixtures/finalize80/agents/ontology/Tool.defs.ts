/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/Tool.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityTool = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "Tool",
  "title": "Tool",
  "description": "An action of the tool catalog, from an app module or from the cm itself, organized as module / subject / action with a readable name and description. Rebuilt when a module is created or a release arrives; a tool that leaves the release is marked removed and never deleted.",
  "displayField": "title",
  "relationships": {
    "agentTools": {
      "relationshipId": "agentToolTool",
      "to": "AgentTool",
      "via": "AgentTool.toolId",
      "cardinality": "1:N",
      "title": "Agent choices",
      "description": "The per-agent on/off choices made for this catalog tool.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "restrictions": {
      "relationshipId": "restrictionTool",
      "to": "PersonToolRestriction",
      "via": "PersonToolRestriction.toolId",
      "cardinality": "1:N",
      "title": "People restrictions",
      "description": "The people who may not use this tool through any agent.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads one catalog tool by its row id, used by the tool tree, simulation and restriction screens that already hold it.",
    "locate.byColumn": "Lists the catalog by module, subject, origin or situation, ordered and paged, to build the module / subject / action tree for the tools scenario and the restriction checkbox list.",
    "locate.byText": "Searches tools by the readable name typed in a search box, used by the admin on the tools and restriction screens.",
    "count": "Counts tools per module or situation, for badges such as how many tools are available or removed.",
    "listByForeignKey": "Reads many tools at once by the ids held in agent choices and people restrictions, to answer the cm which tools an agent has on and a person may use.",
    "create": "Adds a tool when the catalog rebuild on a new module or release finds an action not yet in the catalog; written by the inbound rebuild, never by a person.",
    "update": "Refreshes name, description and release markers of a tool on each catalog rebuild.",
    "transition": "Moves a tool between available and removed when a release drops or brings it back; the row is never deleted.",
    "uniqueKey": "Refuses a second tool with the same module, subject and action, so a repeated rebuild never duplicates the catalog.",
    "transaction": "Writes the whole catalog rebuild of a release all or nothing, so a half-built catalog is never visible.",
    "agents.suggestFromDescription": "Finds the catalog tools that fit an agent description by their name and description, to suggest tools for a new draft; the admin's own choices are never overwritten."
  },
  "rules": [
    "toolNeverDeleted",
    "toolKeyUnique",
    "removedToolCannotBeTurnedOn",
    "catalogRebuildIdempotent"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_tool",
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
      "source": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "appModule",
            "title": "App module"
          },
          {
            "value": "cm",
            "title": "cm"
          }
        ],
        "title": "Origin",
        "description": "Whether the tool is an action of an app module or a tool of the cm itself."
      },
      "moduleKey": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Module key",
        "description": "Stable key of the module (or of the cm) the action belongs to; first level of the tree. Never shown to people.",
        "maxLength": 120
      },
      "subjectKey": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Subject key",
        "description": "Stable key of the subject inside the module; second level of the tree. Never shown to people.",
        "maxLength": 120
      },
      "actionKey": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Action key",
        "description": "Stable key of the action inside the subject; third level of the tree. Never shown to people.",
        "maxLength": 120
      },
      "title": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Name",
        "description": "Readable name of the action, as shown in the tool tree, the restriction list and the simulation. Searched by text.",
        "maxLength": 200
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "active",
            "title": "Available",
            "description": "The tool is in the current release and can be turned on for agents."
          },
          {
            "value": "removed",
            "title": "Removed",
            "description": "The tool left the release; it stays for history and can no longer be turned on."
          }
        ],
        "title": "Situation in the catalog",
        "description": "Whether the tool is still in the current release. A tool that leaves the release is marked removed and is never deleted."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Everything else about the tool that nobody filters by.",
        "fields": {
          "description": {
            "type": "text",
            "required": true,
            "title": "Description",
            "description": "What the action does, in plain language, shown beside the checkbox and used to suggest tools from an agent description."
          },
          "moduleTitle": {
            "type": "string",
            "required": true,
            "title": "Module name",
            "description": "Readable name of the module, first level of the tree.",
            "maxLength": 200
          },
          "subjectTitle": {
            "type": "string",
            "required": true,
            "title": "Subject name",
            "description": "Readable name of the subject, second level of the tree.",
            "maxLength": 200
          },
          "firstRelease": {
            "type": "string",
            "title": "First release",
            "description": "Release in which the tool first appeared in the catalog.",
            "maxLength": 60
          },
          "lastRelease": {
            "type": "string",
            "title": "Last release seen",
            "description": "Latest release that still carried the tool.",
            "maxLength": 60
          },
          "removedAt": {
            "type": "timestamp",
            "title": "Removed at",
            "description": "When the tool was marked removed after leaving the release; empty while available."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "moduleKey",
      "subjectKey",
      "actionKey"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "active",
      "reachedBy": "command"
    },
    {
      "state": "removed",
      "reachedBy": "command"
    }
  ],
  "transitions": [
    {
      "transitionId": "markRemoved",
      "from": [
        "active"
      ],
      "to": "removed",
      "by": [],
      "description": "The catalog rebuild finds that the tool is no longer in the release and marks it removed, keeping the row.",
      "payload": [
        "details.lastRelease",
        "details.removedAt"
      ],
      "ruleRefs": [
        "toolNeverDeleted"
      ]
    },
    {
      "transitionId": "restore",
      "from": [
        "removed"
      ],
      "to": "active",
      "by": [],
      "description": "The catalog rebuild finds the same tool again in a release and makes it available again.",
      "payload": [
        "details.lastRelease"
      ],
      "ruleRefs": [
        "toolNeverDeleted"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityToolType = typeof agentsEntityTool;

export default agentsEntityTool;
