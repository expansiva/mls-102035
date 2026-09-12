/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Matricula.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityMatricula = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Matricula",
  "title": "Matrícula",
  "description": "Vínculo do aluno a um plano de academia a partir de uma data.",
  "kind": "core",
  "party": "none",
  "displayField": "dataInicio",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único da matrícula."
    },
    {
      "fieldId": "alunoId",
      "title": "Aluno",
      "type": "uuid",
      "required": true,
      "description": "Referência ao aluno ao qual a matrícula pertence."
    },
    {
      "fieldId": "planoId",
      "title": "Plano",
      "type": "uuid",
      "required": true,
      "description": "Referência ao plano contratado na matrícula."
    },
    {
      "fieldId": "dataInicio",
      "title": "Data de início",
      "type": "date",
      "required": true,
      "description": "Data a partir da qual a matrícula passa a vigorar."
    },
    {
      "fieldId": "status",
      "title": "Situação",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "active",
          "title": "Ativa"
        },
        {
          "value": "cancelled",
          "title": "Cancelada"
        }
      ],
      "description": "Situação atual da matrícula."
    }
  ],
  "lifecycleStates": [
    {
      "state": "active",
      "reachedBy": "actor"
    },
    {
      "state": "cancelled",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "cancelarMatricula",
      "from": [
        "active"
      ],
      "to": "cancelled",
      "by": [
        "aluno"
      ],
      "description": "Encerra a matrícula ativa do próprio aluno e impede a geração de mensalidades futuras."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type MensalidadesAcademiaEntityMatriculaType = typeof mensalidadesAcademiaEntityMatricula;

export default mensalidadesAcademiaEntityMatricula;
