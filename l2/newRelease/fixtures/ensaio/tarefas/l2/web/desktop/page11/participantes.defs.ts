/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/participantes.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/userAccessManagement/page21.md",
    "experience": "memberDirectory"
  },
  "intent": "Permitir que o gestor veja quem participa do módulo de tarefas, inclua usuários da organização como participantes e marque, para cada um, se aceita tarefas e se pode criar tarefas, sem cadastrar ninguém nem pedir dado pessoal.",
  "sections": [
    {
      "id": "participantesAtuais",
      "priority": "primary",
      "purpose": "Mostrar os participantes do módulo com o nome e as marcas efetivas de aceitar e criar tarefas, para o gestor localizar alguém pelo nome e conferir quem pode ser responsável e quem pode criar.",
      "organisms": [
        "listaParticipantes"
      ]
    },
    {
      "id": "configurarParticipante",
      "priority": "main",
      "purpose": "Incluir um usuário da organização como participante e definir se ele aceita tarefas e se pode criar tarefas; quem ainda não foi configurado aceita e pode criar.",
      "organisms": [
        "formParticipante"
      ]
    }
  ],
  "organisms": {
    "listaParticipantes": {
      "kind": "list",
      "text": "Usuários da organização que participam do módulo, com o nome, a situação e as marcas de aceita tarefas e pode criar tarefas (efetivo). Busca pelo nome e escolhe um participante para ajustar as marcas.",
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
        "role": "tabela de participantes",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewtable--ml-side-detail-table"
      },
      {
        "role": "busca pelo nome",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
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
        "alternative": "groupenterboolean--ml-boolean-segmented"
      },
      {
        "role": "marca pode criar tarefas",
        "preferred": "groupenterboolean--ml-toggle-switch",
        "alternative": "groupenterboolean--ml-boolean-segmented"
      },
      {
        "role": "incluir e salvar",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-button-group"
      },
      {
        "role": "confirmação do resultado",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
