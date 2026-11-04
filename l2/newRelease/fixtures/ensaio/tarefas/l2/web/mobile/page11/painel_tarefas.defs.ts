/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/painel_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/dashboardCommandCenter/page21.md",
    "experience": "exceptionTriage"
  },
  "intent": "Mostrar ao gestor, numa tela estreita (por volta de 390px, também usável entre 360px e 430px), os números que importam primeiro: tarefas abertas, que vencem hoje, atrasadas e devolvidas aguardando retomada. Logo abaixo, em leitura vertical, vem o resumo das tarefas abertas por lista com o progresso das checklists.",
  "sections": [
    {
      "id": "secaoIndicadores",
      "priority": "primary",
      "purpose": "Mostrar no topo, em blocos compactos que se reorganizam conforme a largura, os quatro números da situação geral das tarefas da organização.",
      "organisms": [
        "indicadoresTarefas"
      ]
    },
    {
      "id": "secaoListas",
      "priority": "main",
      "purpose": "Mostrar as listas uma abaixo da outra, com a quantidade de tarefas abertas e o progresso das checklists, sem precisar rolar para os lados.",
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
        "preferred": "groupviewmetric--ml-metric-big-number",
        "alternative": "groupviewmetric--ml-metric-card"
      }
    ],
    "tarefasPorLista": [
      {
        "role": "tarefas abertas agrupadas por lista",
        "preferred": "groupviewtable--ml-responsive-table",
        "alternative": "groupviewtable--ml-responsive-data-table"
      },
      {
        "role": "progresso da checklist",
        "preferred": "groupshowprogress--ml-linear-progress",
        "alternative": "groupshowprogress--ml-circular-progress"
      }
    ]
  }
} as const;
