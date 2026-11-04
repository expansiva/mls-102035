/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/listas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/masterDataManagement/page21.md",
    "experience": "compactCrudTable"
  },
  "intent": "No celular, o gestor percorre as listas de tarefas com a quantidade de tarefas abertas, busca pelo nome e abre uma lista para ajustar nome e descrição, ou cria uma nova, em conteúdo fluido de coluna estreita (cerca de 390px, usável de 360px a 430px).",
  "sections": [
    {
      "id": "secaoListas",
      "priority": "primary",
      "purpose": "Mostrar as listas em itens empilhados com nome e tarefas abertas, com busca no topo; lista vazia e erro aparecem separados.",
      "organisms": [
        "listasCadastradas"
      ]
    },
    {
      "id": "secaoEdicaoLista",
      "priority": "main",
      "purpose": "Abaixo da listagem ou ao escolher uma lista, criar ou ajustar a lista em campos de largura total, com o botão de salvar ao alcance.",
      "organisms": [
        "formularioLista"
      ]
    }
  ],
  "organisms": {
    "listasCadastradas": {
      "kind": "list",
      "text": "Listas que agrupam tarefas por projeto ou área, com nome e quantidade de tarefas abertas; tocar numa lista abre sua edição.",
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
        "role": "lista de listas",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewtable--ml-responsive-data-table"
      },
      {
        "role": "busca por nome",
        "preferred": "groupsearchcontent--ml-search-bar"
      },
      {
        "role": "paginação",
        "preferred": "grouptriggeraction--ml-pagination-control"
      }
    ],
    "formularioLista": [
      {
        "role": "nome da lista",
        "preferred": "groupentertext--ml-floating-text-input",
        "alternative": "groupentertext--ml-enter-text"
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
