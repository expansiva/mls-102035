/// <mls fileReference="_102047_/l4/comandaRestaurante/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteWorkflows = {
  "schemaVersion": "2026-09-12-ns5-workflows-v2",
  "moduleName": "comandaRestaurante",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "abrirComanda",
      "inProcess": false
    },
    {
      "journeyId": "lancarItemNaComanda",
      "inProcess": false
    },
    {
      "journeyId": "cancelarItemLancado",
      "inProcess": false
    },
    {
      "journeyId": "fecharComanda",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type ComandaRestauranteWorkflowsType = typeof comandaRestauranteWorkflows;

export default comandaRestauranteWorkflows;
