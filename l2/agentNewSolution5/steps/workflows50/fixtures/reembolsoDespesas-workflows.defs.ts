/// <mls fileReference="_102047_/l4/reembolsoDespesas/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasWorkflows = {
  "schemaVersion": "2026-09-12-ns5-workflows-v2",
  "moduleName": "reembolsoDespesas",
  "processes": [
    {
      "processId": "fluxoReembolsoDespesa",
      "title": "Fluxo de reembolso de despesa",
      "description": "Orquestra o envio, a avaliação, a eventual correção e o pagamento de uma despesa de colaborador.",
      "trigger": {
        "kind": "manual",
        "actorRef": "colaborador"
      },
      "tasks": [
        {
          "taskId": "registrarEEnviar",
          "kind": "human",
          "actorRef": "colaborador",
          "journeyRef": "registrarEenviarDespesa",
          "next": [
            "avaliarDespesa"
          ],
          "description": "O colaborador registra a despesa e a encaminha ao gestor da equipe para aprovação."
        },
        {
          "taskId": "avaliarDespesa",
          "kind": "human",
          "actorRef": "gestorEquipe",
          "journeyRef": "avaliarDespesaDaEquipe",
          "next": [
            "registrarPagamento",
            "corrigirEReenviar"
          ],
          "description": "O gestor avalia a despesa e a encaminha para pagamento quando aprovada ou a devolve ao colaborador quando rejeitada."
        },
        {
          "taskId": "registrarPagamento",
          "kind": "human",
          "actorRef": "financeiro",
          "journeyRef": "registrarPagamentoDespesa",
          "next": [],
          "description": "O financeiro registra a data de pagamento da despesa aprovada."
        },
        {
          "taskId": "corrigirEReenviar",
          "kind": "human",
          "actorRef": "colaborador",
          "journeyRef": "corrigirEreenviarDespesa",
          "next": [
            "aguardarNovaAvaliacao"
          ],
          "description": "O colaborador corrige a despesa rejeitada e a reenvia uma única vez para nova avaliação."
        },
        {
          "taskId": "aguardarNovaAvaliacao",
          "kind": "wait",
          "next": [
            "avaliarDespesa"
          ],
          "description": "Aguarda o reenvio da despesa corrigida para que o gestor realize a nova avaliação."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "registrarEenviarDespesa",
      "inProcess": true,
      "processId": "fluxoReembolsoDespesa"
    },
    {
      "journeyId": "acompanharMinhasDespesas",
      "inProcess": false
    },
    {
      "journeyId": "corrigirEreenviarDespesa",
      "inProcess": true,
      "processId": "fluxoReembolsoDespesa"
    },
    {
      "journeyId": "avaliarDespesaDaEquipe",
      "inProcess": true,
      "processId": "fluxoReembolsoDespesa"
    },
    {
      "journeyId": "registrarPagamentoDespesa",
      "inProcess": true,
      "processId": "fluxoReembolsoDespesa"
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type ReembolsoDespesasWorkflowsType = typeof reembolsoDespesasWorkflows;

export default reembolsoDespesasWorkflows;
