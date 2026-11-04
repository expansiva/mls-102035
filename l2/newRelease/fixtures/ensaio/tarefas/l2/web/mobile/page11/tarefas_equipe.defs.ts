/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/tarefas_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/operationsQueue/page21.md",
    "experience": "workQueueSplit"
  },
  "intent": "Em tela estreita, fluida em torno de 390px e utilizável de 360px a 430px, o gestor percorre todas as tarefas filtradas, alterna entre lista e quadro por situação, abre uma tarefa para conferir responsável, prazo e checklist, troca o responsável ou cancela e consulta o histórico.",
  "sections": [
    {
      "id": "filaTarefas",
      "priority": "primary",
      "purpose": "Mostrar as tarefas filtradas em cartões empilhados ou no quadro por situação, com quem age agora e marcas de vence hoje ou atrasada visíveis sem rolagem lateral.",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    {
      "id": "tarefaAberta",
      "priority": "main",
      "purpose": "Mostrar a tarefa escolhida em leitura vertical, com responsável, prazo e progresso da checklist no topo e as ações de trocar responsável ou cancelar logo abaixo.",
      "organisms": [
        "tarefaDetalhe",
        "tarefaAcoes"
      ]
    },
    {
      "id": "historicoTarefa",
      "priority": "secondary",
      "purpose": "Mostrar os eventos da tarefa em ordem de tempo, depois do detalhe, para consulta quando necessário.",
      "organisms": [
        "tarefaHistorico"
      ]
    }
  ],
  "organisms": {
    "tarefasEquipe": {
      "kind": "list",
      "text": "Todas as tarefas filtradas por lista, responsável, prioridade, prazo e situação, em lista compacta ou em quadro por situação, mostrando quem age agora e marcando as que vencem hoje ou estão atrasadas. Lista vazia e erro aparecem separados.",
      "intents": []
    },
    "tarefaDetalhe": {
      "kind": "detail",
      "text": "A tarefa aberta com situação, responsável atual, quem age agora, prazo, criada em, subtarefas e checklist com progresso.",
      "intents": []
    },
    "tarefaAcoes": {
      "kind": "actions",
      "text": "Trocar o responsável escolhendo pelo nome entre quem aceita tarefas, ou cancelar a tarefa aberta após confirmar.",
      "intents": [
        {
          "id": "trocarResponsavel",
          "kind": "submit"
        },
        {
          "id": "cancelarTarefa",
          "kind": "submit"
        }
      ]
    },
    "tarefaHistorico": {
      "kind": "timeline",
      "text": "Histórico da tarefa: criação, execução, revisões, devoluções, trocas de responsável e cancelamento.",
      "intents": []
    }
  },
  "molecules": {
    "tarefasEquipe": [
      {
        "role": "busca por título com filtros",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
      },
      {
        "role": "filtro por situação e prioridade",
        "preferred": "groupselectmany--ml-popover-multi-select",
        "alternative": "groupselectmany--ml-multi-select-dropdown"
      },
      {
        "role": "filtro por lista ou responsável",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "filtro por intervalo de prazo",
        "preferred": "groupenterdateinterval--ml-date-interval-presets",
        "alternative": "groupenterdateinterval--ml-date-interval-drag"
      },
      {
        "role": "alternar entre lista e quadro",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupnavigatesection--ml-navigate-pills"
      },
      {
        "role": "lista de tarefas em tela estreita",
        "preferred": "groupviewtable--ml-responsive-data-table",
        "alternative": "groupviewtable--ml-responsive-table"
      }
    ],
    "tarefaDetalhe": [
      {
        "role": "resumo da tarefa aberta",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      },
      {
        "role": "progresso da checklist",
        "preferred": "groupshowprogress--ml-linear-progress",
        "alternative": "groupshowprogress--ml-circular-progress"
      },
      {
        "role": "itens da checklist",
        "preferred": "groupviewdata--ml-vertical-record-list"
      }
    ],
    "tarefaAcoes": [
      {
        "role": "escolha do novo responsável pelo nome",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "botões de trocar responsável e cancelar",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-kebab-action-trigger"
      },
      {
        "role": "confirmação do cancelamento",
        "preferred": "groupnotifyuser--ml-alert-modal"
      },
      {
        "role": "retorno da ação concluída",
        "preferred": "groupnotifyuser--ml-toast-notification"
      }
    ],
    "tarefaHistorico": [
      {
        "role": "eventos da tarefa em ordem de tempo",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ]
  }
} as const;
