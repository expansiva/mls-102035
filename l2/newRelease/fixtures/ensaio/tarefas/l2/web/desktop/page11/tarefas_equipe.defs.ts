/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/tarefas_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/operationsQueue/page21.md",
    "experience": "workQueueSplit"
  },
  "intent": "O gestor acompanha todas as tarefas da equipe, filtra por lista, responsável, prioridade, prazo e situação, alterna entre lista e quadro por situação, abre uma tarefa para conferir responsável, prazo e checklist e, quando preciso, troca o responsável ou cancela a tarefa, vendo o histórico do que aconteceu.",
  "sections": [
    {
      "id": "filaTarefas",
      "priority": "primary",
      "purpose": "Mostrar todas as tarefas da organização com os filtros aplicados, em lista ou em quadro por situação, deixando claro quem age agora em cada uma.",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    {
      "id": "tarefaAberta",
      "priority": "main",
      "purpose": "Mostrar a tarefa escolhida com responsável atual, prazo, criação, subtarefas e progresso da checklist, junto das ações de trocar o responsável ou cancelar.",
      "organisms": [
        "tarefaDetalhe",
        "tarefaAcoes"
      ]
    },
    {
      "id": "historicoTarefa",
      "priority": "secondary",
      "purpose": "Mostrar a sequência de eventos da tarefa para o gestor entender como ela chegou à situação atual.",
      "organisms": [
        "tarefaHistorico"
      ]
    }
  ],
  "organisms": {
    "tarefasEquipe": {
      "kind": "list",
      "text": "Todas as tarefas filtradas por lista, responsável, prioridade, prazo e situação, em lista ou em quadro com colunas a fazer, em andamento, em revisão, concluída e cancelada, mostrando quem age agora e marcando as que vencem hoje ou estão atrasadas. Lista vazia e erro aparecem separados.",
      "intents": []
    },
    "tarefaDetalhe": {
      "kind": "detail",
      "text": "A tarefa aberta com título, situação, prioridade, lista, responsável atual, quem criou, quem age agora, prazo, criada em, quantidade de subtarefas e checklist com itens concluídos e progresso.",
      "intents": []
    },
    "tarefaAcoes": {
      "kind": "actions",
      "text": "Trocar o responsável escolhendo pelo nome entre quem aceita tarefas, ou cancelar a tarefa ainda aberta; quem age agora é avisado da mudança.",
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
      "text": "Histórico da tarefa: criação, execução, envios para revisão, devoluções, retomadas, conclusão, trocas de responsável e cancelamento, em ordem de tempo.",
      "intents": []
    }
  },
  "molecules": {
    "tarefasEquipe": [
      {
        "role": "busca por título e filtros da lista",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-faceted-search"
      },
      {
        "role": "filtro por situação e prioridade",
        "preferred": "groupselectmany--ml-multi-select-dropdown",
        "alternative": "groupselectmany--ml-popover-multi-select"
      },
      {
        "role": "filtro por lista ou responsável",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "filtro por intervalo de prazo",
        "preferred": "groupenterdateinterval--ml-date-interval-presets",
        "alternative": "groupenterdateinterval--ml-date-range-dual-calendar"
      },
      {
        "role": "alternar entre lista e quadro",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupnavigatesection--ml-navigate-pills"
      },
      {
        "role": "visão em lista das tarefas",
        "preferred": "groupviewtable--ml-advanced-data-table",
        "alternative": "groupviewtable--ml-side-detail-table"
      }
    ],
    "tarefaDetalhe": [
      {
        "role": "resumo da tarefa aberta",
        "preferred": "groupviewcard--ml-view-card-horizontal",
        "alternative": "groupviewcard--ml-vertical-card"
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
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "confirmação do cancelamento",
        "preferred": "groupnotifyuser--ml-alert-modal"
      },
      {
        "role": "retorno da ação concluída",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
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
