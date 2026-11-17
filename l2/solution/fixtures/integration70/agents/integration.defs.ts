/// <mls fileReference="_102035_/l2/solution/fixtures/integration70/agents/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsIntegration = {
  "schemaVersion": "2026-11-17-ns5-integration-v3",
  "moduleName": "agents",
  "inbound": [
    {
      "id": "draftNoticeReceived",
      "kind": "external",
      "from": "cm",
      "writes": [
        "DraftNotice"
      ],
      "effect": "create",
      "description": "The cm says a draft agent is ready, with its suggested tools, or was refused, with the reason. Each notice is recorded once. If the same notice arrives again, nothing changes. The draft's situation on the list is updated.",
      "entityRefs": []
    },
    {
      "id": "executionRecorded",
      "kind": "external",
      "from": "cm",
      "writes": [
        "AgentExecution"
      ],
      "effect": "create",
      "description": "The cm sends a summary of each finished execution: when it ran, how long it took, the cost, the actions and their results, whether a person took over, and the link to the conversation. An execution that arrives again is not recorded twice.",
      "entityRefs": []
    },
    {
      "id": "releaseCatalogDelivered",
      "kind": "external",
      "from": "platform",
      "writes": [
        "Tool"
      ],
      "effect": "create",
      "description": "When a module is created or a new release arrives, the release routine sends the catalog of actions of every module. The tool catalog is rebuilt: new tools are added and existing ones get their readable names and descriptions updated.",
      "entityRefs": []
    },
    {
      "id": "toolLeftRelease",
      "kind": "external",
      "from": "platform",
      "writes": [
        "Tool"
      ],
      "effect": "transition",
      "transitionRef": "markRemoved",
      "description": "A tool that is no longer in the delivered release catalog is marked as removed. It is never deleted.",
      "entityRefs": []
    }
  ],
  "outbound": [],
  "plugins": [],
  "connections": [
    {
      "connectionId": "cm",
      "operationId": "listAgents",
      "direction": "call",
      "usedBy": [
        "browseAgents.listAgents",
        "createVirtualEmployee.openAgentList",
        "createVirtualEmployee.followDraftSituation",
        "reviewAgentDraft.openDraft",
        "changeAgentBehavior.findAgent",
        "adjustAgentTools.findAgentForTools",
        "configureAgent.findAgentForConfig",
        "reviewAgentActivity.findAgentForActivity",
        "simulateAgentByRole.findAgentToSimulate",
        "simulateAsSelf.findAgentForMe",
        "changeOwnConduct.findMyAgent"
      ],
      "entityRefs": [
        "Agent",
        "AgentDraft"
      ],
      "effect": "list",
      "description": "Lists the organization's agents from the cm, including drafts and their situation: preparing, ready, or refused with the reason."
    },
    {
      "connectionId": "cm",
      "operationId": "readAgent",
      "direction": "call",
      "usedBy": [
        "browseAgents.readOverview",
        "reviewAgentDraft.reviewDraft",
        "changeAgentBehavior.readBehavior",
        "configureAgent.readConfiguration",
        "changeOwnConduct.readMyConduct"
      ],
      "entityRefs": [
        "Agent"
      ],
      "effect": "read",
      "description": "Reads one agent from the cm: what it is, its behavior, whether it is on, who is responsible for it, its limits and its version."
    },
    {
      "connectionId": "cm",
      "operationId": "updateAgent",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.requestChange",
        "configureAgent.updateConfiguration",
        "changeOwnConduct.requestConductChange"
      ],
      "entityRefs": [
        "Agent"
      ],
      "effect": "update",
      "description": "Changes an agent in the cm, either by a request in plain words or by a field: its behavior, its @name, on or off, the responsible person, or the limits. The change is sent with the version that was read and with its author. The cm refuses a name already used by another active agent."
    },
    {
      "connectionId": "cm",
      "operationId": "listAgentHistory",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.reviewHistory"
      ],
      "entityRefs": [
        "BehaviorChange"
      ],
      "effect": "list",
      "description": "Lists an agent's change history, with who made each change, when, and a one-line summary."
    },
    {
      "connectionId": "cm",
      "operationId": "undoAgentChange",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.undoChange"
      ],
      "entityRefs": [
        "Agent"
      ],
      "effect": "update",
      "description": "Undoes one change to an agent in the cm, using the version that was read."
    },
    {
      "connectionId": "cm",
      "operationId": "simulateAgent",
      "direction": "call",
      "usedBy": [
        "reviewAgentDraft.simulateDraft",
        "simulateAgentByRole.simulateWhatItCan",
        "simulateAgentByRole.simulateWhatItUnderstands",
        "simulateAsSelf.seeWhatItCanForMe",
        "simulateAsSelf.seeWhatItUnderstands"
      ],
      "description": "Simulates an agent at two levels. \"What it can\" shows which tools a person or role can or cannot use, and why. \"What it understands\" shows, for a sentence, whether it asks for an action, which path of the tree, and which actions. Nothing is saved."
    },
    {
      "connectionId": "cm",
      "operationId": "createAgent",
      "direction": "call",
      "usedBy": [
        "createVirtualEmployee.describeAgent"
      ],
      "entityRefs": [
        "AgentDraft"
      ],
      "effect": "create",
      "description": "Sends the admin's description of a new virtual employee to the cm. The cm returns only the draft id. The result arrives later as a draft notice."
    },
    {
      "connectionId": "cm",
      "operationId": "activateAgent",
      "direction": "call",
      "usedBy": [
        "reviewAgentDraft.activateDraft"
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
        "reviewAgentDraft.discardDraft"
      ],
      "entityRefs": [
        "AgentDraft"
      ],
      "effect": "update",
      "description": "Discards a draft agent."
    },
    {
      "connectionId": "cm",
      "operationId": "listCmTools",
      "direction": "call",
      "usedBy": [
        "adjustAgentTools.browseToolTree"
      ],
      "entityRefs": [
        "Tool"
      ],
      "effect": "list",
      "description": "Lists the cm's own tools so they appear in the tool catalog alongside the actions of the app modules."
    },
    {
      "connectionId": "cm",
      "operationId": "agentDraftReady",
      "direction": "serve",
      "usedBy": [
        "Records the draft notice (ready with suggested tools, or refused with the reason) once and updates the draft's situation; suggested tools become the draft's tools."
      ],
      "entityRefs": [
        "DraftNotice"
      ],
      "effect": "create",
      "description": "Receives the cm's notice that preparing a draft agent has ended. See inbound draftNoticeReceived."
    },
    {
      "connectionId": "cm",
      "operationId": "describe",
      "direction": "serve",
      "usedBy": [
        "Answers, for an agent and the person of the context, which tools the agent has on and which of those the person may use now; tools that are off are not sent and tools restricted for the person are not available."
      ],
      "entityRefs": [
        "AgentTool",
        "PersonToolRestriction"
      ],
      "effect": "list",
      "description": "Answers the cm with the agent's tools that are on and the ones the person of the context may use now."
    },
    {
      "connectionId": "cm",
      "operationId": "record",
      "direction": "serve",
      "usedBy": [
        "Records the summary of one finished execution of an agent, never twice for the same execution."
      ],
      "entityRefs": [
        "AgentExecution"
      ],
      "effect": "create",
      "description": "Receives what an agent did in one execution. See inbound executionRecorded."
    },
    {
      "connectionId": "platform",
      "operationId": "releaseCatalogChanged",
      "direction": "serve",
      "usedBy": [
        "Rebuilds the tool catalog from the delivered release: adds new tools, updates existing ones, and marks as removed the tools that left the release."
      ],
      "entityRefs": [
        "Tool"
      ],
      "effect": "update",
      "description": "Receives the catalog of actions of every module in the release. See inbound releaseCatalogDelivered and toolLeftRelease."
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type AgentsIntegrationType = typeof agentsIntegration;

export default agentsIntegration;
