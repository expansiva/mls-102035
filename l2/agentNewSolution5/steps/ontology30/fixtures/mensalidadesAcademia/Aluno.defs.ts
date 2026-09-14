/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Aluno.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityAluno = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Aluno",
  "title": "Aluno",
  "description": "Pessoa que possui matrícula na academia e para a qual são geradas mensalidades.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome completo", "type": "string", "required": true, "description": "Nome completo do aluno." },
    { "fieldId": "docType", "title": "Tipo de documento", "type": "string", "required": true, "enum": [{ "value": "CPF", "title": "CPF" }], "description": "Tipo de documento de identificação do aluno." },
    { "fieldId": "docId", "title": "CPF", "type": "string", "required": true, "description": "Número do CPF do aluno." },
    { "fieldId": "birthDate", "title": "Data de nascimento", "type": "date", "required": true, "description": "Data de nascimento do aluno." },
    { "fieldId": "contacts", "title": "Contatos", "type": "json", "required": true, "description": "Contatos do aluno (telefone, e-mail)." }
  ],
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
