/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Plano.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityPlano = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Plano",
  "title": "Plano",
  "description": "Condição comercial de matrícula da academia, com modalidade, valor e dia de vencimento.",
  "kind": "core",
  "party": "none",
  "displayField": "modalidade",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do plano de academia."
    },
    {
      "fieldId": "modalidade",
      "title": "Modalidade",
      "type": "string",
      "required": true,
      "unique": true,
      "enum": [
        {
          "value": "mensal",
          "title": "Mensal"
        },
        {
          "value": "trimestral",
          "title": "Trimestral"
        },
        {
          "value": "anual",
          "title": "Anual"
        }
      ],
      "description": "Periodicidade comercial do plano de academia."
    },
    {
      "fieldId": "valor",
      "title": "Valor",
      "type": "money",
      "required": true,
      "description": "Valor cobrado pelo plano em cada mensalidade gerada."
    },
    {
      "fieldId": "diaVencimento",
      "title": "Dia de vencimento",
      "type": "integer",
      "required": true,
      "constraints": {
        "min": 1,
        "max": 31
      },
      "description": "Dia do mês em que as mensalidades vinculadas ao plano vencem."
    }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type MensalidadesAcademiaEntityPlanoType = typeof mensalidadesAcademiaEntityPlano;

export default mensalidadesAcademiaEntityPlano;
