/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Inscricao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityInscricao = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "inscricaoEvento",
  "entityId": "Inscricao",
  "title": "Inscrição",
  "description": "Registro da participação de uma pessoa em um evento, incluindo sua situação de confirmação, espera ou cancelamento.",
  "kind": "core",
  "party": "none",
  "displayField": "id",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador da inscrição",
      "type": "uuid",
      "required": true,
      "description": "Identificador único da inscrição."
    },
    {
      "fieldId": "eventoId",
      "title": "Evento",
      "type": "uuid",
      "required": true,
      "description": "Referência ao evento ao qual a pessoa se inscreveu."
    },
    {
      "fieldId": "participanteId",
      "title": "Participante",
      "type": "uuid",
      "required": true,
      "description": "Referência ao participante associado à inscrição."
    },
    {
      "fieldId": "status",
      "title": "Situação",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "confirmed",
          "title": "Confirmada"
        },
        {
          "value": "waitlisted",
          "title": "Em lista de espera"
        },
        {
          "value": "cancelled",
          "title": "Cancelada"
        }
      ],
      "description": "Situação atual da inscrição no evento."
    },
    {
      "fieldId": "registeredAt",
      "title": "Data e hora da inscrição",
      "type": "datetime",
      "required": true,
      "description": "Data e hora em que a inscrição foi registrada, usada para ordenar a lista de espera."
    }
  ],
  "uniqueKeys": [
    [
      "eventoId",
      "participanteId"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "confirmed",
      "reachedBy": "actor"
    },
    {
      "state": "waitlisted",
      "reachedBy": "actor"
    },
    {
      "state": "cancelled",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "cancelarInscricao",
      "from": [
        "confirmed",
        "waitlisted"
      ],
      "to": "cancelled",
      "by": [
        "publico"
      ],
      "description": "Cancela a inscrição do participante no evento."
    },
    {
      "transitionId": "promoverListaEspera",
      "from": [
        "waitlisted"
      ],
      "to": "confirmed",
      "by": "system",
      "description": "Promove automaticamente a primeira inscrição da lista de espera quando uma vaga é liberada."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type InscricaoEventoEntityInscricaoType = typeof inscricaoEventoEntityInscricao;

export default inscricaoEventoEntityInscricao;
