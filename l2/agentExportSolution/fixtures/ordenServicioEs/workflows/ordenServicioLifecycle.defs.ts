/// <mls fileReference="_102035_/l4/ordenServicioEs/workflows/ordenServicioLifecycle.defs.ts" enhancement="_blank"/>

import type { Ns4WorkflowArtifactV2 } from '/_102035_/l2/agentNewSolution/types.js';

export const ordenServicioLifecycleWorkflow = {
  "schemaVersion": "2026-08-11-ns4-workflow-v4",
  "moduleName": "ordenServicioEs",
  "workflowId": "ordenServicioLifecycle",
  "entityRef": "OrdenServicio",
  "initialState": "abierta",
  "terminalStates": ["cerrada"],
  "states": ["abierta", "cerrada"],
  "transitions": [],
  "workflowHash": "sha256:00"
} as const satisfies Ns4WorkflowArtifactV2;

export type OrdenServicioLifecycleWorkflowType = typeof ordenServicioLifecycleWorkflow;

export default ordenServicioLifecycleWorkflow;
