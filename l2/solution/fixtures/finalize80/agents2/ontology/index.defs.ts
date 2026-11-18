/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "businessDomain": "AI agents (virtual employees) of the company: showing and steering the agents that live in the cm, and owning the catalog of tools, which tools each agent has on and which people may not use a tool",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "agents",
    "description": "Branch details.agents of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Person",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Agent",
      "kind": "external"
    },
    {
      "entityId": "BehaviorChange",
      "kind": "external"
    },
    {
      "entityId": "AgentSimulation",
      "kind": "external"
    },
    {
      "entityId": "AgentDraft",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Tool",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "AgentTool",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "ToolRestriction",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "ExecutionSummary",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "agentToolAgent",
      "from": "AgentTool",
      "to": "Agent",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "The active agent in the cm for which the tool is on or off.",
      "field": "AgentTool.agentId"
    },
    {
      "relationshipId": "agentToolDraft",
      "from": "AgentTool",
      "to": "AgentDraft",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "The draft for which the tool is suggested, on or off, before the agent is activated.",
      "field": "AgentTool.draftId"
    },
    {
      "relationshipId": "agentToolTool",
      "from": "AgentTool",
      "to": "Tool",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "The catalog tool that this choice is about.",
      "field": "AgentTool.toolId"
    },
    {
      "relationshipId": "toolRestrictionPerson",
      "from": "ToolRestriction",
      "to": "Person",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "The person who may not use the tool through any agent.",
      "field": "ToolRestriction.personId"
    },
    {
      "relationshipId": "toolRestrictionTool",
      "from": "ToolRestriction",
      "to": "Tool",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "The catalog tool the person may not use.",
      "field": "ToolRestriction.toolId"
    },
    {
      "relationshipId": "executionSummaryAgent",
      "from": "ExecutionSummary",
      "to": "Agent",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "The agent that ran the execution.",
      "field": "ExecutionSummary.agentId"
    },
    {
      "relationshipId": "agentDraftAgent",
      "from": "AgentDraft",
      "to": "Agent",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "The agent in force that the draft became once activated.",
      "field": "AgentDraft.agentId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type AgentsOntologyIndexType = typeof agentsOntologyIndex;

export default agentsOntologyIndex;
