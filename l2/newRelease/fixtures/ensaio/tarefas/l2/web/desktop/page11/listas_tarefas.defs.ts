/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/listas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/masterDataManagement/page21.md",
    "experience": "compactCrudTable"
  },
  "intent": "O gestor vê todas as listas que agrupam tarefas por projeto ou área, com a quantidade de tarefas abertas em cada uma, e cria uma lista nova ou ajusta nome e descrição de uma existente, para que as listas fiquem disponíveis ao criar tarefas.",
  "sections": [
    {
      "id": "secaoListas",
      "priority": "primary",
      "purpose": "Mostrar as listas cadastradas, ordenadas pelo nome e com busca, deixando claro quantas tarefas abertas cada uma tem; lista vazia e erro aparecem separados.",
      "organisms": [
        "listasCadastradas"
      ]
    },
    {
      "id": "secaoEdicaoLista",
      "priority": "main",
      "purpose": "Ao lado da listagem, criar uma lista informando o nome ou ajustar nome e descrição da lista escolhida, avisando quando o nome já existe.",
      "organisms": [
        "formularioLista"
      ]
    }
  ],
  "organisms": {
    "listasCadastradas": {
      "kind": "list",
      "text": "Listas que agrupam tarefas por projeto ou área, com nome, descrição e quantidade de tarefas abertas; o gestor busca pelo nome e escolhe uma lista para editar.",
      "intents": []
    },
    "formularioLista": {
      "kind": "form",
      "text": "Criar uma lista ou ajustar nome e descrição de uma lista existente; o nome é obrigatório e não pode repetir o de outra lista.",
      "intents": [
        {
          "id": "criarLista",
          "kind": "submit"
        },
        {
          "id": "salvarLista",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "listasCadastradas": [
      {
        "role": "tabela de listas",
        "preferred": "groupviewtable--ml-side-detail-table",
        "alternative": "groupviewtable--ml-data-table"
      },
      {
        "role": "busca por nome",
        "preferred": "groupsearchcontent--ml-search-bar",
        "alternative": "groupsearchcontent--ml-search-filters"
      },
      {
        "role": "paginação",
        "preferred": "grouptriggeraction--ml-pagination-control"
      }
    ],
    "formularioLista": [
      {
        "role": "nome da lista",
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "descrição",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "salvar",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "resultado da gravação",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
