/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/tarefa.ts" enhancement="_blank"/>
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const tableDefinition = {
  "moduleId": "tarefas",
  "repositoryName": "tarefa",
  "tableName": "tarefas_tarefa",
  "purpose": "transacao",
  "description": "tarefas_tarefa",
  "backupHot": false,
  "storageProfile": "postgres",
  "writeMode": "sync",
  "columns": [
    {
      "name": "id",
      "postgresType": "TEXT"
    },
    {
      "name": "titulo",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "status",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "prioridade",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "prazo",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "listaId",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "responsavelId",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "criadorId",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "tarefaPaiId",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "criadaEm",
      "postgresType": "TIMESTAMPTZ",
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
      "name": "tarefas_tarefa_titulo",
      "columns": [
        "titulo"
      ]
    },
    {
      "name": "tarefas_tarefa_status",
      "columns": [
        "status"
      ]
    },
    {
      "name": "tarefas_tarefa_prioridade",
      "columns": [
        "prioridade"
      ]
    },
    {
      "name": "tarefas_tarefa_prazo",
      "columns": [
        "prazo"
      ]
    },
    {
      "name": "tarefas_tarefa_listaId",
      "columns": [
        "listaId"
      ]
    },
    {
      "name": "tarefas_tarefa_responsavelId",
      "columns": [
        "responsavelId"
      ]
    },
    {
      "name": "tarefas_tarefa_criadorId",
      "columns": [
        "criadorId"
      ]
    },
    {
      "name": "tarefas_tarefa_tarefaPaiId",
      "columns": [
        "tarefaPaiId"
      ]
    },
    {
      "name": "tarefas_tarefa_criadaEm",
      "columns": [
        "criadaEm"
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
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa_titulo"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa_status"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa_prioridade"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa_prazo"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa_listaId"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa_responsavelId"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa_criadorId"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa_tarefaPaiId"
    },
    {
      "op": "createIndex",
      "tableName": "tarefas_tarefa",
      "name": "tarefas_tarefa_criadaEm"
    }
  ],
  "blocked": []
} as const;
