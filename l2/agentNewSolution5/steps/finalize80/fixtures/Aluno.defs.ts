/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Aluno.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityAluno = {
  "schemaVersion": "2026-09-10-ns5-ontology-v1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Aluno",
  "title": "Aluno",
  "description": "Pessoa registrada pela academia para fins de matrícula, cobrança e acompanhamento da situação financeira.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "details": {
    "quantidadeMensalidadesVencidas": "Quantidade de mensalidades vencidas e ainda não pagas do aluno.",
    "situacaoFinanceira": "Indica se o aluno está regular, inadimplente ou bloqueado conforme suas mensalidades vencidas.",
    "acessoPermitido": "Indica se o aluno pode entrar na academia, sendo falso quando possui duas ou mais mensalidades vencidas."
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "mensalidadesAcademia.Aluno"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type MensalidadesAcademiaEntityAlunoType = typeof mensalidadesAcademiaEntityAluno;

export default mensalidadesAcademiaEntityAluno;
