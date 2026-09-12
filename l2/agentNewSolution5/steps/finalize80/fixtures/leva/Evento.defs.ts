/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Evento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityEvento = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "inscricaoEvento",
  "entityId": "Evento",
  "title": "Evento",
  "description": "Evento organizado pela organização, com informações, capacidade e publicação para inscrições públicas.",
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
      "description": "Título do evento."
    },
    {
      "fieldId": "description",
      "title": "Descrição",
      "type": "text",
      "required": true,
      "description": "Descrição do evento para a página pública."
    },
    {
      "fieldId": "eventDate",
      "title": "Data do evento",
      "type": "datetime",
      "required": true,
      "description": "Data e horário em que o evento será realizado."
    },
    {
      "fieldId": "venueId",
      "title": "Local",
      "type": "uuid",
      "required": true,
      "description": "Referência ao local cadastrado onde o evento ocorre."
    },
    {
      "fieldId": "capacity",
      "title": "Número de vagas",
      "type": "integer",
      "required": true,
      "constraints": {
        "min": 1
      },
      "description": "Quantidade máxima de inscrições confirmadas no evento."
    },
    {
      "fieldId": "status",
      "title": "Situação",
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
      "description": "Situação de publicação do evento."
    }
  ],
  "details": {
    "occupiedSeats": {
      "type": "integer",
      "description": "Quantidade atual de vagas ocupadas por inscrições confirmadas."
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
      "transitionId": "publishEvent",
      "from": [
        "draft"
      ],
      "to": "published",
      "by": [
        "organizador"
      ],
      "description": "Publica o evento para disponibilizar sua página pública de inscrições."
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
