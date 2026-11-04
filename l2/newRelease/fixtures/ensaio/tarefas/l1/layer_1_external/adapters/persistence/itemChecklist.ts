/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/itemChecklist.ts" enhancement="_blank"/>
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const tableDefinition = {
  "moduleId": "tarefas",
  "repositoryName": "itemChecklist",
  "tableName": "tarefas_itemchecklist",
  "purpose": "transacao",
  "description": "tarefas_itemchecklist",
  "backupHot": false,
  "storageProfile": "postgres",
  "writeMode": "sync",
  "columns": [
    {
      "name": "id",
      "postgresType": "TEXT"
    },
    {
      "name": "tarefaId",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "ordem",
      "postgresType": "INTEGER",
      "nullable": true
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
      "name": "tarefas_itemchecklist_tarefaId",
      "columns": [
        "tarefaId"
      ]
    },
    {
      "name": "tarefas_itemchecklist_ordem",
      "columns": [
        "ordem"
      ]
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
      "tableName": "tarefas_itemchecklist",
      "name": "tarefas_itemchecklist"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_itemchecklist",
      "name": "tarefas_itemchecklist_tarefaId"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_itemchecklist",
      "name": "tarefas_itemchecklist_ordem"
    }
  ],
  "blocked": []
} as const;
