/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsIntegration = {
  "schemaVersion": "2026-11-17-ns5-integration-v3",
  "moduleName": "agents",
  "inbound": [
    {
      "id": "releaseCatalogChanged",
      "kind": "external",
      "from": "platform",
      "writes": [
        "Tool",
        "AgentTool"
      ],
      "effect": "create",
      "description": "The release routine delivers the catalog of actions of every module when a module is created or a new release arrives. New actions become tools in the catalog, and their automatic on or off choice is recorded per agent. A choice the admin made is never changed.",
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
      "description": "When a release catalog (releaseCatalogChanged) no longer contains a tool, the tool is marked removed and never deleted.",
      "entityRefs": []
    },
    {
      "id": "toolBackInRelease",
      "kind": "external",
      "from": "platform",
      "writes": [
        "Tool"
      ],
      "effect": "transition",
      "transitionRef": "restore",
      "description": "When a tool that was marked removed is back in a release catalog (releaseCatalogChanged), it is restored.",
      "entityRefs": []
    },
    {
      "id": "agentDraftReady",
      "kind": "external",
      "from": "cm",
      "writes": [
        "DraftNotice",
        "AgentTool"
      ],
      "effect": "create",
      "description": "The cm says that a draft finished preparing: either ready with the suggested tools from the catalog, which are turned on for the draft, or refused with the reason. The same notice is never applied twice.",
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
      "description": "The cm sends the summary of a finished execution: when, how long, cost, actions and results, whether a person took over, and the link to the conversation. The same execution is never recorded twice.",
      "entityRefs": []
    }
  ],
  "outbound": [
    {
      "id": "toolRemoved",
      "kind": "event",
      "to": "any",
      "event": "toolRemoved",
      "on": "Tool.markRemoved",
      "description": "Announces that a tool left the release and was marked removed, so it is no longer offered to any agent.",
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
        "createVirtualEmployee.followDraftSituation",
        "browseAgents.listAgents",
        "changeAgentBehavior.findAgentForBehavior",
        "undoBehaviorChange.findAgentForUndo",
        "adjustAgentTools.findAgentForTools",
        "configureAgent.findAgentForConfig",
        "simulateAgentByRole.findAgentToSimulate",
        "reviewAgentActivity.findAgentForActivity",
        "simulateAsMyself.findAgentForSelf",
        "changeMyConduct.findMyAgent"
      ],
      "entityRefs": [
        "Agent",
        "AgentDraft"
      ],
      "effect": "list",
      "description": "Lists the agents of the organization from the cm, with the drafts and their situation (preparing, ready or refused with the reason)."
    },
    {
      "connectionId": "cm",
      "operationId": "readAgent",
      "direction": "call",
      "usedBy": [
        "browseAgents.readOverview",
        "changeAgentBehavior.readBehavior",
        "configureAgent.readConfiguration",
        "reviewAndActivateDraft.openReadyDraft",
        "reviewAndActivateDraft.reviewDraft",
        "changeMyConduct.readMyConduct"
      ],
      "entityRefs": [
        "Agent"
      ],
      "effect": "read",
      "description": "Reads an agent from the cm: what it is, its behavior, whether it is on, who is responsible, its limits and its version."
    },
    {
      "connectionId": "cm",
      "operationId": "updateAgent",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.requestBehaviorChange",
        "configureAgent.updateConfiguration",
        "changeMyConduct.requestConductChange"
      ],
      "entityRefs": [
        "Agent",
        "BehaviorChange",
        "MemberConduct"
      ],
      "effect": "update",
      "description": "Changes an agent through the cm: its behavior from a prompt, on or off, the responsible person and limits, or a member's own conduct with the agent. A name already used by another active agent is refused and the screen says so."
    },
    {
      "connectionId": "cm",
      "operationId": "listAgentHistory",
      "direction": "call",
      "usedBy": [
        "undoBehaviorChange.reviewHistory"
      ],
      "entityRefs": [
        "BehaviorChange"
      ],
      "effect": "list",
      "description": "Lists the history of changes of an agent with who, when and a one-line summary."
    },
    {
      "connectionId": "cm",
      "operationId": "undoAgentChange",
      "direction": "call",
      "usedBy": [
        "undoBehaviorChange.undoChange"
      ],
      "entityRefs": [
        "BehaviorChange"
      ],
      "effect": "update",
      "description": "Undoes one change of an agent, with the version that was read."
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
      "description": "Simulates an agent at the levels what it can (for a person or role) and what it understands (for a sentence); nothing is saved in the cm."
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
      "description": "Sends the admin's prompt describing the new virtual employee to the cm; only the draft is returned now, the result comes later."
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
      "description": "Throws away a draft agent."
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
      "effect": "update",
      "description": "Lists the tools of the cm itself so they enter the tool catalog shown in the tree."
    },
    {
      "connectionId": "cm",
      "operationId": "runAiPrompt",
      "direction": "call",
      "usedBy": [
        "adjustAgentTools.toggleTools"
      ],
      "entityRefs": [
        "AgentTool"
      ],
      "effect": "update",
      "description": "Chooses, from each agent's description, which new tools of a release are turned on automatically; choices made by the admin are kept."
    },
    {
      "connectionId": "cm",
      "operationId": "agentDraftReady",
      "direction": "serve",
      "usedBy": [
        "Records the draft notice (ready with suggested tools, or refused with the reason) once, and turns on the suggested tools for the draft."
      ],
      "entityRefs": [
        "DraftNotice",
        "AgentTool"
      ],
      "effect": "create",
      "description": "The cm tells this module that a draft is ready or refused; handled by inbound agentDraftReady."
    },
    {
      "connectionId": "cm",
      "operationId": "describe",
      "direction": "serve",
      "usedBy": [
        "Answers, for an agent and a person, which tools the agent has on and which of them that person may use now; only tools that are on are sent."
      ],
      "entityRefs": [
        "Tool",
        "AgentTool",
        "PersonToolRestriction"
      ],
      "effect": "read",
      "description": "The cm asks which tools an agent has for the person of the context; tools the person may not use are left out of the allowed ones."
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
      "description": "The cm sends what an agent did in one execution; handled by inbound executionRecorded."
    },
    {
      "connectionId": "platform",
      "operationId": "releaseCatalogChanged",
      "direction": "serve",
      "usedBy": [
        "Rebuilds the tool catalog from the actions of every module of the release, marking tools that left as removed."
      ],
      "entityRefs": [
        "Tool"
      ],
      "effect": "update",
      "description": "The release routine delivers the catalog of actions; handled by inbound releaseCatalogChanged, toolLeftRelease and toolBackInRelease."
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type AgentsIntegrationType = typeof agentsIntegration;

export default agentsIntegration;
