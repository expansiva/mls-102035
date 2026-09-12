/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Evento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityEvento = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "inscricaoEvento",
  "entityId": "Evento",
  "title": "Evento",
  "description": "Evento cadastrado pelo organizador, com informações, capacidade e publicação para inscrições públicas.",
  "kind": "core",
  "party": "none",
  "displayField": "title",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do evento."
    },
    {
      "fieldId": "title",
      "title": "Título",
      "type": "string",
      "required": true,
      "description": "Título de divulgação do evento."
    },
    {
      "fieldId": "description",
      "title": "Descrição",
      "type": "text",
      "required": true,
      "description": "Descrição com as informações do evento."
    },
    {
      "fieldId": "eventDate",
      "title": "Data do evento",
      "type": "date",
      "required": true,
      "description": "Data em que o evento será realizado."
    },
    {
      "fieldId": "location",
      "title": "Local",
      "type": "string",
      "required": true,
      "description": "Local de realização do evento."
    },
    {
      "fieldId": "capacity",
      "title": "Número de vagas",
      "type": "integer",
      "required": true,
      "description": "Quantidade de vagas disponíveis para inscrições confirmadas."
    },
    {
      "fieldId": "status",
      "title": "Status",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "draft",
          "title": "Rascunho"
        },
        {
          "value": "published",
          "title": "Publicado"
        }
      ],
      "description": "Situação de cadastro e publicação do evento."
    }
  ],
  "details": {
    "occupiedSeats": {
      "type": "integer",
      "description": "Total de vagas ocupadas por inscrições confirmadas no evento."
    },
    "availableSeats": {
      "type": "integer",
      "description": "Quantidade de vagas ainda disponíveis para inscrições confirmadas no evento."
    }
  },
  "lifecycleStates": [
    {
      "state": "draft",
      "reachedBy": "actor"
    },
    {
      "state": "published",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "publicarEvento",
      "from": [
        "draft"
      ],
      "to": "published",
      "by": [
        "organizador"
      ],
      "description": "Publica o evento e disponibiliza sua página para inscrições públicas."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type InscricaoEventoEntityEventoType = typeof inscricaoEventoEntityEvento;

export default inscricaoEventoEntityEvento;
