/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/painel_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/dashboardCommandCenter/page21.md",
    "experience": "exceptionTriage"
  },
  "intent": "Dar ao gestor, logo ao abrir, uma visão de toda a organização: quantas tarefas estão abertas, quantas vencem hoje, quantas estão atrasadas e quantas foram devolvidas e ainda não foram retomadas. Ao lado, mostrar como as tarefas abertas se distribuem pelas listas e como andam as checklists, para ele saber onde agir primeiro.",
  "sections": [
    {
      "id": "secaoIndicadores",
      "priority": "primary",
      "purpose": "Mostrar em destaque os quatro números que indicam a situação geral das tarefas da organização e chamam a atenção para prazos e devoluções pendentes.",
      "organisms": [
        "indicadoresTarefas"
      ]
    },
    {
      "id": "secaoListas",
      "priority": "main",
      "purpose": "Mostrar quantas tarefas abertas tem cada lista (projeto ou área) e o progresso das checklists, para identificar onde o trabalho está acumulado ou parado.",
      "organisms": [
        "tarefasPorLista"
      ]
    }
  ],
  "organisms": {
    "indicadoresTarefas": {
      "kind": "highlights",
      "text": "Total de tarefas abertas na organização e, em destaque, quantas vencem hoje, quantas estão atrasadas e quantas foram devolvidas e aguardam o responsável retomar. Assim o gestor vê de imediato o que exige acompanhamento.",
      "intents": [
        {
          "id": "verTodasTarefas",
          "kind": "navigate",
          "to": "tarefas_equipe"
        }
      ]
    },
    "tarefasPorLista": {
      "kind": "summary",
      "text": "Tarefas abertas agrupadas por lista, com a quantidade de cada uma e o progresso das checklists (itens concluídos sobre o total), para comparar o andamento entre projetos e áreas.",
      "intents": [
        {
          "id": "abrirListas",
          "kind": "navigate",
          "to": "listas_tarefas"
        },
        {
          "id": "verTarefasDaLista",
          "kind": "navigate",
          "to": "tarefas_equipe"
        }
      ]
    }
  },
  "molecules": {
    "indicadoresTarefas": [
      {
        "role": "indicador de contagem de tarefas",
        "preferred": "groupviewmetric--ml-metric-card",
        "alternative": "groupviewmetric--ml-metric-big-number"
      }
    ],
    "tarefasPorLista": [
      {
        "role": "tarefas abertas agrupadas por lista",
        "preferred": "groupviewtable--ml-grouping-table",
        "alternative": "groupviewtable--ml-data-table"
      },
      {
        "role": "progresso da checklist",
        "preferred": "groupshowprogress--ml-linear-progress",
        "alternative": "groupshowprogress--ml-circular-progress"
      }
    ]
  }
} as const;
