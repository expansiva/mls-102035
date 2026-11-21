/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsIntegration = {
  "schemaVersion": "2026-11-17-ns5-integration-v3",
  "moduleName": "agents",
  "inbound": [
    {
      "id": "mdmCreated",
      "kind": "event",
      "from": "organization",
      "event": "mdmCreated",
      "writes": [
        "Person"
      ],
      "effect": "create",
      "description": "A person registered in the organization catalog becomes available in this module, so the admin can choose them for tool restrictions, simulation and responsibility.",
      "entityRefs": []
    },
    {
      "id": "mdmUpdated",
      "kind": "event",
      "from": "organization",
      "event": "mdmUpdated",
      "writes": [
        "Person"
      ],
      "effect": "update",
      "description": "Changes to a person in the organization catalog (name, data) are reflected in the local person record.",
      "entityRefs": []
    },
    {
      "id": "mdmInactivated",
      "kind": "event",
      "from": "organization",
      "event": "mdmInactivated",
      "writes": [
        "Person"
      ],
      "effect": "update",
      "description": "A person inactivated in the organization catalog is marked as inactive here, so they are no longer offered for restrictions or simulation.",
      "entityRefs": []
    }
  ],
  "outbound": [
    {
      "id": "agentDraftActivated",
      "kind": "event",
      "to": "any",
      "event": "agentDraftActivated",
      "on": "AgentDraft.activateDraft",
      "description": "Published when the admin activates a reviewed draft, so other modules know a new virtual employee is in force.",
      "entityRefs": [
        "AgentDraft"
      ]
    },
    {
      "id": "toolMarkedRemoved",
      "kind": "event",
      "to": "any",
      "event": "toolMarkedRemoved",
      "on": "Tool.markRemoved",
      "description": "Published when a tool leaves the release and is marked as removed in the catalog (it is never deleted).",
      "entityRefs": [
        "Tool"
      ]
    }
  ],
  "plugins": [],
  "connections": [
    {
      "connectionId": "cm",
      "operationId": "listAgents",
      "direction": "call",
      "usedBy": [
        "createVirtualEmployee.openAgentList",
        "browseAgents.openAgents",
        "changeAgentBehavior.findAgent",
        "adjustAgentTools.findAgentForTools",
        "configureAgent.findAgentForConfig",
        "reviewAgentActivity.findAgentForActivity",
        "simulateAgentByRole.findAgentToSimulate",
        "simulateAsMyself.findAgentForMe",
        "changeMyConduct.findMyAgent"
      ],
      "entityRefs": [
        "Agent",
        "AgentDraft"
      ],
      "effect": "list",
      "description": "Lists the agents from the cm, drafts included with their situation (preparing, ready or refused)."
    },
    {
      "connectionId": "cm",
      "operationId": "readAgent",
      "direction": "call",
      "usedBy": [
        "browseAgents.readOverview",
        "changeAgentBehavior.readBehavior",
        "configureAgent.readConfiguration",
        "changeMyConduct.readMyConduct"
      ],
      "entityRefs": [
        "Agent"
      ],
      "effect": "read",
      "description": "Reads one agent from the cm: definition, behavior, on/off state, responsible person, limits and version."
    },
    {
      "connectionId": "cm",
      "operationId": "updateAgent",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.requestChange",
        "configureAgent.changeConfiguration",
        "changeMyConduct.requestMyChange"
      ],
      "entityRefs": [
        "Agent",
        "BehaviorChange"
      ],
      "effect": "update",
      "description": "Changes the behavior or the configuration of an agent in the cm (name, on/off, responsible, limits), with the version read and the author."
    },
    {
      "connectionId": "cm",
      "operationId": "listAgentHistory",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.readHistory"
      ],
      "entityRefs": [
        "BehaviorChange"
      ],
      "effect": "list",
      "description": "Lists the changes of an agent with who made them and when, for the history of changes."
    },
    {
      "connectionId": "cm",
      "operationId": "undoAgentChange",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.undoChange",
        "changeMyConduct.undoMyChange"
      ],
      "entityRefs": [
        "BehaviorChange"
      ],
      "effect": "update",
      "description": "Undoes one change of an agent in the cm, using the version that was read."
    },
    {
      "connectionId": "cm",
      "operationId": "simulateAgent",
      "direction": "call",
      "usedBy": [
        "reviewAndActivateDraft.simulateDraft",
        "simulateAgentByRole.simulateWhatItCan",
        "simulateAgentByRole.simulateWhatItUnderstands",
        "simulateAsMyself.seeWhatItCanForMe",
        "simulateAsMyself.seeWhatItUnderstandsForMe"
      ],
      "entityRefs": [
        "AgentSimulation"
      ],
      "effect": "create",
      "description": "Simulates an agent at the levels 'what it can' and 'what it understands'; nothing is saved in the cm."
    },
    {
      "connectionId": "cm",
      "operationId": "createAgent",
      "direction": "call",
      "usedBy": [
        "createVirtualEmployee.describeAgent",
        "reviewRefusedDraft.describeAgain",
        "virtualEmployeeCreation.describeNewAgent"
      ],
      "entityRefs": [
        "AgentDraft"
      ],
      "effect": "create",
      "description": "Asks the cm to create a virtual employee from the admin's prompt; the answer is only the draft id and the result arrives later."
    },
    {
      "connectionId": "cm",
      "operationId": "activateAgent",
      "direction": "call",
      "usedBy": [
        "reviewAndActivateDraft.activateDraft"
      ],
      "entityRefs": [
        "AgentDraft"
      ],
      "effect": "update",
      "description": "Makes the reviewed draft the agent in force."
    },
    {
      "connectionId": "cm",
      "operationId": "discardAgentDraft",
      "direction": "call",
      "usedBy": [
        "reviewAndActivateDraft.discardDraft"
      ],
      "entityRefs": [
        "AgentDraft"
      ],
      "effect": "update",
      "description": "Throws away a draft agent that the admin decided not to use."
    },
    {
      "connectionId": "cm",
      "operationId": "listCmTools",
      "direction": "call",
      "usedBy": [
        "toolCatalogRefresh.rebuildCatalog"
      ],
      "entityRefs": [
        "Tool"
      ],
      "effect": "create",
      "description": "Lists the tools of the cm itself so they enter the tool catalog next to the actions of the app modules."
    },
    {
      "connectionId": "cm",
      "operationId": "runAiPrompt",
      "direction": "call",
      "usedBy": [
        "toolCatalogRefresh.chooseNewToolsPerAgent"
      ],
      "entityRefs": [
        "AgentTool"
      ],
      "effect": "create",
      "description": "Runs a standalone AI prompt that chooses the new tools of a release for each agent from its description, without overriding choices the admin made."
    },
    {
      "connectionId": "cm",
      "operationId": "agentDraftReady",
      "direction": "serve",
      "usedBy": [
        "The cm reports that a draft is ready with suggested tools, or refused with the reason; the notice is applied once and never twice."
      ],
      "entityRefs": [
        "AgentDraft",
        "AgentTool"
      ],
      "effect": "update",
      "description": "Receives the end of the draft preparation: marks the draft ready and records the suggested tools, or marks it refused with the reason."
    },
    {
      "connectionId": "cm",
      "operationId": "describe",
      "direction": "serve",
      "usedBy": [
        "The cm asks which tools an agent has on for the person of the context and which of them that person may use now; only tools that are on are returned."
      ],
      "entityRefs": [
        "Tool",
        "AgentTool",
        "ToolRestriction"
      ],
      "effect": "read",
      "description": "Answers the cm with the tools turned on for the agent, minus those the calling person may not use, so they are unavailable in that request."
    },
    {
      "connectionId": "cm",
      "operationId": "record",
      "direction": "serve",
      "usedBy": [
        "The cm sends the summary of a finished execution; the same execution is never recorded twice."
      ],
      "entityRefs": [
        "ExecutionSummary"
      ],
      "effect": "create",
      "description": "Records the execution summary: when, duration, cost, actions and results, whether a person took over, and the link to the conversation."
    },
    {
      "connectionId": "platform",
      "operationId": "releaseCatalogChanged",
      "direction": "serve",
      "usedBy": [
        "The release routine delivers the catalog of actions of every module; the tool catalog is rebuilt, new tools appear and tools that left the release are marked removed, never deleted."
      ],
      "entityRefs": [
        "Tool"
      ],
      "effect": "update",
      "description": "Receives the release catalog of actions and rebuilds the tool catalog of the module."
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type AgentsIntegrationType = typeof agentsIntegration;

export default agentsIntegration;
