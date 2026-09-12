/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "mensalidadesAcademia",
  "businessDomain": "Gestão de matrículas, mensalidades e pagamentos de academia.",
  "entities": [
    "Plano",
    "Aluno",
    "Matricula",
    "Mensalidade",
    "Pagamento"
  ],
  "relationships": [
    {
      "relationshipId": "matriculaAluno",
      "fromEntity": "Matricula",
      "toEntity": "Aluno",
      "type": "manyToOne",
      "required": true,
      "description": "Cada matrícula pertence a um aluno da academia.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Matricula",
        "from": {
          "entityId": "Matricula",
          "fieldIds": [
            "alunoId"
          ]
        },
        "to": {
          "entityId": "Aluno",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "matriculaPlano",
      "fromEntity": "Matricula",
      "toEntity": "Plano",
      "type": "manyToOne",
      "required": true,
      "description": "Cada matrícula é realizada em um plano de academia.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Matricula",
        "from": {
          "entityId": "Matricula",
          "fieldIds": [
            "planoId"
          ]
        },
        "to": {
          "entityId": "Plano",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "mensalidadeMatricula",
      "fromEntity": "Mensalidade",
      "toEntity": "Matricula",
      "type": "manyToOne",
      "required": true,
      "description": "Cada mensalidade é gerada para uma matrícula ativa.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Mensalidade",
        "from": {
          "entityId": "Mensalidade",
          "fieldIds": [
            "matriculaId"
          ]
        },
        "to": {
          "entityId": "Matricula",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "pagamentoMensalidade",
      "fromEntity": "Pagamento",
      "toEntity": "Mensalidade",
      "type": "manyToOne",
      "required": true,
      "description": "Cada pagamento é registrado para uma mensalidade.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Pagamento",
        "from": {
          "entityId": "Pagamento",
          "fieldIds": [
            "mensalidadeId"
          ]
        },
        "to": {
          "entityId": "Mensalidade",
          "fieldIds": [
            "id"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type MensalidadesAcademiaOntologyIndexType = typeof mensalidadesAcademiaOntologyIndex;

export default mensalidadesAcademiaOntologyIndex;
