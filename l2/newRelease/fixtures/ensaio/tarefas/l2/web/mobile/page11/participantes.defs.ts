/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/participantes.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/userAccessManagement/page21.md",
    "experience": "memberDirectory"
  },
  "intent": "No celular, com conteúdo fluido em tela estreita (cerca de 390px, também usável em 360px e 430px), o gestor confere os participantes do módulo, inclui usuários da organização e marca se cada um aceita tarefas e se pode criar tarefas.",
  "sections": [
    {
      "id": "participantesAtuais",
      "priority": "primary",
      "purpose": "Lista empilhada dos participantes com nome e marcas efetivas de aceitar e criar tarefas, com busca pelo nome no topo; tocar em um participante abre o ajuste das marcas.",
      "organisms": [
        "listaParticipantes"
      ]
    },
    {
      "id": "configurarParticipante",
      "priority": "main",
      "purpose": "Formulário curto em uma coluna para incluir um usuário como participante e marcar aceita tarefas e pode criar tarefas, com o botão de confirmação sempre visível.",
      "organisms": [
        "formParticipante"
      ]
    }
  ],
  "organisms": {
    "listaParticipantes": {
      "kind": "list",
      "text": "Usuários da organização que participam do módulo, cada um com o nome, a situação e as marcas de aceita tarefas e pode criar tarefas (efetivo). Busca pelo nome e escolhe um participante para ajustar as marcas.",
      "intents": []
    },
    "formParticipante": {
      "kind": "form",
      "text": "Buscar um usuário da organização pelo nome e incluí-lo como participante, ou marcar se o participante escolhido aceita tarefas e se pode criar tarefas. Uma escolha já feita pelo gestor nunca é sobrescrita automaticamente.",
      "intents": [
        {
          "id": "incluirParticipante",
          "kind": "submit"
        },
        {
          "id": "salvarMarcas",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "listaParticipantes": [
      {
        "role": "lista de participantes",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewtable--ml-responsive-data-table"
      },
      {
        "role": "busca pelo nome",
        "preferred": "groupsearchcontent--ml-search-bar",
        "alternative": "groupsearchcontent--ml-search-filters"
      },
      {
        "role": "paginação",
        "preferred": "grouptriggeraction--ml-pagination-control"
      }
    ],
    "formParticipante": [
      {
        "role": "escolha do usuário pelo nome",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "marca aceita tarefas",
        "preferred": "groupenterboolean--ml-toggle-switch",
        "alternative": "groupenterboolean--ml-checkbox-preference"
      },
      {
        "role": "marca pode criar tarefas",
        "preferred": "groupenterboolean--ml-toggle-switch",
        "alternative": "groupenterboolean--ml-checkbox-preference"
      },
      {
        "role": "incluir e salvar",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "confirmação do resultado",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
