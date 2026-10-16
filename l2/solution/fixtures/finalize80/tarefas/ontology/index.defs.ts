/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasOntologyIndex = {
  "schemaVersion": "2026-09-15-ns5-ontology-v3",
  "moduleName": "tarefas",
  "businessDomain": "Acompanhamento de tarefas em listas",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "tarefas",
    "description": "Ramo details.tarefas; só este módulo escreve."
  },
  "entities": [
    { "entityId": "Tarefa", "kind": "entity", "class": "core" },
    { "entityId": "Lista", "kind": "entity", "class": "supporting" }
  ],
  "relationships": [
    {
      "relationshipId": "tarefaLista",
      "from": "Tarefa",
      "to": "Lista",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "field": "Tarefa.listaId",
      "description": "Cada tarefa pertence a uma lista."
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export default tarefasOntologyIndex;
