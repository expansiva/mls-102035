/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/Tool.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityTool = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "Tool",
  "title": "Tool",
  "description": "An action of the tool catalog, from the app modules or the cm itself, organized as module / subject / action with a readable name and description. A tool that leaves the release is marked removed and never deleted.",
  "displayField": "name",
  "relationships": {
    "agentChoices": {
      "relationshipId": "agentToolTool",
      "to": "AgentTool",
      "via": "AgentTool.toolId",
      "cardinality": "1:N",
      "title": "Agent choices",
      "description": "The choices of agents (on or off) made about this tool.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "personRestrictions": {
      "relationshipId": "toolRestrictionTool",
      "to": "ToolRestriction",
      "via": "ToolRestriction.toolId",
      "cardinality": "1:N",
      "title": "Person restrictions",
      "description": "The people who may not use this tool through any agent.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads one catalog tool by its id when a choice or restriction needs its name and description; used by the agent and people screens.",
    "locate.byColumn": "Lists tools filtered by module, subject, origin or situation and ordered by name to build the module / subject / action tree; used by the tools scenario, the restriction list and the simulation.",
    "locate.byText": "Finds tools whose readable name contains the typed text, so the admin can search the tree; used by the company admin.",
    "count": "Counts tools by situation, for example how many are available or were removed in the last release; used on the tools scenario header.",
    "create": "Writes a new tool when the catalog rebuild finds an action that is not in the catalog yet, after a module is created or a release arrives; used by the toolCatalogRefresh process.",
    "update": "Updates the readable texts and release marks of a tool on each catalog rebuild; used by the toolCatalogRefresh process.",
    "transition": "Moves a tool to removed when it leaves the release, and back to available when it returns; moved only by the catalog rebuild process, never by a person.",
    "uniqueKey": "Refuses a second tool with the same module, subject and action, so a rebuild running twice does not duplicate the catalog.",
    "transaction": "Writes the changes of one catalog rebuild all or nothing, so the tree never shows a half-rebuilt catalog; used by the toolCatalogRefresh process.",
    "agents.toolTree": "Builds the module / subject / action tree with readable names and descriptions, removed tools marked as removed, grouping the tools by module and subject; used by the tools scenario and the person restriction list."
  },
  "rules": [
    "toolKeyUnique",
    "removedToolNeverDeleted",
    "removedToolCannotBeEnabled",
    "toolCatalogRebuiltOnReleaseOrNewModule"
  ],
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
            "title": "Collab messages (cm)"
          }
        ],
        "title": "Origin",
        "description": "Whether the action comes from an app module or from the cm itself."
      },
      "moduleKey": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Module",
        "description": "Code of the module that offers the action (the cm tools use the cm code). Top level of the module / subject / action tree.",
        "maxLength": 80
      },
      "subjectKey": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Subject",
        "description": "Code of the subject inside the module that the action works on. Middle level of the tree.",
        "maxLength": 80
      },
      "actionKey": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Action",
        "description": "Code of the action inside the subject. Leaf of the tree; it is what an agent turns on or off.",
        "maxLength": 80
      },
      "name": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Name",
        "description": "Readable name of the action, shown in the tools tree, in the people restriction list and in the simulation.",
        "maxLength": 120
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "available",
            "title": "Available"
          },
          {
            "value": "removed",
            "title": "Removed"
          }
        ],
        "title": "Situation in the catalog",
        "description": "Available while the tool is in the current release; removed once a release no longer has it. A removed tool is never deleted, so past choices and restrictions keep their meaning."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Readable texts and release marks of the tool.",
        "fields": {
          "description": {
            "type": "text",
            "required": true,
            "title": "Description",
            "description": "What the action does, in plain language for an ordinary person."
          },
          "moduleTitle": {
            "type": "string",
            "required": true,
            "title": "Module name",
            "description": "Readable name of the module, shown as the first level of the tree.",
            "maxLength": 120
          },
          "subjectTitle": {
            "type": "string",
            "required": true,
            "title": "Subject name",
            "description": "Readable name of the subject, shown as the second level of the tree.",
            "maxLength": 120
          },
          "changesData": {
            "type": "boolean",
            "title": "Changes data",
            "description": "True when the action writes or changes something; false when it only reads. Helps the admin judge the tool when choosing."
          },
          "firstSeenRelease": {
            "type": "string",
            "title": "First release",
            "description": "Release in which the tool first appeared in the catalog.",
            "maxLength": 40
          },
          "lastSeenRelease": {
            "type": "string",
            "title": "Last release seen",
            "description": "Latest release in which the catalog rebuild found the tool.",
            "maxLength": 40
          },
          "removedInRelease": {
            "type": "string",
            "title": "Removed in release",
            "description": "Release that no longer carries the tool; empty while it is available.",
            "maxLength": 40
          },
          "removedAt": {
            "type": "timestamp",
            "title": "Removed at",
            "description": "When the catalog rebuild marked the tool as removed."
          },
          "treePath": {
            "type": "string",
            "derived": true,
            "title": "Path in the tree",
            "description": "Readable path of the tool as module / subject / action, built from the module name, the subject name and the tool name."
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
      "state": "available",
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
        "available"
      ],
      "to": "removed",
      "by": [],
      "description": "The catalog rebuild does not find the tool in the current release and marks it as removed; the row is kept.",
      "payload": [
        "status",
        "details.removedInRelease",
        "details.removedAt"
      ],
      "ruleRefs": [
        "removedToolNeverDeleted",
        "removedToolCannotBeEnabled"
      ]
    },
    {
      "transitionId": "restoreTool",
      "from": [
        "removed"
      ],
      "to": "available",
      "by": [],
      "description": "A later release brings the tool back and the catalog rebuild makes it available again.",
      "payload": [
        "status",
        "details.lastSeenRelease"
      ],
      "ruleRefs": [
        "toolKeyUnique"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityToolType = typeof agentsEntityTool;

export default agentsEntityTool;
