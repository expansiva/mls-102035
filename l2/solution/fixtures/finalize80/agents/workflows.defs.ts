/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "agents",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "createVirtualEmployee",
      "inProcess": false
    },
    {
      "journeyId": "reviewAndActivateDraft",
      "inProcess": false
    },
    {
      "journeyId": "changeAgentBehavior",
      "inProcess": false
    },
    {
      "journeyId": "undoBehaviorChange",
      "inProcess": false
    },
    {
      "journeyId": "adjustAgentTools",
      "inProcess": false
    },
    {
      "journeyId": "configureAgent",
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
      "journeyId": "reviewAgentActivity",
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
