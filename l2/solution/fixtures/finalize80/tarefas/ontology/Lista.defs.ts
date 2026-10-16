/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/ontology/Lista.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasEntityLista = {
  "schemaVersion": "2026-09-15-ns5-ontology-v3",
  "moduleName": "tarefas",
  "entityId": "Lista",
  "title": "Lista",
  "description": "Agrupamento de tarefas mantido pelo gestor.",
  "kind": "entity",
  "class": "supporting",
  "storage": { "target": "moduleDatabase", "table": "tarefas_lista" },
  "displayField": "nome",
  "writer": "crud",
  "record": {
    "fields": {
      "id": { "type": "uuid", "required": true, "derived": true, "indexed": true, "title": "Identificador" },
      "version": { "type": "integer", "required": true, "derived": true },
      "nome": { "type": "string", "required": true, "indexed": true, "title": "Nome" }
    }
  },
  "relationships": {},
  "capabilities": {},
  "rules": []
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export default tarefasEntityLista;
