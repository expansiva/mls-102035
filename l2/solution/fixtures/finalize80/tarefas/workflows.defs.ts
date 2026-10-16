/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5Readonly, Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const tarefasWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "tarefas",
  "processes": [
    {
      "processId": "cicloTarefa",
      "title": "Ciclo da tarefa",
      "description": "Abre a tarefa, executa, revisa e, se devolvida, espera o ajuste e volta à execução.",
      "trigger": { "kind": "manual", "actorRef": "membro" },
      "tasks": [
        {
          "taskId": "criarTarefa",
          "kind": "human",
          "actorRef": "membro",
          "journeyRef": "criarTarefa",
          "next": ["executarTarefa"],
          "description": "O membro cria a tarefa e passa a vez para a execução."
        },
        {
          "taskId": "executarTarefa",
          "kind": "human",
          "actorRef": "membro",
          "journeyRef": "executarTarefa",
          "next": ["revisarTarefa"],
          "description": "O membro executa a tarefa e a envia para revisão."
        },
        {
          "taskId": "revisarTarefa",
          "kind": "human",
          "actorRef": "gestor",
          "journeyRef": "revisarTarefa",
          "next": ["aguardarAjuste"],
          "description": "O gestor conclui ou devolve a tarefa."
        },
        {
          "taskId": "aguardarAjuste",
          "kind": "wait",
          "next": ["executarTarefa"],
          "description": "Espera o membro retomar a tarefa devolvida."
        }
      ],
      "functions": [
        {
          "functionId": "iniciarTarefa",
          "description": "A tela do membro chama. Valida título, responsável (pessoa), prazo e lista. Sem ocorrência para o registro, grava a mensagem de origem e a Task e devolve o id da tarefa; com ocorrência, recusa. Repetir a chamada devolve a mesma tarefa e não abre outra."
        },
        {
          "functionId": "avancarEtapa",
          "description": "A tela da etapa corrente chama. Valida que a Task está com quem chama e aplica a transição da etapa, marca a etapa e passa a vez, avisando o próximo. Devolve a etapa nova. Repetir não aplica a transição de novo e devolve a etapa já gravada."
        },
        {
          "functionId": "reatribuirTarefa",
          "description": "A tela do gestor chama. Valida a pessoa destino e grava o responsável, avisando quem saiu e quem entrou. Devolve o responsável novo. Repetir com a mesma pessoa não grava de novo."
        },
        {
          "functionId": "cancelarTarefa",
          "description": "A tela do membro ou do gestor chama. Valida que a tarefa não está concluída, aplica o cancelamento, encerra a Task e avisa o responsável. Devolve a situação cancelada. Repetir devolve a mesma situação e não avisa de novo."
        }
      ]
    },
    {
      "processId": "avisarPrazos",
      "title": "Avisar prazos",
      "description": "Todo dia lista as tarefas vencidas e avisa o gestor.",
      "trigger": { "kind": "scheduled", "schedule": "todo dia, no início do expediente" },
      "tasks": [
        {
          "taskId": "alertarPrazos",
          "kind": "alert",
          "actorRef": "gestor",
          "next": [],
          "description": "O gestor vê as tarefas cujo prazo já passou e ainda não estão concluídas nem canceladas."
        }
      ],
      "functions": [
        {
          "functionId": "listarVencimentos",
          "description": "O agendamento chama. Valida a data de hoje, não grava, e avisa o gestor com a lista de tarefas vencidas em aberto. Devolve essa lista. Repetir no mesmo dia devolve a mesma lista e não manda outro aviso."
        }
      ]
    }
  ],
  "journeyDecisions": [
    { "journeyId": "criarTarefa", "inProcess": true, "processId": "cicloTarefa" },
    { "journeyId": "executarTarefa", "inProcess": true, "processId": "cicloTarefa" },
    { "journeyId": "revisarTarefa", "inProcess": true, "processId": "cicloTarefa" },
    { "journeyId": "manterTarefa", "inProcess": false },
    { "journeyId": "gerenciarTarefas", "inProcess": false },
    { "journeyId": "manterListas", "inProcess": false }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export default tarefasWorkflows;
