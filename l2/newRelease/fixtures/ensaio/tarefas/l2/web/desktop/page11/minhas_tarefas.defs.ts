/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/minhas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/workPlanningBoard/page21.md",
    "experience": "timelineList"
  },
  "intent": "Dar ao membro uma visão única das tarefas de que é responsável e das que criou, destacando o que vence hoje, o que está atrasado e quem age agora, para abrir uma tarefa, entender o que falta e avançar o trabalho: executar, revisar, retomar, reatribuir, cancelar ou criar uma nova tarefa.",
  "sections": [
    {
      "id": "secTarefas",
      "priority": "primary",
      "purpose": "Mostrar as minhas tarefas separadas em responsável, criadas e o que depende de mim agora, com prazo, prioridade, lista, quem age agora, progresso da checklist e marcação de vence hoje ou atrasada, para escolher qual abrir.",
      "organisms": [
        "tarefasLista"
      ]
    },
    {
      "id": "secTarefaAberta",
      "priority": "main",
      "purpose": "Apresentar a tarefa escolhida com seus dados, checklist e motivo da devolução, junto das ações que cabem ao meu papel nela e do seu histórico.",
      "organisms": [
        "tarefaDetalhe",
        "tarefaAcoes",
        "tarefaHistorico"
      ]
    },
    {
      "id": "secEdicao",
      "priority": "secondary",
      "purpose": "Criar uma nova tarefa ou ajustar campos, responsável e checklist de uma tarefa existente sem mudar sua situação.",
      "organisms": [
        "tarefaForm"
      ]
    }
  ],
  "organisms": {
    "tarefasLista": {
      "kind": "list",
      "text": "Tarefas de que sou responsável e as que criei, agrupadas em responsável, criadas e depende de mim agora, com título, prazo, prioridade, lista, quem age agora, progresso da checklist e marcação de vence hoje, atrasada ou devolvida aguardando retomada; lista vazia e erro aparecem de forma distinta.",
      "intents": []
    },
    "tarefaDetalhe": {
      "kind": "detail",
      "text": "A tarefa aberta: título, descrição, responsável, quem criou, prazo, prioridade, lista, criada em, etiquetas, tarefa pai e quantidade de subtarefas, checklist com itens concluídos e quando, e o motivo da devolução em destaque quando houver.",
      "intents": []
    },
    "tarefaForm": {
      "kind": "form",
      "text": "Criar uma tarefa informando título, descrição, prioridade, prazo, lista, tarefa pai opcional e etiquetas, escolhendo o responsável pelo nome entre quem aceita tarefas e adicionando itens de checklist; ou ajustar esses campos, trocar o responsável de uma tarefa que criei e editar ou marcar itens da checklist, sem mudar a situação.",
      "intents": [
        {
          "id": "criarTarefa",
          "kind": "submit"
        },
        {
          "id": "adicionarItensChecklist",
          "kind": "submit"
        },
        {
          "id": "salvarAlteracoes",
          "kind": "submit"
        },
        {
          "id": "ajustarChecklist",
          "kind": "submit"
        }
      ]
    },
    "tarefaAcoes": {
      "kind": "actions",
      "text": "Ações de situação conforme meu papel na tarefa: como responsável, iniciar, enviar para revisão e retomar a tarefa devolvida para reenviar; como quem criou, aceitar ou devolver com motivo e cancelar. Marcar itens da checklist e trocar o responsável são feitos no ajuste da tarefa.",
      "intents": [
        {
          "id": "iniciar",
          "kind": "submit"
        },
        {
          "id": "enviarParaRevisao",
          "kind": "submit"
        },
        {
          "id": "aceitar",
          "kind": "submit"
        },
        {
          "id": "devolver",
          "kind": "submit"
        },
        {
          "id": "retomar",
          "kind": "submit"
        },
        {
          "id": "cancelar",
          "kind": "submit"
        }
      ]
    },
    "tarefaHistorico": {
      "kind": "timeline",
      "text": "Histórico da tarefa em ordem de tempo: criação, início, envios para revisão, devoluções com motivo, retomadas, aceite, troca de responsável e cancelamento.",
      "intents": []
    }
  },
  "molecules": {
    "tarefasLista": [
      {
        "role": "tabela de tarefas agrupada por responsável, criadas e depende de mim",
        "preferred": "groupviewtable--ml-grouping-table",
        "alternative": "groupviewtable--ml-advanced-data-table"
      },
      {
        "role": "alternar entre responsável, criadas e depende de mim agora",
        "preferred": "groupnavigatesection--ml-navigate-pills",
        "alternative": "groupnavigatesection--ml-tabs"
      },
      {
        "role": "progresso da checklist na linha",
        "preferred": "groupshowprogress--ml-linear-progress",
        "alternative": "groupshowprogress--ml-circular-progress"
      },
      {
        "role": "busca pelo título e filtros da lista",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
      }
    ],
    "tarefaDetalhe": [
      {
        "role": "cartão com os dados da tarefa",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      },
      {
        "role": "checklist com itens concluídos e quando",
        "preferred": "groupviewtable--ml-view-table",
        "alternative": "groupviewtable--ml-data-table-minimal"
      },
      {
        "role": "progresso da checklist",
        "preferred": "groupshowprogress--ml-linear-progress",
        "alternative": "groupshowprogress--ml-segmented-progress"
      },
      {
        "role": "destaque do motivo da devolução",
        "preferred": "groupnotifyuser--ml-notify-banner",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ],
    "tarefaForm": [
      {
        "role": "título e itens da checklist",
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "descrição",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "etiquetas",
        "preferred": "groupentertext--ml-tag-input"
      },
      {
        "role": "prazo",
        "preferred": "groupenterdate--ml-date-shortcut-picker",
        "alternative": "groupenterdate--ml-date-picker"
      },
      {
        "role": "responsável escolhido pelo nome",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "prioridade",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupselectone--ml-radio-group"
      },
      {
        "role": "lista e tarefa pai",
        "preferred": "groupselectone--ml-combobox",
        "alternative": "groupselectone--ml-select"
      },
      {
        "role": "salvar ou criar",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-split-button"
      }
    ],
    "tarefaAcoes": [
      {
        "role": "ações principais da situação atual",
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-split-button"
      },
      {
        "role": "ação secundária de cancelar",
        "preferred": "grouptriggeraction--ml-kebab-action-trigger",
        "alternative": "grouptriggeraction--ml-icon-button"
      },
      {
        "role": "motivo da devolução",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "confirmação de cancelamento e retorno das ações",
        "preferred": "groupnotifyuser--ml-alert-modal",
        "alternative": "groupnotifyuser--ml-toast-notification"
      }
    ],
    "tarefaHistorico": [
      {
        "role": "eventos da tarefa no tempo",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ]
  }
} as const;
