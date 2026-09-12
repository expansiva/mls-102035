/// <mls fileReference="_102047_/l4/mensalidadesAcademia/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaWorkflows = {
  "schemaVersion": "2026-09-12-ns5-workflows-v2",
  "moduleName": "mensalidadesAcademia",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarPlano",
      "inProcess": false
    },
    {
      "journeyId": "atualizarPlano",
      "inProcess": false
    },
    {
      "journeyId": "matricularAluno",
      "inProcess": false
    },
    {
      "journeyId": "gerarMensalidadesDoMes",
      "inProcess": false
    },
    {
      "journeyId": "registrarPagamentoMensalidade",
      "inProcess": false
    },
    {
      "journeyId": "acompanharPainelMensal",
      "inProcess": false
    },
    {
      "journeyId": "cancelarPropriaMatricula",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type MensalidadesAcademiaWorkflowsType = typeof mensalidadesAcademiaWorkflows;

export default mensalidadesAcademiaWorkflows;
