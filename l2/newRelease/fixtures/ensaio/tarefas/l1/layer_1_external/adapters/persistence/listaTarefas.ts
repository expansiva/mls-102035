/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/listaTarefas.ts" enhancement="_blank"/>
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const tableDefinition = {
  "moduleId": "tarefas",
  "repositoryName": "listaTarefas",
  "tableName": "tarefas_listatarefas",
  "purpose": "transacao",
  "description": "tarefas_listatarefas",
  "backupHot": false,
  "storageProfile": "postgres",
  "writeMode": "sync",
  "columns": [
    {
      "name": "id",
      "postgresType": "TEXT"
    },
    {
      "name": "nome",
      "postgresType": "TEXT"
    },
    {
      "name": "details",
      "postgresType": "JSONB",
      "defaultSql": "'{}'::jsonb"
    }
  ],
  "primaryKey": [
    "id"
  ],
  "indexes": [
    {
      "name": "tarefas_listatarefas_nome",
      "columns": [
        "nome"
      ],
      "unique": true
    }
  ],
  "version": 1
} satisfies TableDefinition;

export const migrationPlan = {
  "format": "102034-schema-snapshot",
  "applied": false,
  "steps": [
    {
      "op": "createTable",
      "tableName": "tarefas_listatarefas",
      "name": "tarefas_listatarefas"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_listatarefas",
      "name": "tarefas_listatarefas_nome"
    }
  ],
  "blocked": []
} as const;
