/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "businessDomain": "Gestão de mensalidades de academia",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "mensalidadesAcademia",
    "description": "Branch details.mensalidadesAcademia of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Aluno",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Plano",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "Matricula",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Mensalidade",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Pagamento",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "IndicadoresMensalidades",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "alunoMatriculas",
      "from": "Aluno",
      "to": "Matricula",
      "type": "oneToMany",
      "required": true,
      "mode": "fk",
      "description": "Um aluno pode ter matrículas, e cada matrícula pertence obrigatoriamente a um aluno.",
      "field": "Matricula.alunoId"
    },
    {
      "relationshipId": "planoMatriculas",
      "from": "Plano",
      "to": "Matricula",
      "type": "oneToMany",
      "required": true,
      "mode": "fk",
      "description": "Um plano pode ser usado em várias matrículas, e cada matrícula referencia obrigatoriamente um plano.",
      "field": "Matricula.planoId"
    },
    {
      "relationshipId": "matriculaMensalidades",
      "from": "Matricula",
      "to": "Mensalidade",
      "type": "oneToMany",
      "required": true,
      "mode": "fk",
      "description": "Uma matrícula pode gerar mensalidades por competência, e cada mensalidade pertence obrigatoriamente a uma matrícula.",
      "field": "Mensalidade.matriculaId"
    },
    {
      "relationshipId": "mensalidadePagamentos",
      "from": "Mensalidade",
      "to": "Pagamento",
      "type": "oneToMany",
      "required": true,
      "mode": "fk",
      "description": "Uma mensalidade pode receber pagamentos parciais ou integrais, e cada pagamento é registrado obrigatoriamente para uma mensalidade.",
      "field": "Pagamento.mensalidadeId"
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type MensalidadesAcademiaOntologyIndexType = typeof mensalidadesAcademiaOntologyIndex;

export default mensalidadesAcademiaOntologyIndex;
