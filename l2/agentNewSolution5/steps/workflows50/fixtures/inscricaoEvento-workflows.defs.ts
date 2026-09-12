/// <mls fileReference="_102047_/l4/inscricaoEvento/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoWorkflows = {
  "schemaVersion": "2026-09-12-ns5-workflows-v2",
  "moduleName": "inscricaoEvento",
  "processes": [
    {
      "processId": "promoverPrimeiroListaEspera",
      "title": "Promover participante da lista de espera",
      "description": "Promove automaticamente o primeiro participante elegível da lista de espera quando uma inscrição é cancelada e uma vaga é liberada.",
      "trigger": {
        "kind": "event",
        "event": "Inscricao.cancelarInscricao"
      },
      "tasks": [
        {
          "taskId": "promoverInscricaoEmEspera",
          "kind": "mechanical",
          "entityRef": "Inscricao",
          "effect": "transition",
          "transitionRef": "promoverListaEspera",
          "next": [],
          "description": "Promove o primeiro participante da lista de espera para confirmar sua inscrição quando houver vaga disponível."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarEpublicarEvento",
      "inProcess": false
    },
    {
      "journeyId": "realizarInscricaoPublica",
      "inProcess": false
    },
    {
      "journeyId": "cancelarInscricao",
      "inProcess": false
    },
    {
      "journeyId": "acompanharInscricoesDoEvento",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type InscricaoEventoWorkflowsType = typeof inscricaoEventoWorkflows;

export default inscricaoEventoWorkflows;
