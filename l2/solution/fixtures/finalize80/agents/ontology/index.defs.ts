/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "businessDomain": "AI agents of the company: shows and changes the agents kept in the cm (collab messages) and owns the tool catalog, the tools each agent has on, and the tools each person may not use through any agent.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "agents",
    "description": "Branch details.agents of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Agent",
      "kind": "external"
    },
    {
      "entityId": "AgentDraft",
      "kind": "external"
    },
    {
      "entityId": "BehaviorChange",
      "kind": "external"
    },
    {
      "entityId": "MemberConduct",
      "kind": "external"
    },
    {
      "entityId": "AgentSimulation",
      "kind": "external"
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
      "entityId": "PersonToolRestriction",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "AgentExecution",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "DraftNotice",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "OrganizationMember",
      "kind": "role",
      "subtype": "Person"
    }
  ],
  "relationships": [
    {
      "relationshipId": "agentToolOfAgent",
      "from": "AgentTool",
      "to": "Agent",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "The agent for which the tool is on or off.",
      "field": "AgentTool.agentId"
    },
    {
      "relationshipId": "agentToolOfDraft",
      "from": "AgentTool",
      "to": "AgentDraft",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "The draft whose suggested tool is on or off before activation.",
      "field": "AgentTool.draftId"
    },
    {
      "relationshipId": "agentToolTool",
      "from": "AgentTool",
      "to": "Tool",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "The catalog tool that is turned on or off.",
      "field": "AgentTool.toolId"
    },
    {
      "relationshipId": "restrictionPerson",
      "from": "PersonToolRestriction",
      "to": "OrganizationMember",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "The person who may not use the tool through any agent.",
      "field": "PersonToolRestriction.personId"
    },
    {
      "relationshipId": "restrictionTool",
      "from": "PersonToolRestriction",
      "to": "Tool",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "The tool blocked for the person.",
      "field": "PersonToolRestriction.toolId"
    },
    {
      "relationshipId": "executionAgent",
      "from": "AgentExecution",
      "to": "Agent",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "The agent that performed the execution.",
      "field": "AgentExecution.agentId"
    },
    {
      "relationshipId": "noticeDraft",
      "from": "DraftNotice",
      "to": "AgentDraft",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "The draft the notice is about.",
      "field": "DraftNotice.draftId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type AgentsOntologyIndexType = typeof agentsOntologyIndex;

export default agentsOntologyIndex;
