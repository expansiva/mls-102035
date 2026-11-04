/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/minhas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/workPlanningBoard/page21.md",
    "experience": "timelineList"
  },
  "intent": "No celular, em conteúdo fluido estreito em torno de 390px e usável de 360px a 430px, mostrar primeiro o que depende de mim agora e o que vence hoje ou está atrasado, permitindo abrir uma tarefa, ler checklist e motivo da devolução e agir com poucos toques; criar ou ajustar tarefa fica num fluxo próprio.",
  "sections": [
    {
      "id": "secTarefas",
      "priority": "primary",
      "purpose": "Lista compacta das minhas tarefas, alternando entre depende de mim agora, responsável e criadas, com prazo, prioridade, quem age agora, progresso da checklist e marcação de vence hoje ou atrasada.",
      "organisms": [
        "tarefasLista"
      ]
    },
    {
      "id": "secTarefaAberta",
      "priority": "main",
      "purpose": "A tarefa aberta em uma coluna: dados e checklist, ações do meu papel logo abaixo e o histórico ao final.",
      "organisms": [
        "tarefaDetalhe",
        "tarefaAcoes",
        "tarefaHistorico"
      ]
    },
    {
      "id": "secEdicao",
      "priority": "secondary",
      "purpose": "Criar uma tarefa ou ajustar campos, responsável e checklist sem mudar a situação, em campos empilhados.",
      "organisms": [
        "tarefaForm"
      ]
    }
  ],
  "organisms": {
    "tarefasLista": {
      "kind": "list",
      "text": "Tarefas de que sou responsável e as que criei, começando pelo que depende de mim agora, com título, prazo, prioridade, lista, quem age agora, progresso da checklist e marcação de vence hoje, atrasada ou devolvida; lista vazia e erro aparecem de forma distinta.",
      "intents": []
    },
    "tarefaDetalhe": {
      "kind": "detail",
      "text": "A tarefa aberta: motivo da devolução no topo quando houver, depois responsável, quem criou, prazo, prioridade, lista, criada em, descrição, etiquetas, subtarefas e a checklist com itens concluídos e quando.",
      "intents": []
    },
    "tarefaForm": {
      "kind": "form",
      "text": "Criar uma tarefa com título, descrição, prioridade, prazo, lista, tarefa pai opcional e etiquetas, escolhendo o responsável pelo nome entre quem aceita tarefas e adicionando itens de checklist; ou ajustar campos, trocar o responsável de uma tarefa que criei e editar ou marcar itens da checklist, sem mudar a situação.",
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
      "text": "A ação principal da situação atual em destaque (iniciar, enviar para revisão, retomar, aceitar ou devolver com motivo) e, num menu, cancelar a tarefa que criei; marcar itens e trocar o responsável ficam no ajuste da tarefa.",
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
      "text": "Histórico da tarefa: criação, início, envios para revisão, devoluções com motivo, retomadas, aceite, troca de responsável e cancelamento.",
      "intents": []
    }
  },
  "molecules": {
    "tarefasLista": [
      {
        "role": "lista de tarefas em tela estreita",
        "preferred": "groupviewtable--ml-responsive-data-table",
        "alternative": "groupviewtable--ml-responsive-table"
      },
      {
        "role": "alternar entre depende de mim, responsável e criadas",
        "preferred": "groupnavigatesection--ml-navigate-pills",
        "alternative": "groupnavigatesection--ml-tabs"
      },
      {
        "role": "progresso da checklist",
        "preferred": "groupshowprogress--ml-circular-progress",
        "alternative": "groupshowprogress--ml-linear-progress"
      },
      {
        "role": "busca pelo título",
        "preferred": "groupsearchcontent--ml-search-bar",
        "alternative": "groupsearchcontent--ml-search-filters"
      }
    ],
    "tarefaDetalhe": [
      {
        "role": "cartão com os dados da tarefa",
        "preferred": "groupviewcard--ml-vertical-card"
      },
      {
        "role": "checklist com itens concluídos",
        "preferred": "groupviewtable--ml-responsive-table",
        "alternative": "groupviewtable--ml-data-table-minimal"
      },
      {
        "role": "progresso da checklist",
        "preferred": "groupshowprogress--ml-linear-progress"
      },
      {
        "role": "motivo da devolução",
        "preferred": "groupnotifyuser--ml-notify-banner",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ],
    "tarefaForm": [
      {
        "role": "título e itens da checklist",
        "preferred": "groupentertext--ml-floating-text-input",
        "alternative": "groupentertext--ml-enter-text"
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
        "alternative": "groupenterdate--ml-compact-calendar"
      },
      {
        "role": "responsável pelo nome",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "prioridade",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupselectone--ml-select"
      },
      {
        "role": "lista e tarefa pai",
        "preferred": "groupselectone--ml-select",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "salvar ou criar",
        "preferred": "grouptriggeraction--ml-button-standard"
      }
    ],
    "tarefaAcoes": [
      {
        "role": "ação principal da situação",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-split-button"
      },
      {
        "role": "menu com cancelar",
        "preferred": "grouptriggeraction--ml-kebab-action-trigger"
      },
      {
        "role": "motivo da devolução",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "retorno das ações",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-alert-modal"
      }
    ],
    "tarefaHistorico": [
      {
        "role": "eventos da tarefa",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ]
  }
} as const;
