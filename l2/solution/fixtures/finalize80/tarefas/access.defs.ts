/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "tarefas",
  "actors": [
    {
      "actorId": "membro",
      "kind": "internal",
      "origin": "named",
      "title": "Membro",
      "description": "Pessoa da organização que cria, executa e cancela as próprias tarefas.",
      "personEntity": ""
    },
    {
      "actorId": "gestor",
      "kind": "internal",
      "origin": "named",
      "title": "Gestor",
      "description": "Pessoa da organização que revisa tarefas, mantém listas e recebe o aviso de prazos.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "membroTarefas",
      "actorRef": "membro",
      "title": "Trabalhar nas tarefas",
      "description": "Permite criar, executar e cancelar tarefas da organização e consultar as listas.",
      "entityRefs": ["Tarefa", "Lista"],
      "dataScope": {
        "mode": "organization",
        "description": "Tarefas e listas da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O membro vê o registro inteiro."
      }
    },
    {
      "grantId": "gestorTarefas",
      "actorRef": "gestor",
      "title": "Revisar tarefas e manter listas",
      "description": "Permite revisar tarefas, consultar o quadro e manter as listas.",
      "entityRefs": ["Tarefa", "Lista"],
      "dataScope": {
        "mode": "organization",
        "description": "Tarefas e listas da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gestor vê o registro inteiro."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export default tarefasAccess;
