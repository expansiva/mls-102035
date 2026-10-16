/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/ontology/Tarefa.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasEntityTarefa = {
  "schemaVersion": "2026-09-15-ns5-ontology-v3",
  "moduleName": "tarefas",
  "entityId": "Tarefa",
  "title": "Tarefa",
  "description": "Trabalho atribuído a uma pessoa, com prazo, prioridade e lista.",
  "kind": "entity",
  "class": "core",
  "storage": { "target": "moduleDatabase", "table": "tarefas_tarefa", "kind": "relational" },
  "displayField": "titulo",
  "record": {
    "fields": {
      "id": { "type": "uuid", "required": true, "derived": true, "indexed": true, "title": "Identificador" },
      "version": { "type": "integer", "required": true, "derived": true },
      "titulo": { "type": "string", "required": true, "indexed": true, "title": "Título" },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "title": "Situação",
        "values": [
          { "value": "aFazer", "title": "A fazer" },
          { "value": "emAndamento", "title": "Em andamento" },
          { "value": "emRevisao", "title": "Em revisão" },
          { "value": "concluida", "title": "Concluída" },
          { "value": "cancelada", "title": "Cancelada" }
        ]
      },
      "prioridade": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "title": "Prioridade",
        "values": [
          { "value": "baixa", "title": "Baixa" },
          { "value": "media", "title": "Média" },
          { "value": "alta", "title": "Alta" }
        ]
      },
      "responsavelId": {
        "type": "record",
        "to": ["Person"],
        "required": true,
        "indexed": true,
        "title": "Responsável",
        "description": "Pessoa responsável pela tarefa."
      },
      "prazo": { "type": "date", "required": true, "indexed": true, "title": "Prazo" },
      "listaId": {
        "type": "record",
        "to": ["Lista"],
        "required": true,
        "indexed": true,
        "title": "Lista"
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "O que ninguém filtra.",
        "fields": {
          "descricao": { "type": "text", "title": "Descrição" },
          "checklist": { "type": "text", "title": "Checklist" }
        }
      }
    }
  },
  "lifecycleStates": [
    { "state": "aFazer", "reachedBy": "actor" },
    { "state": "emAndamento", "reachedBy": "actor" },
    { "state": "emRevisao", "reachedBy": "actor" },
    { "state": "concluida", "reachedBy": "actor" },
    { "state": "cancelada", "reachedBy": "actor" }
  ],
  "transitions": [
    {
      "transitionId": "iniciar",
      "from": ["aFazer"],
      "to": "emAndamento",
      "by": ["membro"],
      "description": "O membro começa a executar a tarefa."
    },
    {
      "transitionId": "enviarParaRevisao",
      "from": ["emAndamento"],
      "to": "emRevisao",
      "by": ["membro"],
      "description": "O membro entrega a tarefa para revisão."
    },
    {
      "transitionId": "concluir",
      "from": ["emRevisao"],
      "to": "concluida",
      "by": ["gestor"],
      "description": "O gestor aceita a tarefa."
    },
    {
      "transitionId": "devolver",
      "from": ["emRevisao"],
      "to": "emAndamento",
      "by": ["gestor"],
      "description": "O gestor devolve a tarefa para ajuste."
    },
    {
      "transitionId": "cancelar",
      "from": ["aFazer", "emAndamento", "emRevisao"],
      "to": "cancelada",
      "by": ["membro", "gestor"],
      "description": "O membro ou o gestor cancela a tarefa."
    }
  ],
  "relationships": {
    "lista": {
      "relationshipId": "tarefaLista",
      "to": "Lista",
      "via": "listaId",
      "mode": "fk",
      "cardinality": "N:1",
      "required": true,
      "title": "Lista"
    }
  },
  "capabilities": {},
  "rules": []
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export default tarefasEntityTarefa;
