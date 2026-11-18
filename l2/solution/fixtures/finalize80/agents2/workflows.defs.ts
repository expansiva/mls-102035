/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "agents",
  "processes": [
    {
      "processId": "virtualEmployeeCreation",
      "title": "Create a virtual employee",
      "description": "The company admin describes a new agent, the cm prepares a draft or refuses it, and the admin activates, discards or describes it again.",
      "trigger": {
        "kind": "manual",
        "actorRef": "companyAdmin"
      },
      "tasks": [
        {
          "taskId": "describeNewAgent",
          "kind": "human",
          "actorRef": "companyAdmin",
          "journeyRef": "createVirtualEmployee",
          "next": [
            "waitDraftPreparation"
          ],
          "description": "The admin describes the new agent and its functions and sends the prompt to the cm to prepare a draft.",
          "icon": "user-plus"
        },
        {
          "taskId": "waitDraftPreparation",
          "kind": "wait",
          "next": [
            "applyDraftNotice"
          ],
          "description": "The process waits until the cm says the draft is ready with suggested tools or refused with a reason.",
          "icon": "hourglass",
          "wake": {
            "mode": "none"
          }
        },
        {
          "taskId": "applyDraftNotice",
          "kind": "mechanical",
          "entityRef": "AgentDraft",
          "effect": "update",
          "next": [
            "reviewReadyDraft",
            "understandRefusal"
          ],
          "description": "The cm notice is applied once to the draft, marking it ready with its suggested tools or refused with the reason.",
          "icon": "inbox"
        },
        {
          "taskId": "reviewReadyDraft",
          "kind": "human",
          "actorRef": "companyAdmin",
          "journeyRef": "reviewAndActivateDraft",
          "next": [],
          "description": "The admin reviews the ready draft, adjusts its tools, simulates it and activates or discards it.",
          "icon": "badge-check"
        },
        {
          "taskId": "understandRefusal",
          "kind": "human",
          "actorRef": "companyAdmin",
          "journeyRef": "reviewRefusedDraft",
          "next": [
            "waitDraftPreparation"
          ],
          "description": "The admin reads why the cm refused the draft and sends a corrected description for a new draft.",
          "icon": "circle-x"
        }
      ],
      "room": "person",
      "functions": [
        {
          "functionId": "startVirtualEmployee",
          "description": "Called by the screen or by the cm on behalf of the admin who wrote in a channel; validates the caller is a company admin and the prompt is not empty, sends the prompt to the cm to prepare a draft, asks the cm for the origin message and the Task referencing the draft, and returns the draft in preparing; a repeated call with the same request returns the same draft."
        },
        {
          "functionId": "applyDraftReadyNotice",
          "description": "Called on the cm.agentDraftReady arrival; validates the draft exists and the notice was not applied before, marks the draft ready with the suggested catalog tools turned on for it or refused with the reason, passes the turn to the review or refusal stage and asks the cm to notify the admin; a repeated notice changes nothing and returns the current situation."
        },
        {
          "functionId": "advanceDraftDecision",
          "description": "Called by the screen or the cm for the admin; validates the draft is ready, activates it through the cm or discards it, reports a name already used by another active agent without advancing, records the progress, closes the occurrence and asks the cm to notify; repeating an applied decision returns the same result."
        },
        {
          "functionId": "resolveDraftOwner",
          "description": "Called by the cm when it needs the person of a stage; returns the company admin who described the draft, or any company admin when that person is no longer admin."
        }
      ]
    },
    {
      "processId": "toolCatalogRefresh",
      "title": "Refresh the tool catalog",
      "description": "When a new release or module arrives, the catalog is rebuilt, new tools are chosen per agent from its description and the admin adjusts them.",
      "trigger": {
        "kind": "event",
        "event": "platform.releaseCatalogChanged"
      },
      "tasks": [
        {
          "taskId": "rebuildCatalog",
          "kind": "mechanical",
          "entityRef": "Tool",
          "effect": "update",
          "next": [
            "chooseNewToolsPerAgent"
          ],
          "description": "The catalog is rebuilt from the release, adding new actions and marking as removed the ones that left, never deleting them.",
          "icon": "library"
        },
        {
          "taskId": "chooseNewToolsPerAgent",
          "kind": "llm",
          "entityRef": "AgentTool",
          "effect": "update",
          "next": [
            "adjustNewTools"
          ],
          "description": "For each agent, the new tools are turned on or off from the agent description, never changing a choice the admin made.",
          "icon": "sparkles"
        },
        {
          "taskId": "adjustNewTools",
          "kind": "human",
          "actorRef": "companyAdmin",
          "journeyRef": "adjustAgentTools",
          "next": [],
          "description": "The admin reviews the automatic choice of new tools and adjusts them per agent.",
          "icon": "sliders-horizontal"
        }
      ],
      "room": "group",
      "functions": [
        {
          "functionId": "startCatalogRefresh",
          "description": "Called on the platform.releaseCatalogChanged arrival; validates the release catalog, upserts the tools and marks removed the ones absent, asks the cm for the origin message and the Task, and returns the counts of new and removed tools; the same release delivered again opens no new occurrence."
        },
        {
          "functionId": "chooseToolsForAgents",
          "description": "Called by the cm to run the automatic stage; for each agent, chooses new tools from its description without touching admin choices, records the progress, passes the turn to the admin stage and asks the cm to notify the admins; repeating it keeps the same choices."
        },
        {
          "functionId": "completeToolAdjustment",
          "description": "Called by the screen or the cm for the admin; validates the caller is a company admin, records that the new tools were reviewed, closes the occurrence and returns it; a repeated call returns the closed occurrence."
        },
        {
          "functionId": "resolveCatalogReviewers",
          "description": "Called by the cm to know the people of the admin stage; returns the company admins of the organization."
        }
      ]
    },
    {
      "processId": "executionRecording",
      "title": "Record an agent execution",
      "description": "When the cm sends the summary of a finished execution, it is recorded once in the agent activity.",
      "trigger": {
        "kind": "event",
        "event": "cm.record"
      },
      "tasks": [
        {
          "taskId": "recordExecution",
          "kind": "mechanical",
          "entityRef": "ExecutionSummary",
          "effect": "create",
          "next": [],
          "description": "The execution summary is recorded with when, how long, cost, actions and results, takeover and conversation link, never twice.",
          "icon": "history"
        }
      ],
      "room": "exclusive",
      "functions": [
        {
          "functionId": "recordExecutionSummary",
          "description": "Called on the cm.record arrival; validates the agent and the execution identity, writes the summary when it is new, and returns the recorded summary; a repeated execution returns the existing one without recording again."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "createVirtualEmployee",
      "inProcess": true,
      "processId": "virtualEmployeeCreation"
    },
    {
      "journeyId": "reviewAndActivateDraft",
      "inProcess": true,
      "processId": "virtualEmployeeCreation"
    },
    {
      "journeyId": "reviewRefusedDraft",
      "inProcess": true,
      "processId": "virtualEmployeeCreation"
    },
    {
      "journeyId": "changeAgentBehavior",
      "inProcess": false
    },
    {
      "journeyId": "adjustAgentTools",
      "inProcess": true,
      "processId": "toolCatalogRefresh"
    },
    {
      "journeyId": "configureAgent",
      "inProcess": false
    },
    {
      "journeyId": "reviewAgentActivity",
      "inProcess": false
    },
    {
      "journeyId": "simulateAgentByRole",
      "inProcess": false
    },
    {
      "journeyId": "restrictPersonTools",
      "inProcess": false
    },
    {
      "journeyId": "browseAgents",
      "inProcess": false
    },
    {
      "journeyId": "simulateAsMyself",
      "inProcess": false
    },
    {
      "journeyId": "changeMyConduct",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type AgentsWorkflowsType = typeof agentsWorkflows;

export default agentsWorkflows;
