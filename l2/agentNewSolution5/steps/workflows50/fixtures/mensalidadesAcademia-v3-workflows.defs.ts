/// <mls fileReference="_102047_/l4/mensalidadesAcademia/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "mensalidadesAcademia",
  "processes": [
    {
      "processId": "geracaoMensalDeMensalidades",
      "title": "Geração mensal de mensalidades",
      "description": "Lembra a gerência de realizar a geração mensal das mensalidades para alunos com matrícula ativa.",
      "trigger": {
        "kind": "scheduled",
        "schedule": "Todo mês"
      },
      "tasks": [
        {
          "taskId": "alertarGerenciaParaGeracao",
          "kind": "alert",
          "actorRef": "gerencia",
          "next": [],
          "description": "A gerência executa a jornada gerarMensalidadesDoMes para gerar uma mensalidade do mês para cada aluno com matrícula ativa."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarPlano",
      "inProcess": false
    },
    {
      "journeyId": "matricularAluno",
      "inProcess": false
    },
    {
      "journeyId": "gerarMensalidadesDoMes",
      "inProcess": true,
      "processId": "geracaoMensalDeMensalidades"
    },
    {
      "journeyId": "registrarPagamentoMensalidade",
      "inProcess": false
    },
    {
      "journeyId": "acompanharIndicadoresAcademia",
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
